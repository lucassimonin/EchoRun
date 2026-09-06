-- ============================================================================
-- EchoRun — schema initial
--
-- Principes :
--   * Le coureur est authentifie (magic link) -> il passe par RLS.
--   * Le proche est ANONYME. Il n'a pas de compte, il possede un `claim_token`
--     stocke dans son localStorage. Toutes ses ecritures passent par des Route
--     Handlers Next.js en service_role -> aucune policy `anon` n'est ouverte.
--     C'est le choix le plus simple a auditer pour un MVP.
-- ============================================================================

-- ============================================================================
-- AUCUNE dependance a une extension. C'est volontaire.
--
-- Sur Supabase cloud, pgcrypto et citext sont pre-installes dans le schema
-- `extensions`, qui n'est PAS dans le search_path pendant une migration :
-- `create extension if not exists pgcrypto` ne fait rien (elle existe deja) et
-- l'appel non qualifie a `gen_random_bytes()` echoue en 42883. Qualifier en
-- `extensions.gen_random_bytes()` reglerait le cas Supabase mais casserait sur
-- un Postgres ou l'extension vit dans `public`.
--
-- On n'utilise donc que du coeur Postgres :
--   * `gen_random_uuid()` est integre depuis PG 13 (pas pgcrypto) ;
--   * `uuid_send()` est dans pg_catalog ;
--   * `text` + `lower()` remplacent `citext` sans rien perdre : Supabase Auth
--     stocke deja les adresses en minuscules.
-- ============================================================================

-- ---------------------------------------------------------------- enums ------
create type public.race_status as enum ('draft', 'open', 'live', 'finished');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- -------------------------------------------------------------- profiles -----
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  is_admin      boolean     not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is 'Miroir applicatif de auth.users. is_admin = acces a /admin.';

-- Remplace l'unicite insensible a la casse qu'offrait le type citext.
create unique index profiles_email_lower_idx on public.profiles (lower(email))
  where email is not null;

-- Cree le profil a l'inscription. security definer : s'execute hors RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- races -----
create table public.races (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 120),
  race_date    date,
  -- Slug court partage facon Tricount. Genere cote app (nanoid-like).
  share_slug   text not null unique check (share_slug ~ '^[a-z0-9]{10,24}$'),
  status       public.race_status not null default 'open',
  gpx_path     text,
  -- Trace simplifie (Douglas-Peucker) : [[lat, lng, cumul_metres], ...]
  -- Stocke en jsonb plutot qu'en PostGIS : on ne fait aucune requete spatiale
  -- cote serveur, tout le calcul de proximite se fait sur l'appareil.
  track        jsonb not null default '[]'::jsonb,
  distance_m   double precision not null default 0,
  bounds       jsonb, -- { "sw": [lat, lng], "ne": [lat, lng] }
  free_quota   integer not null default 2 check (free_quota >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index races_user_id_created_idx on public.races (user_id, created_at desc);
create index races_status_idx on public.races (status);

-- ---------------------------------------------------------- contributors -----
create table public.contributors (
  id            uuid primary key default gen_random_uuid(),
  race_id       uuid not null references public.races (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 40),
  -- Secret porteur : identifie le proche sur son propre appareil.
  -- 2 UUID v4 concatenes = 32 octets = 64 caracteres hex, soit 244 bits
  -- d'entropie. `gen_random_uuid()` s'appuie sur le CSPRNG de Postgres.
  claim_token   text not null unique
                default encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex'),
  paid_credits  integer not null default 0 check (paid_credits >= 0),
  created_at    timestamptz not null default now()
);

create index contributors_race_idx on public.contributors (race_id, created_at);

-- -------------------------------------------------------- audio_messages -----
create table public.audio_messages (
  id                uuid primary key default gen_random_uuid(),
  race_id           uuid not null references public.races (id) on delete cascade,
  contributor_id    uuid not null references public.contributors (id) on delete cascade,
  -- Denormalise : le jour J l'app lit ce champ depuis IndexedDB, sans jointure.
  author_name       text not null,
  audio_path        text not null,
  mime_type         text not null default 'audio/webm',
  duration_ms       integer not null default 0 check (duration_ms between 0 and 60000),
  lat               double precision not null check (lat between -90 and 90),
  lng               double precision not null check (lng between -180 and 180),
  -- Distance depuis le depart le long du trace : sert au tri de la file d'attente.
  distance_m        double precision not null default 0,
  trigger_radius_m  integer not null default 70 check (trigger_radius_m between 20 and 500),
  -- true si le message a consomme un credit payant (pour le CA du BO).
  is_billable       boolean not null default false,
  played_at         timestamptz,
  created_at        timestamptz not null default now()
);

create index audio_messages_race_distance_idx on public.audio_messages (race_id, distance_m);
create index audio_messages_contributor_idx on public.audio_messages (contributor_id);

-- --------------------------------------------------------------- payments ----
create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  race_id               uuid not null references public.races (id) on delete cascade,
  contributor_id        uuid not null references public.contributors (id) on delete cascade,
  stripe_session_id     text not null unique,
  stripe_payment_intent text,
  amount_cents          integer not null check (amount_cents >= 0),
  currency              text    not null default 'eur',
  credits_granted       integer not null default 1 check (credits_granted > 0),
  status                public.payment_status not null default 'pending',
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);

create index payments_status_idx on public.payments (status, created_at desc);

-- ----------------------------------------------------------- app_settings ----
-- Table a ligne unique : configuration editee depuis le back-office.
create table public.app_settings (
  id                          smallint primary key default 1 check (id = 1),
  ads_enabled                 boolean not null default false,
  adsense_client_id           text,
  adsense_slot_landing        text,
  adsense_slot_contributor    text,
  adsense_slot_finish         text,
  extra_message_price_cents   integer not null default 99 check (extra_message_price_cents between 50 and 2000),
  extra_message_credits       integer not null default 1 check (extra_message_credits > 0),
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid references public.profiles (id) on delete set null
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------- updated_at ----
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger races_touch_updated_at
  before update on public.races
  for each row execute function public.touch_updated_at();

create trigger app_settings_touch_updated_at
  before update on public.app_settings
  for each row execute function public.touch_updated_at();

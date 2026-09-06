-- ============================================================================
-- EchoRun — bascule du modèle : c'est le COUREUR qui paie, par palier.
--
--   * les proches ne paient JAMAIS et ne sont jamais facturés
--   * 5 messages max par personne (per_contributor_cap) — anti-spam
--   * 15 messages offerts par course (free_message_cap)
--   * au-delà, le coureur débloque jusqu'à 50 (unlocked_message_cap) pour 1,99 €
--   * quand les 15 sont atteints, un e-mail part vers le coureur (cap_notified_at
--     garantit un envoi unique) : pas de blocage brutal, il débloque et ça repart.
--
-- On ne supprime AUCUNE colonne de l'ancien modèle (paid_credits,
-- extra_message_*, races.free_quota) : elles ne sont simplement plus lues.
-- Rester additif évite de casser un environnement déjà migré.
-- ============================================================================

-- ------------------------------------------------------------ app_settings ---
alter table public.app_settings
  add column if not exists free_message_cap     integer not null default 15
    check (free_message_cap >= 0),
  add column if not exists unlocked_message_cap integer not null default 50
    check (unlocked_message_cap >= 0),
  add column if not exists per_contributor_cap  integer not null default 5
    check (per_contributor_cap > 0),
  add column if not exists unlock_price_cents   integer not null default 199
    check (unlock_price_cents between 50 and 5000);

-- Cohérence : le plafond débloqué ne peut pas passer sous le plafond gratuit.
alter table public.app_settings
  drop constraint if exists app_settings_caps_coherent;
alter table public.app_settings
  add constraint app_settings_caps_coherent
  check (unlocked_message_cap >= free_message_cap);

-- ------------------------------------------------------------------- races ---
alter table public.races
  add column if not exists messages_unlocked boolean not null default false,
  add column if not exists cap_notified_at   timestamptz;

-- ---------------------------------------------------------------- payments ---
-- Le paiement devient un déblocage de COURSE par le coureur : il n'est plus
-- forcément rattaché à un proche.
alter table public.payments
  alter column contributor_id drop not null;

alter table public.payments
  add column if not exists purpose text not null default 'unlock'
    check (purpose in ('unlock', 'contributor_credit'));

-- ------------------------------------------------------- déblocage atomique --
-- Appelée par le webhook Stripe. security definer : le webhook tourne en
-- service_role, mais on garde la fonction idempotente et explicite.
create or replace function public.unlock_race_messages(p_race_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.races
  set messages_unlocked = true
  where id = p_race_id
    and messages_unlocked = false;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

comment on function public.unlock_race_messages(uuid) is
  'Passe une course en messages débloqués (jusqu''à unlocked_message_cap). Idempotent.';

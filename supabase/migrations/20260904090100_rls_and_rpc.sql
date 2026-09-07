-- ============================================================================
-- EchoRun • RLS, helpers et RPC
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.races          enable row level security;
alter table public.contributors   enable row level security;
alter table public.audio_messages enable row level security;
alter table public.payments       enable row level security;
alter table public.app_settings   enable row level security;

-- ---------------------------------------------------------------- helpers ----
-- security definer + search_path fige : evite la recursion RLS sur profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.owns_race(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.races r
    where r.id = target and r.user_id = auth.uid()
  );
$$;

-- --------------------------------------------------------------- profiles ----
create policy "profiles: lecture de son propre profil"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: mise a jour de son propre profil"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

-- ------------------------------------------------------------------ races ----
create policy "races: le coureur voit ses courses"
  on public.races for select
  using (user_id = auth.uid() or public.is_admin());

create policy "races: le coureur cree ses courses"
  on public.races for insert
  with check (user_id = auth.uid());

create policy "races: le coureur modifie ses courses"
  on public.races for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "races: le coureur supprime ses courses"
  on public.races for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------- contributors ----
create policy "contributors: visibles par le proprietaire de la course"
  on public.contributors for select
  using (public.owns_race(race_id) or public.is_admin());

-- --------------------------------------------------------- audio_messages ----
create policy "messages: visibles par le proprietaire de la course"
  on public.audio_messages for select
  using (public.owns_race(race_id) or public.is_admin());

-- Le coureur peut marquer un message comme joue depuis l'ecran de course.
create policy "messages: le coureur marque la lecture"
  on public.audio_messages for update
  using (public.owns_race(race_id))
  with check (public.owns_race(race_id));

create policy "messages: le coureur peut supprimer un message recu"
  on public.audio_messages for delete
  using (public.owns_race(race_id));

-- --------------------------------------------------------------- payments ----
create policy "payments: admin uniquement"
  on public.payments for select
  using (public.is_admin());

-- ----------------------------------------------------------- app_settings ----
-- Volontairement PAS lisible par `anon` : les IDs AdSense sont injectes par le
-- serveur au rendu. Ce n'est pas un secret, mais ca evite un round-trip client.
create policy "settings: lecture par tout utilisateur connecte"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "settings: ecriture admin uniquement"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Quota : 2 messages offerts par proche + credits achetes.
-- Fonction unique, appelee par le serveur, pour eviter la divergence de regle
-- entre le front (affichage) et le back (validation).
-- ============================================================================
create or replace function public.contributor_quota(p_contributor_id uuid)
returns table (used integer, allowed integer, remaining integer, free_quota integer, paid_credits integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.cnt                                     as used,
    r.free_quota + c.paid_credits             as allowed,
    greatest(r.free_quota + c.paid_credits - m.cnt, 0) as remaining,
    r.free_quota,
    c.paid_credits
  from public.contributors c
  join public.races r on r.id = c.race_id
  cross join lateral (
    select count(*)::integer as cnt
    from public.audio_messages am
    where am.contributor_id = c.id
  ) m
  where c.id = p_contributor_id;
$$;

-- ============================================================================
-- Statistiques du back-office. Une seule requete, un seul aller-retour.
-- ============================================================================
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'runners',            (select count(*) from public.profiles),
    'runners_last_7d',    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'races',              (select count(*) from public.races),
    'races_open',         (select count(*) from public.races where status in ('open', 'live')),
    'messages',           (select count(*) from public.audio_messages),
    'messages_billable',  (select count(*) from public.audio_messages where is_billable),
    'messages_played',    (select count(*) from public.audio_messages where played_at is not null),
    'contributors',       (select count(*) from public.contributors),
    'revenue_cents',      (select coalesce(sum(amount_cents), 0) from public.payments where status = 'paid'),
    'revenue_cents_30d',  (select coalesce(sum(amount_cents), 0) from public.payments
                            where status = 'paid' and paid_at > now() - interval '30 days'),
    'paid_orders',        (select count(*) from public.payments where status = 'paid'),
    'avg_messages_per_race', (
      select round(coalesce(avg(cnt), 0)::numeric, 1)
      from (select count(*) as cnt from public.audio_messages group by race_id) s
    ),
    'daily', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb)
      from (
        select
          date_trunc('day', gs)::date as day,
          (select count(*) from public.audio_messages am
            where am.created_at >= gs and am.created_at < gs + interval '1 day') as messages,
          (select coalesce(sum(amount_cents), 0) from public.payments p
            where p.status = 'paid' and p.paid_at >= gs and p.paid_at < gs + interval '1 day') as revenue_cents
        from generate_series(date_trunc('day', now() - interval '13 days'), date_trunc('day', now()), interval '1 day') gs
      ) d
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_stats() from anon;
grant execute on function public.admin_stats() to authenticated;

-- ============================================================================
-- Storage : bucket prive pour les vocaux. Lecture uniquement via URL signee
-- generee cote serveur -> pas de policy `anon`.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-messages',
  'voice-messages',
  false,
  2097152, -- 2 Mo : ~30 s d'Opus a 48 kbps, large.
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gpx', 'gpx', false, 10485760, array['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream'])
on conflict (id) do nothing;

-- Le coureur peut lire les audios de ses propres courses.
create policy "storage: le coureur lit les vocaux de ses courses"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'voice-messages'
    and exists (
      select 1 from public.races r
      where r.user_id = auth.uid()
        and (storage.foldername(name))[1] = r.id::text
    )
  );

-- ============================================================================
-- Un seul "proche" par prenom et par course.
--
-- Sans cet index, vider son localStorage suffirait a remettre le compteur de
-- messages gratuits a zero. Le prenom devient donc la cle d'identite : c'est
-- volontairement souple (deux Camille se partagent un quota) mais ca ferme
-- l'abus le plus evident sans imposer de compte.
-- ============================================================================
create unique index contributors_race_name_idx
  on public.contributors (race_id, lower(trim(name)));

-- ============================================================================
-- Incrementation atomique des credits (appelee par le webhook Stripe).
-- Un `select` puis `update` cote applicatif perdrait des credits en cas de
-- webhooks concurrents.
-- ============================================================================
create or replace function public.increment_paid_credits(
  p_contributor_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'montant invalide';
  end if;

  update public.contributors
  set paid_credits = paid_credits + p_amount
  where id = p_contributor_id
  returning paid_credits into new_total;

  return new_total;
end;
$$;

revoke all on function public.increment_paid_credits(uuid, integer) from anon, authenticated;

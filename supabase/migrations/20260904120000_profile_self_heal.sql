-- ============================================================================
-- Profils : rattrapage et auto-reparation
--
-- POURQUOI CETTE MIGRATION
--
-- Faire dependre l'existence du profil du seul trigger `on_auth_user_created`
-- est fragile : tout compte cree AVANT que le trigger existe — ou pendant une
-- panne du trigger — se retrouve authentifie mais sans ligne dans `profiles`.
-- L'utilisateur est alors bloque de facon permanente et silencieuse : il se
-- connecte sans probleme, puis chaque ecriture echoue en violation de cle
-- etrangere (23503), sans aucun moyen de s'en sortir depuis l'interface.
--
-- C'est exactement ce qui est arrive sur le premier compte du projet.
--
-- Deux corrections complementaires :
--   1. rattrapage immediat des comptes existants sans profil ;
--   2. policy d'insertion, pour que l'application puisse creer le profil
--      manquant a la volee (cf. src/lib/profile.ts) sans passer par la cle
--      service_role. Moindre privilege : la creation reste bornee a son propre
--      profil, et interdit toute auto-promotion en admin.
-- ============================================================================

-- --------------------------------------------------------- 1. rattrapage -----
insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ------------------------------------------------- 2. policy d'insertion -----
-- `is_admin = false` dans le CHECK : sans cette clause, un utilisateur
-- pourrait se creer un profil administrateur et acceder au back-office.
drop policy if exists "profiles: creation de son propre profil" on public.profiles;
create policy "profiles: creation de son propre profil"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() and is_admin = false);

-- --------------------------------------------- 3. trigger plus resilient -----
-- Le trigger reste le chemin nominal. On le rend simplement incapable de faire
-- echouer une inscription : si l'insertion du profil casse pour une raison
-- imprevue, on journalise et on laisse l'utilisateur se creer, plutot que de
-- lui refuser son compte. L'auto-reparation cote application le rattrapera.
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
exception
  when others then
    raise warning 'handle_new_user: profil non cree pour % (%)', new.id, sqlerrm;
    return new;
end;
$$;

-- ============================================================================
-- Mode « temps » : une course sans GPX
--
-- Le coureur qui n'a pas de fichier GPX annonce simplement une durée prévue
-- (ex. 2 h). Ses proches choisissent un moment sur une frise (ex. « à 45 min »)
-- plutôt qu'un point sur une carte. Le jour J, un simple chronomètre déclenche
-- les vocaux à la minute prévue • pas de GPS, donc plus fiable et sans dérive.
--
-- On étend le schéma existant plutôt que de créer des tables parallèles : une
-- course porte un `mode`, et chaque type de donnée (position OU instant) est
-- nullable selon le mode, avec une contrainte qui garantit la cohérence.
-- ============================================================================

-- --------------------------------------------------------------- races -------
create type public.race_mode as enum ('gpx', 'time');

alter table public.races
  add column mode public.race_mode not null default 'gpx',
  -- Durée prévue en secondes (mode 'time'). Bornes : 5 min à 24 h.
  add column duration_s integer;

alter table public.races
  add constraint races_duration_check
    check (duration_s is null or duration_s between 300 and 86400);

-- En mode 'time', la durée est obligatoire ; en mode 'gpx', elle reste nulle.
-- Le tracé, lui, n'a de sens qu'en mode 'gpx' mais on tolère un tableau vide
-- par défaut : on contraint donc seulement la durée, la plus structurante.
alter table public.races
  add constraint races_mode_coherence
    check (
      (mode = 'time' and duration_s is not null)
      or (mode = 'gpx' and duration_s is null)
    );

-- ------------------------------------------------------- audio_messages ------
-- La position devient nullable (absente en mode temps) et l'on ajoute
-- l'instant de déclenchement (absent en mode GPX).
alter table public.audio_messages
  alter column lat drop not null,
  alter column lng drop not null,
  add column trigger_at_s integer;

alter table public.audio_messages
  add constraint audio_messages_trigger_at_check
    check (trigger_at_s is null or trigger_at_s between 0 and 86400);

-- Un message est soit géolocalisé (lat+lng), soit temporel (trigger_at_s),
-- jamais les deux, jamais aucun. C'est le garde-fou qui empêche un message
-- inclassable de se retrouver en base.
alter table public.audio_messages
  add constraint audio_messages_trigger_coherence
    check (
      (lat is not null and lng is not null and trigger_at_s is null)
      or (lat is null and lng is null and trigger_at_s is not null)
    );

-- Index pour trier la file d'attente par instant, comme distance_m côté GPX.
create index audio_messages_race_time_idx
  on public.audio_messages (race_id, trigger_at_s)
  where trigger_at_s is not null;

-- ---------------------------------------------------------------- notes ------
-- `contributor_quota`, `admin_stats` et les policies RLS restent valables tels
-- quels : ils ne dépendent ni de la position ni de l'instant, seulement des
-- liens race / contributor / message. Rien à modifier de ce côté.

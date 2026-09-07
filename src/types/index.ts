/** Point du trace simplifie : [latitude, longitude, distance cumulee en metres]. */
export type TrackPoint = readonly [number, number, number];

export interface RaceBounds {
  sw: readonly [number, number];
  ne: readonly [number, number];
}

export type RaceStatus = 'draft' | 'open' | 'live' | 'finished';

/** Une course est soit géolocalisée (GPX), soit minutée (durée + chronomètre). */
export type RaceMode = 'gpx' | 'time';

export interface Race {
  id: string;
  user_id: string;
  name: string;
  race_date: string | null;
  share_slug: string;
  status: RaceStatus;
  mode: RaceMode;
  gpx_path: string | null;
  track: TrackPoint[];
  distance_m: number;
  bounds: RaceBounds | null;
  /** Durée prévue en secondes (mode 'time'), sinon null. */
  duration_s: number | null;
  free_quota: number;
  created_at: string;
  updated_at: string;
}

export interface AudioMessage {
  id: string;
  race_id: string;
  contributor_id: string;
  author_name: string;
  audio_path: string;
  mime_type: string;
  duration_ms: number;
  /** Position (mode GPX) • null en mode temps. */
  lat: number | null;
  lng: number | null;
  distance_m: number;
  trigger_radius_m: number;
  /** Instant de déclenchement en secondes depuis le départ (mode temps) • null en GPX. */
  trigger_at_s: number | null;
  is_billable: boolean;
  played_at: string | null;
  created_at: string;
}

export interface AppSettings {
  ads_enabled: boolean;
  adsense_client_id: string | null;
  adsense_slot_landing: string | null;
  adsense_slot_contributor: string | null;
  adsense_slot_finish: string | null;
  extra_message_price_cents: number;
  extra_message_credits: number;
  /** Modèle « le coureur paie » : plafonds de messages et prix du déblocage. */
  free_message_cap: number;
  unlocked_message_cap: number;
  per_contributor_cap: number;
  unlock_price_cents: number;
  /** Conteneur Google Tag Manager (facultatif), format GTM-XXXXXXX. */
  gtm_container_id: string | null;
}

/**
 * État renvoyé au proche : combien de messages lui/la course peuvent encore
 * accueillir. Le proche ne paie jamais ; c'est le coureur qui débloque.
 */
export interface ContributorPostState {
  /** Messages déjà posés sur la course (tous proches confondus). */
  raceUsed: number;
  /** Plafond effectif de la course (offert, ou débloqué). */
  raceCap: number;
  raceRemaining: number;
  /** La course a-t-elle été débloquée par le coureur ? */
  unlocked: boolean;
  /** Messages déjà posés par CE proche. */
  personalUsed: number;
  /** Maximum par personne (anti-spam). */
  personalCap: number;
  personalRemaining: number;
  /** Peut poster maintenant (quota perso ET place course restants). */
  canPost: boolean;
}

/** Projection publique d'une course, servie au proche via le lien de partage. */
export interface PublicRace {
  id: string;
  name: string;
  race_date: string | null;
  share_slug: string;
  status: RaceStatus;
  mode: RaceMode;
  runner_name: string;
  distance_m: number;
  track: TrackPoint[];
  bounds: RaceBounds | null;
  duration_s: number | null;
  /** Modèle « le coureur paie ». */
  per_contributor_cap: number;
  message_count: number;
  message_cap: number;
  messages_unlocked: boolean;
  /** Positions déjà prises (mode GPX), pour les pastilles sur la carte. */
  taken_points: { lat: number; lng: number; author_name: string }[];
  /** Instants déjà pris (mode temps), pour les repères sur la frise. */
  taken_times: { trigger_at_s: number; author_name: string }[];
}

/** Identite locale du proche, persistee dans son localStorage. */
export interface ContributorIdentity {
  id: string;
  name: string;
  claimToken: string;
}

/** Message prêt à jouer hors-ligne : métadonnées + blob audio. */
export interface OfflineMessage {
  id: string;
  race_id: string;
  author_name: string;
  lat: number | null;
  lng: number | null;
  distance_m: number;
  trigger_radius_m: number;
  /** Instant de déclenchement (mode temps), null en mode GPX. */
  trigger_at_s: number | null;
  duration_ms: number;
  mime_type: string;
}

export interface AdminStats {
  runners: number;
  runners_last_7d: number;
  races: number;
  races_open: number;
  messages: number;
  messages_billable: number;
  messages_played: number;
  contributors: number;
  revenue_cents: number;
  revenue_cents_30d: number;
  paid_orders: number;
  avg_messages_per_race: number;
  daily: { day: string; messages: number; revenue_cents: number }[];
}

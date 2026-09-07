-- ============================================================================
-- Google Tag Manager : conteneur configurable depuis le back-office.
-- ============================================================================
-- On stocke l'ID de conteneur (format GTM-XXXXXXX) dans app_settings, à côté
-- de la configuration AdSense. Nullable : aucune injection tant qu'il est vide.

alter table public.app_settings
  add column if not exists gtm_container_id text;

comment on column public.app_settings.gtm_container_id is
  'ID de conteneur Google Tag Manager (GTM-XXXXXXX). NULL = aucun tag injecté.';

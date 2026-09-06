-- Donnees de developpement. Executees par `supabase db reset`.
-- Le premier compte cree localement peut etre promu admin ainsi :
--
--   update public.profiles set is_admin = true where email = 'moi@exemple.fr';

update public.app_settings
set ads_enabled = false,
    extra_message_price_cents = 99,
    extra_message_credits = 1
where id = 1;

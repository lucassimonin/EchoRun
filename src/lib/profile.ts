import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface RunnerProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
}

/**
 * ============================================================================
 * Profil du coureur — lecture auto-réparante
 * ============================================================================
 *
 * Le trigger `on_auth_user_created` reste le chemin nominal. Mais un compte
 * créé avant que le trigger existe — ou pendant une panne du trigger — se
 * retrouve authentifié SANS ligne dans `profiles`. L'utilisateur se connecte
 * alors normalement, puis chaque écriture échoue en violation de clé étrangère,
 * sans aucun moyen de s'en sortir depuis l'interface.
 *
 * Cette fonction ferme le trou : si le profil manque, on le crée à la volée
 * depuis la session vérifiée. L'écriture passe par le client de session, donc
 * par RLS — la policy `profiles: creation de son propre profil` la borne à son
 * propre identifiant et interdit `is_admin = true`. Pas de service_role ici.
 *
 * Idempotent et sans coût dans le cas normal : un seul SELECT quand le profil
 * existe, ce qui est le cas de tous les comptes créés après la migration
 * 20260904120000.
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<RunnerProfile> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing as RunnerProfile;

  // `split('@')[0]` est typé `string | undefined` sous noUncheckedIndexedAccess :
  // on ramène tout à `string | null` explicitement.
  const metaName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : null;
  const emailName = user.email ? (user.email.split('@')[0] ?? null) : null;
  const fallbackName: string | null = metaName ?? emailName;

  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? null,
      display_name: fallbackName,
      // Jamais true : la policy RLS le refuserait, et c'est volontaire.
      is_admin: false,
    })
    .select('id, email, display_name, is_admin')
    .maybeSingle();

  if (created) return created as RunnerProfile;

  // Course entre deux requêtes concurrentes : le profil vient d'être créé
  // ailleurs, on relit plutôt que de propager un conflit d'unicité.
  if (error?.code === '23505') {
    const { data: retried } = await supabase
      .from('profiles')
      .select('id, email, display_name, is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (retried) return retried as RunnerProfile;
  }

  if (error) {
    console.error(
      `[echorun] getOrCreateProfile — code=${error.code} message=${error.message}`,
    );
  }

  // Dernier recours : un profil en mémoire, non persisté. L'interface reste
  // utilisable en lecture ; la première écriture échouera avec un message
  // explicite plutôt qu'avec une page blanche.
  return {
    id: user.id,
    email: user.email ?? null,
    display_name: fallbackName,
    is_admin: false,
  };
}

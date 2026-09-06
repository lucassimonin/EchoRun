import { NextResponse } from 'next/server';

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Trop de requetes. Reessaie dans un instant.' },
    { status: 429, headers: { 'retry-after': String(retryAfterSeconds) } },
  );
}

// 64 caracteres hex : 2 UUID v4 concatenes, cf. migration 20260904090000.
const CLAIM_TOKEN_RE = /^[0-9a-f]{64}$/;

export function isValidClaimToken(value: unknown): value is string {
  return typeof value === 'string' && CLAIM_TOKEN_RE.test(value);
}

const SLUG_RE = /^[a-z0-9]{10,24}$/;

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_RE.test(value);
}

/**
 * ============================================================================
 * Diagnostic des erreurs Postgres / PostgREST
 * ============================================================================
 *
 * Un « Creation de la course impossible. » ne dit rien a personne — ni a
 * l'utilisateur, ni au developpeur qui debugge. Cette fonction traduit les
 * codes d'erreur reellement rencontres en message actionnable, journalise le
 * detail cote serveur, et en developpement renvoie la cause technique au
 * client pour la voir sans quitter le navigateur.
 *
 * En production, le client ne recoit que le message metier : pas de fuite de
 * structure de base ni de nom de contrainte.
 */

export interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/** Codes rencontres en pratique sur ce projet, avec la piste de resolution. */
const POSTGRES_HINTS: Record<string, string> = {
  // undefined_table : le schema n'a jamais ete applique au projet.
  '42P01':
    "Le schema n'est pas applique sur ce projet Supabase. Lance `supabase link --project-ref <ref>` puis `supabase db push`.",
  // undefined_function : migration partielle (RPC manquante).
  '42883':
    'Une fonction SQL est manquante. Rejoue les migrations : `supabase db push`.',
  // foreign_key_violation : cas le plus courant ici, profil absent.
  '23503':
    "Ton profil utilisateur n'existe pas encore en base. Le trigger `on_auth_user_created` n'existait probablement pas au moment de ta premiere connexion.",
  // unique_violation
  '23505': 'Cette valeur existe deja.',
  // check_violation
  '23514': 'Une contrainte de validation a rejete les donnees envoyees.',
  // not_null_violation
  '23502': 'Un champ obligatoire est vide.',
  // insufficient_privilege : refus RLS.
  '42501':
    "Refuse par les policies RLS. Verifie que tu es bien authentifie et proprietaire de la ressource.",
  // invalid_text_representation
  '22P02': 'Format de donnee invalide (UUID ou nombre mal forme).',
  // PostgREST : aucune ligne alors qu'une seule etait attendue.
  PGRST116: "La ressource n'existe pas, ou RLS en interdit la lecture.",
  // PostgREST : schema cache perime apres une migration.
  PGRST202:
    'Cache de schema PostgREST perime. Recharge-le depuis le dashboard Supabase (Settings > API > Reload schema).',
};

/**
 * Journalise l'erreur et construit la reponse.
 *
 * @param context  Ou l'erreur s'est produite, pour retrouver la ligne dans les logs.
 * @param error    L'objet erreur renvoye par supabase-js.
 * @param fallback Message metier affiche a l'utilisateur.
 */
export function jsonDbError(
  context: string,
  error: DbErrorLike | null | undefined,
  fallback: string,
  status = 500,
) {
  const code = error?.code ?? 'inconnu';
  const hint = error?.code ? POSTGRES_HINTS[error.code] : undefined;

  // Toujours dans les logs serveur : c'est la que le developpeur regarde.
  console.error(
    `[echorun] ${context} — code=${code} message=${error?.message ?? 'n/a'}` +
      (error?.details ? ` details=${error.details}` : '') +
      (error?.hint ? ` hint=${error.hint}` : ''),
  );

  const isDev = process.env.NODE_ENV !== 'production';

  return jsonError(hint ?? fallback, status, {
    // Renvoye uniquement en dev : en production on ne divulgue rien de la base.
    ...(isDev
      ? {
          debug: {
            context,
            code,
            message: error?.message ?? null,
            details: error?.details ?? null,
            hint: error?.hint ?? null,
          },
        }
      : {}),
  });
}

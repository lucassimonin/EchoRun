import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppSettings, ContributorPostState } from '@/types';

type CapSettings = Pick<
  AppSettings,
  'free_message_cap' | 'unlocked_message_cap' | 'per_contributor_cap'
>;

/**
 * Source de vérité, côté serveur, de « ce proche peut-il encore poster ? ».
 *
 * Modèle « le coureur paie » : le proche ne paie JAMAIS. Deux plafonds :
 *  - par personne (anti-spam)  : per_contributor_cap
 *  - par course (offert/débloqué) : free_message_cap puis unlocked_message_cap
 *
 * Le front n'affiche que ce que renvoie cette fonction ; les écritures la
 * revalident systématiquement.
 */
export async function fetchContributorPostState(
  supabase: SupabaseClient,
  contributorId: string,
  raceId: string,
  settings: CapSettings,
  unlocked: boolean,
): Promise<ContributorPostState> {
  const [raceRes, personalRes] = await Promise.all([
    supabase
      .from('audio_messages')
      .select('id', { count: 'exact', head: true })
      .eq('race_id', raceId),
    supabase
      .from('audio_messages')
      .select('id', { count: 'exact', head: true })
      .eq('contributor_id', contributorId),
  ]);

  const raceUsed = raceRes.count ?? 0;
  const personalUsed = personalRes.count ?? 0;
  const raceCap = unlocked ? settings.unlocked_message_cap : settings.free_message_cap;
  const personalCap = settings.per_contributor_cap;
  const raceRemaining = Math.max(raceCap - raceUsed, 0);
  const personalRemaining = Math.max(personalCap - personalUsed, 0);

  return {
    raceUsed,
    raceCap,
    raceRemaining,
    unlocked,
    personalUsed,
    personalCap,
    personalRemaining,
    canPost: raceRemaining > 0 && personalRemaining > 0,
  };
}

/** Nombre de messages déjà déposés sur une course (tous proches confondus). */
export async function countRaceMessages(
  supabase: SupabaseClient,
  raceId: string,
): Promise<number> {
  const { count } = await supabase
    .from('audio_messages')
    .select('id', { count: 'exact', head: true })
    .eq('race_id', raceId);
  return count ?? 0;
}

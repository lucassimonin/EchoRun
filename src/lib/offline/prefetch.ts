import type { OfflineMessage, TrackPoint } from '@/types';
import { hasAudio, requestPersistentStorage, saveMessage, saveRaceSnapshot } from './db';

export interface PrefetchPayload {
  race: {
    id: string;
    name: string;
    race_date: string | null;
    mode: 'gpx' | 'time';
    track: TrackPoint[];
    distance_m: number;
    duration_s: number | null;
  };
  messages: (OfflineMessage & { signed_url: string })[];
}

export interface PrefetchProgress {
  total: number;
  done: number;
  failed: number;
  currentAuthor: string | null;
}

export interface PrefetchResult {
  cached: number;
  failed: string[];
}

/**
 * Telecharge la course complete (metadonnees + tous les vocaux) dans
 * IndexedDB. A lancer la veille, sur le wifi de la maison.
 *
 * Les URL signees sont fournies par le serveur et ne vivent que le temps du
 * telechargement : c'est le Blob qui est conserve, pas l'URL.
 */
export async function prefetchRace(
  payload: PrefetchPayload,
  onProgress?: (progress: PrefetchProgress) => void,
): Promise<PrefetchResult> {
  await requestPersistentStorage();

  await saveRaceSnapshot({
    raceId: payload.race.id,
    name: payload.race.name,
    raceDate: payload.race.race_date,
    mode: payload.race.mode,
    track: payload.race.track,
    distanceM: payload.race.distance_m,
    durationS: payload.race.duration_s,
    cachedAt: Date.now(),
    messageCount: payload.messages.length,
  });

  const total = payload.messages.length;
  const failed: string[] = [];
  let done = 0;

  const report = (currentAuthor: string | null) =>
    onProgress?.({ total, done, failed: failed.length, currentAuthor });

  report(null);

  // Sequentiel volontairement : sur un reseau mobile faible, 3 requetes en
  // parallele echouent plus souvent qu'elles n'accelerent.
  for (const message of payload.messages) {
    const { signed_url: signedUrl, ...meta } = message;
    report(meta.author_name);

    if (await hasAudio(meta.id)) {
      done++;
      report(meta.author_name);
      continue;
    }

    try {
      const blob = await fetchWithRetry(signedUrl);
      await saveMessage(meta, blob);
      done++;
    } catch {
      failed.push(meta.id);
    }
    report(meta.author_name);
  }

  return { cached: done, failed };
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Blob> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Fichier vide');
      return blob;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Telechargement impossible');
}

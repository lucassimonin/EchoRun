import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OfflineMessage, TrackPoint } from '@/types';

/**
 * ============================================================================
 * Cache hors-ligne — le jour J, l'app ne doit dependre d'AUCUN reseau.
 * ============================================================================
 *
 * Repartition :
 *   - IndexedDB (ce fichier) : metadonnees + blobs audio. C'est le seul stockage
 *     qui accepte des Blob de facon fiable sur iOS et qui survit a un
 *     rechargement.
 *   - CacheStorage (public/sw.js) : shell HTML/JS/CSS + tuiles de carte.
 *
 * On ne passe PAS par la Cache API pour les audios : les URL signees Supabase
 * expirent, alors qu'un Blob en IndexedDB est valable indefiniment.
 */

interface EchoRunDB extends DBSchema {
  races: {
    key: string;
    value: {
      raceId: string;
      name: string;
      raceDate: string | null;
      mode: 'gpx' | 'time';
      track: TrackPoint[];
      distanceM: number;
      durationS: number | null;
      cachedAt: number;
      messageCount: number;
    };
  };
  messages: {
    key: string;
    value: OfflineMessage;
    indexes: { by_race: string };
  };
  audios: {
    key: string;
    value: { id: string; raceId: string; blob: Blob };
    indexes: { by_race: string };
  };
  /** Lectures a resynchroniser vers Supabase des que le reseau revient. */
  playback: {
    key: string;
    value: { id: string; raceId: string; playedAt: number; synced: boolean };
    indexes: { by_race: string };
  };
}

const DB_NAME = 'echorun';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EchoRunDB>> | null = null;

function getDb(): Promise<IDBPDatabase<EchoRunDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EchoRunDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('races')) {
          db.createObjectStore('races', { keyPath: 'raceId' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' });
          store.createIndex('by_race', 'race_id');
        }
        if (!db.objectStoreNames.contains('audios')) {
          const store = db.createObjectStore('audios', { keyPath: 'id' });
          store.createIndex('by_race', 'raceId');
        }
        if (!db.objectStoreNames.contains('playback')) {
          const store = db.createObjectStore('playback', { keyPath: 'id' });
          store.createIndex('by_race', 'raceId');
        }
      },
    });
  }
  return dbPromise;
}

export interface CachedRace {
  raceId: string;
  name: string;
  raceDate: string | null;
  mode: 'gpx' | 'time';
  track: TrackPoint[];
  distanceM: number;
  durationS: number | null;
  cachedAt: number;
  messageCount: number;
}

export async function saveRaceSnapshot(race: CachedRace): Promise<void> {
  const db = await getDb();
  await db.put('races', race);
}

export async function getRaceSnapshot(raceId: string): Promise<CachedRace | undefined> {
  const db = await getDb();
  return db.get('races', raceId);
}

export async function saveMessage(meta: OfflineMessage, blob: Blob): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['messages', 'audios'], 'readwrite');
  await Promise.all([
    tx.objectStore('messages').put(meta),
    tx.objectStore('audios').put({ id: meta.id, raceId: meta.race_id, blob }),
    tx.done,
  ]);
}

export async function getRaceMessages(raceId: string): Promise<OfflineMessage[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('messages', 'by_race', raceId);
  // Tri unifié : par instant en mode temps, par distance en mode GPX. Les deux
  // champs sont exclusifs, donc on trie sur celui qui est renseigné.
  return rows.sort((a, b) => {
    if (a.trigger_at_s !== null && b.trigger_at_s !== null) {
      return a.trigger_at_s - b.trigger_at_s;
    }
    return a.distance_m - b.distance_m;
  });
}

export async function getAudioBlob(messageId: string): Promise<Blob | null> {
  const db = await getDb();
  const row = await db.get('audios', messageId);
  return row?.blob ?? null;
}

export async function hasAudio(messageId: string): Promise<boolean> {
  const db = await getDb();
  return (await db.getKey('audios', messageId)) !== undefined;
}

export async function markPlayedLocally(messageId: string, raceId: string): Promise<void> {
  const db = await getDb();
  await db.put('playback', { id: messageId, raceId, playedAt: Date.now(), synced: false });
}

export async function getPlayedIds(raceId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('playback', 'by_race', raceId);
  return rows.map((r) => r.id);
}

export async function getUnsyncedPlayback(
  raceId: string,
): Promise<{ id: string; playedAt: number }[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('playback', 'by_race', raceId);
  return rows.filter((r) => !r.synced).map((r) => ({ id: r.id, playedAt: r.playedAt }));
}

export async function markPlaybackSynced(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const tx = db.transaction('playback', 'readwrite');
  for (const id of ids) {
    const row = await tx.store.get(id);
    if (row) await tx.store.put({ ...row, synced: true });
  }
  await tx.done;
}

/** Purge complete d'une course (fin de course, ou liberation d'espace). */
export async function clearRaceCache(raceId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['races', 'messages', 'audios', 'playback'], 'readwrite');
  const messageKeys = await tx.objectStore('messages').index('by_race').getAllKeys(raceId);
  const audioKeys = await tx.objectStore('audios').index('by_race').getAllKeys(raceId);
  const playbackKeys = await tx.objectStore('playback').index('by_race').getAllKeys(raceId);

  await Promise.all([
    tx.objectStore('races').delete(raceId),
    ...messageKeys.map((k) => tx.objectStore('messages').delete(k)),
    ...audioKeys.map((k) => tx.objectStore('audios').delete(k)),
    ...playbackKeys.map((k) => tx.objectStore('playback').delete(k)),
    tx.done,
  ]);
}

/** Demande un stockage persistant : evite l'eviction par iOS avant la course. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

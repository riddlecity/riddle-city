/**
 * Photo storage utility using IndexedDB as the primary store.
 *
 * Why IndexedDB instead of localStorage?
 * - localStorage is limited to ~5MB and iOS Safari clears it aggressively
 *   when the device is low on storage or the tab has been backgrounded.
 * - IndexedDB is allocated up to 50% of available disk space and is treated
 *   as persistent storage — iOS is far less likely to evict it.
 * - localStorage is kept as a read fallback so photos taken before this
 *   change are still found.
 */

const DB_NAME = "riddlecity";
const STORE_NAME = "photos";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // key-value store, keyed by photo key
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Build the storage key for a given group + riddle */
export function photoKey(groupId: string, riddleId: string): string {
  return `riddlecity_photo_${groupId}_${riddleId}`;
}

/** Save a photo. Primary: IndexedDB. Fallback write: localStorage. */
export async function savePhoto(groupId: string, riddleId: string, dataUrl: string): Promise<void> {
  const key = photoKey(groupId, riddleId);

  // Always keep localStorage in sync as a last-resort fallback
  try {
    localStorage.setItem(key, dataUrl);
  } catch {
    // localStorage may be full – silently ignore
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB failed – localStorage copy is the fallback, silently ignore
  }
}

/** Load a single photo. Primary: IndexedDB. Fallback: localStorage. */
export async function loadPhoto(groupId: string, riddleId: string): Promise<string | null> {
  const key = photoKey(groupId, riddleId);

  try {
    const db = await openDB();
    const result = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch {
    // Fall through to localStorage
  }

  // Fallback: legacy localStorage entry
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Load all photos for a group given a list of riddle IDs. */
export async function loadPhotosForGroup(
  groupId: string,
  riddleIds: string[]
): Promise<{ [riddleId: string]: string }> {
  const results: { [riddleId: string]: string } = {};
  await Promise.all(
    riddleIds.map(async (riddleId) => {
      const photo = await loadPhoto(groupId, riddleId);
      if (photo) results[riddleId] = photo;
    })
  );
  return results;
}

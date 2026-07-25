const DB_NAME = 'hakku_local_v2';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';
const LEGACY_DB_NAME = 'myhour_videos_v1';
const LEGACY_STORE = 'videos';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

async function openMediaDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(MEDIA_STORE)) {
      database.createObjectStore(MEDIA_STORE);
    }
  };
  return requestResult(request);
}

async function readLegacyMedia(key: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(LEGACY_DB_NAME, 1);
    request.onerror = () => resolve(null);
    request.onsuccess = async () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE)) {
        database.close();
        resolve(null);
        return;
      }
      try {
        const transaction = database.transaction(LEGACY_STORE, 'readonly');
        const value = await requestResult(transaction.objectStore(LEGACY_STORE).get(key));
        database.close();
        resolve(value instanceof Blob ? value : null);
      } catch {
        database.close();
        resolve(null);
      }
    };
  });
}

export async function saveMediaBlob(key: string, blob: Blob): Promise<void> {
  if (!key || !(blob instanceof Blob) || blob.size === 0) {
    throw new Error('유효한 미디어 Blob과 키가 필요합니다.');
  }
  const database = await openMediaDatabase();
  try {
    const transaction = database.transaction(MEDIA_STORE, 'readwrite');
    transaction.objectStore(MEDIA_STORE).put(blob, key);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function loadMediaBlob(key: string): Promise<Blob | null> {
  const database = await openMediaDatabase();
  try {
    const transaction = database.transaction(MEDIA_STORE, 'readonly');
    const value = await requestResult(transaction.objectStore(MEDIA_STORE).get(key));
    if (value instanceof Blob) return value;
  } finally {
    database.close();
  }

  const legacy = await readLegacyMedia(key);
  if (legacy) {
    await saveMediaBlob(key, legacy);
    return legacy;
  }
  return null;
}

export async function loadMediaUrl(key: string): Promise<string | null> {
  const blob = await loadMediaBlob(key);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteMediaBlob(key: string): Promise<void> {
  const database = await openMediaDatabase();
  try {
    const transaction = database.transaction(MEDIA_STORE, 'readwrite');
    transaction.objectStore(MEDIA_STORE).delete(key);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function listMediaKeys(): Promise<string[]> {
  const database = await openMediaDatabase();
  try {
    const transaction = database.transaction(MEDIA_STORE, 'readonly');
    const keys = await requestResult(transaction.objectStore(MEDIA_STORE).getAllKeys());
    return keys.map(String);
  } finally {
    database.close();
  }
}

export async function mediaStorageUsage(): Promise<{ count: number; bytes: number }> {
  const database = await openMediaDatabase();
  try {
    const transaction = database.transaction(MEDIA_STORE, 'readonly');
    const blobs = await requestResult(transaction.objectStore(MEDIA_STORE).getAll());
    return {
      count: blobs.length,
      bytes: blobs.reduce((total, value) => total + (value instanceof Blob ? value.size : 0), 0),
    };
  } finally {
    database.close();
  }
}

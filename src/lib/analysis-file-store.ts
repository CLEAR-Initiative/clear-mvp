/**
 * PDF bytes for an analysis evidence file.
 *
 * The name lives in localStorage. The bytes live here, so a refresh can still
 * preview and download the file. The knowledge base holds its own copy once
 * the upload is accepted; this store is what this browser opens.
 */

const DB_NAME = "clear.analysis";
const STORE = "files";

function storageId(storageKey: string, id: string): string {
  return `${storageKey}\n${id}`;
}

const memory = new Map<string, Blob>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function asBlob(value: unknown): Blob | null {
  return value instanceof Blob ? value : null;
}

async function put(id: string, blob: Blob): Promise<void> {
  memory.set(id, blob);
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function get(id: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return memory.get(id) ?? null;
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(asBlob(request.result));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

/** Save the PDF for one evidence row. `id` is the local id or the knowledge-base report id. */
export async function saveAnalysisFile(storageKey: string, id: string, blob: Blob): Promise<void> {
  const key = storageId(storageKey, id);
  memory.set(key, blob);
  try {
    await put(key, blob);
  } catch {
    memory.set(key, blob);
  }
}

/** The PDF saved for this row, or null when this browser never kept the bytes. */
export async function readAnalysisFile(storageKey: string, id: string): Promise<Blob | null> {
  const key = storageId(storageKey, id);
  try {
    return (await get(key)) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/** Drop every saved PDF. Called on sign-out, with the localStorage copies. */
export async function clearAnalysisFiles(): Promise<void> {
  memory.clear();
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

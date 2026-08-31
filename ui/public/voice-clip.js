const DB_NAME = "tziki-gym-bro-voice";
const DB_VERSION = 1;
const STORE = "clips";
const CLIP_KEY = "workout-start";
const MAX_BYTES = 5 * 1024 * 1024;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function saveVoiceClip(blob) {
  if (!(blob instanceof Blob)) throw new Error("Invalid audio");
  if (blob.size > MAX_BYTES) throw new Error("Audio too large (max 5MB)");
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Save failed"));
    tx.objectStore(STORE).put(
      {
        blob,
        type: blob.type || "audio/webm",
        saved_at: new Date().toISOString(),
        size: blob.size,
      },
      CLIP_KEY
    );
  });
}

export async function loadVoiceClip() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(CLIP_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("Load failed"));
  });
}

export async function clearVoiceClip() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Clear failed"));
    tx.objectStore(STORE).delete(CLIP_KEY);
  });
}

export async function playVoiceClip() {
  const stored = await loadVoiceClip();
  if (!stored?.blob) return false;
  const url = URL.createObjectURL(stored.blob);
  return new Promise((resolve) => {
    const audio = new Audio(url);
    const done = (ok) => {
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.play().then(() => {}).catch(() => done(false));
  });
}

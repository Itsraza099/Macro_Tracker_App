import { createSeedDb, type DemoDb } from "./seed";

// All demo data lives in the visitor's own browser (localStorage), so nothing
// is shared between visitors and nothing leaves the device.
const KEY = "macro-tracker-demo:v1";

let memory: DemoDb | null = null;

function isDb(v: unknown): v is DemoDb {
  const d = v as DemoDb | null;
  return !!d && Array.isArray(d.dictionary) && Array.isArray(d.logs) && Array.isArray(d.watch) && !!d.settings && !!d.nextId;
}

export function loadDb(): DemoDb {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isDb(parsed)) {
        memory = parsed;
        return parsed;
      }
    }
  } catch {
    // Storage blocked or corrupt: fall through to a fresh seed.
  }
  memory = createSeedDb();
  saveDb(memory);
  return memory;
}

export function saveDb(db: DemoDb) {
  memory = db;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Private mode or quota: the in-memory copy keeps the session working.
  }
}

export function resetDb(): DemoDb {
  const fresh = createSeedDb();
  saveDb(fresh);
  return fresh;
}

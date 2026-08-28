const KEY = "bubble-pop-save";
const SAVE_VERSION = 1;

export type SaveData = {
  version: number;
  best: number;
  muted: boolean;
};

const DEFAULTS: SaveData = {
  version: SAVE_VERSION,
  best: 0,
  muted: false,
};

function migrate(raw: SaveData): SaveData {
  const next = { ...DEFAULTS, ...raw };
  next.version = SAVE_VERSION;
  if (!Number.isFinite(next.best) || next.best < 0) next.best = 0;
  next.muted = Boolean(next.muted);
  return next;
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(data: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...data, version: SAVE_VERSION }));
  } catch {
    // private mode / quota
  }
}

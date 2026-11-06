const KEY = "bubble-pop-save";
const SAVE_VERSION = 2;

export type SaveData = {
  version: number;
  best: number;
  muted: boolean;
  name: string;
};

const DEFAULTS: SaveData = {
  version: SAVE_VERSION,
  best: 0,
  muted: false,
  name: "유수현",
};

function migrate(raw: Partial<SaveData>): SaveData {
  const next = { ...DEFAULTS, ...raw };
  next.version = SAVE_VERSION;
  if (!Number.isFinite(next.best) || next.best < 0) next.best = 0;
  next.muted = Boolean(next.muted);
  const name = typeof next.name === "string" ? next.name.trim() : "";
  next.name = name.slice(0, 12) || "유수현";
  return next;
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return migrate(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(data: Partial<SaveData>): void {
  if (typeof window === "undefined") return;
  try {
    const next = migrate({ ...loadSave(), ...data });
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode / quota
  }
}

import type { SpecialKind } from "./specials";

export type Overlay = "title" | "playing" | "paused" | "clear" | "over";

export type HudState = {
  score: number;
  best: number;
  level: number;
  shotsLeft: number;
  dropEvery: number;
  combo: number;
  muted: boolean;
  overlay: Overlay;
  lastClearBonus: number;
  praise: string;
  toast: string;
  toastKey: number;
  toastKind: "praise" | "cheer";
  helpAvailable: boolean;
  hint: string;
  hintKey: number;
};

export type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  special: SpecialKind | null;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  age: number;
  life: number;
  drag?: number;
};

export type PopFx = {
  x: number;
  y: number;
  color: number;
  age: number;
  life: number;
};

export type FallFx = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: number;
  age: number;
  life: number;
};

export type FloatText = {
  x: number;
  y: number;
  text: string;
  age: number;
  life: number;
  kind: "score" | "praise";
};

export type Shockwave = {
  x: number;
  y: number;
  age: number;
  life: number;
  color: string;
};

export type EngineHandlers = {
  onHud: (hud: HudState) => void;
};

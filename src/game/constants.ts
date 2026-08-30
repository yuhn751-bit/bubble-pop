export const COLS_EVEN = 10;
export const COLS_ODD = 10;
export const MAX_ROWS = 22;
export const MATCH_MIN = 3;
export const SQRT3 = Math.sqrt(3);
export const TAU = Math.PI * 2;

export const AIM_MAX = (80 * Math.PI) / 180;
export const AIM_SPEED = 1.8;
export const SHOT_SPEED = 980;
export const POP_LOCK = 0.36;
export const DROP_ANIM = 0.42;
export const HITSTOP_POP = 0.07;
export const HITSTOP_BIG = 0.14;

export const SCORE_POP = 10;
export const SCORE_FALL = 20;
export const SCORE_CLEAR = 800;
export const SCORE_SPECIAL = 50;

export function skipAheadScore(startLevel: number): number {
  let total = 0;
  for (let level = 1; level < startLevel; level++) {
    total += SCORE_CLEAR * level;
    total += 250 * level;
  }
  return total;
}

export const BUBBLE_COLORS = [
  { base: "#e24b57", dark: "#8a1824", light: "#ff9aa3", glow: "#ff6b76" },
  { base: "#f0a202", dark: "#8a5600", light: "#ffe08a", glow: "#ffc14a" },
  { base: "#2f9e4f", dark: "#145c2a", light: "#8ae0a6", glow: "#4ecf74" },
  { base: "#2d86e8", dark: "#0c4a96", light: "#9cc8ff", glow: "#5aa8ff" },
  { base: "#c45ed8", dark: "#6c2080", light: "#ebb0f5", glow: "#d980ea" },
  { base: "#1fb8ae", dark: "#0b6a64", light: "#8aeee6", glow: "#4ad4ca" },
] as const;

export type BubblePalette = (typeof BUBBLE_COLORS)[number];

export function colCount(row: number): number {
  return row % 2 === 1 ? COLS_ODD : COLS_EVEN;
}

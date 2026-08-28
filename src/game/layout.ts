import { COLS_EVEN, SQRT3 } from "./constants";

export type Layout = {
  cssW: number;
  cssH: number;
  r: number;
  originX: number;
  originY: number;
  ceilingY: number;
  shooterX: number;
  shooterY: number;
  dangerY: number;
  leftWall: number;
  rightWall: number;
};

export function computeLayout(cssW: number, cssH: number, ceilingDrop: number): Layout {
  const topHud = 78;
  const bottomSafe = 64;
  const unitsWide = COLS_EVEN * 2 + 1;
  const maxField = Math.min(cssW - 16, 640);
  const rFromW = maxField / unitsWide;
  const rFromH = (cssH - topHud - bottomSafe) / (12 * SQRT3 + 6.2);
  const r = Math.max(12, Math.min(rFromW, rFromH, 26));
  const fieldW = unitsWide * r;
  const leftWall = (cssW - fieldW) / 2;
  const rightWall = leftWall + fieldW;
  const originX = leftWall + r;
  const shooterY = cssH - r * 2.35 - bottomSafe;
  const dangerY = shooterY - r * 2.7;
  const shift = ceilingDrop * r * SQRT3;
  const originY = topHud + r + shift;
  const ceilingY = topHud + shift;
  return {
    cssW,
    cssH,
    r,
    originX,
    originY,
    ceilingY,
    shooterX: cssW / 2,
    shooterY,
    dangerY,
    leftWall,
    rightWall,
  };
}

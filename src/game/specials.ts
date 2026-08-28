import { MATCH_MIN } from "./constants";
import {
  inBounds,
  neighbors,
  type Cell,
  type Grid,
} from "./grid";

export type SpecialKind =
  | "rainbow"
  | "bomb"
  | "star"
  | "heart"
  | "lightning"
  | "laser"
  | "paint"
  | "plus"
  | "magnet"
  | "lock"
  | "ink"
  | "hourglass"
  | "anchor";

export type SpecialGrid = (SpecialKind | null)[][];

export const SPECIAL_CHANCE = 0.015;

export const GOOD_SPECIALS: SpecialKind[] = [
  "rainbow",
  "bomb",
  "star",
  "heart",
  "lightning",
  "laser",
  "paint",
  "plus",
  "magnet",
];

export const BAD_SPECIALS: SpecialKind[] = ["lock", "ink", "hourglass", "anchor"];

export const SPECIAL_KINDS: SpecialKind[] = [...GOOD_SPECIALS, ...BAD_SPECIALS];

export const SPECIAL_HINTS: Record<SpecialKind, string> = {
  rainbow: "무지개 · 어떤 색이든 맞춰요",
  bomb: "폭탄 · 주변 구슬을 터뜨려요",
  star: "별 · 같은 색을 모두 지워요",
  heart: "하트 · 천장을 한 칸 올려요",
  lightning: "번개 · 가로 한 줄을 쓸어요",
  laser: "레이저 · 세로 한 줄을 뚫어요",
  paint: "물감 · 주변을 같은 색으로 칠해요",
  plus: "십자 · 가로세로를 동시에 뚫어요",
  magnet: "자석 · 가까운 같은 색을 끌어 터뜨려요",
  lock: "자물쇠 · 한 번 더 맞춰야 풀려요",
  ink: "먹물 · 주변 색깔이 섞여요",
  hourglass: "모래시계 · 천장 카운트가 줄어요",
  anchor: "닻 · 천장이 한 칸 내려와요",
};

export function hintForSpecial(kind: SpecialKind): string {
  return SPECIAL_HINTS[kind];
}

export function makeSpecials(rows: number, colCountFor: (row: number) => number): SpecialGrid {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: colCountFor(row) }, () => null),
  );
}

export function cloneSpecials(grid: SpecialGrid): SpecialGrid {
  return grid.map((row) => row.slice());
}

export function pickSpecial(rng: () => number, opts?: { allowBad?: boolean }): SpecialKind {
  const allowBad = opts?.allowBad ?? true;
  if (allowBad && rng() < 0.25) {
    return BAD_SPECIALS[Math.floor(rng() * BAD_SPECIALS.length) % BAD_SPECIALS.length];
  }
  return pickGoodSpecial(rng);
}

export function pickGoodSpecial(rng: () => number): SpecialKind {
  return GOOD_SPECIALS[Math.floor(rng() * GOOD_SPECIALS.length) % GOOD_SPECIALS.length];
}

export function inferAdjacentColor(grid: Grid, specials: SpecialGrid, start: Cell): number | null {
  const counts = new Map<number, number>();
  for (const n of neighbors(start.row, start.col)) {
    const value = grid[n.row][n.col];
    const sp = specials[n.row][n.col];
    if (value === null || sp === "rainbow") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [color, n] of counts) {
    if (n > bestN) {
      best = color;
      bestN = n;
    }
  }
  return best;
}

function isWild(specials: SpecialGrid, row: number, col: number): boolean {
  return specials[row][col] === "rainbow";
}

export function floodGroup(
  grid: Grid,
  specials: SpecialGrid,
  start: Cell,
  matchColor?: number | null,
): Cell[] {
  const startVal = grid[start.row]?.[start.col];
  if (startVal === null || startVal === undefined) return [];
  let color = matchColor ?? null;
  if (color === null) {
    color = isWild(specials, start.row, start.col)
      ? inferAdjacentColor(grid, specials, start)
      : startVal;
  }
  if (color === null) return [];

  const seen = new Set<string>();
  const stack: Cell[] = [start];
  const group: Cell[] = [];
  while (stack.length) {
    const cell = stack.pop()!;
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const value = grid[cell.row][cell.col];
    if (value === null) continue;
    const wild = isWild(specials, cell.row, cell.col);
    if (specials[cell.row][cell.col] === "lock") continue;
    if (!wild && value !== color) continue;
    group.push(cell);
    for (const n of neighbors(cell.row, cell.col)) stack.push(n);
  }
  return group;
}

export function findMatches(
  grid: Grid,
  specials: SpecialGrid,
  start: Cell,
  matchColor?: number | null,
): Cell[] {
  const group = floodGroup(grid, specials, start, matchColor);
  return group.length >= MATCH_MIN ? group : [];
}

function addAllOfColor(
  grid: Grid,
  color: number,
  add: (row: number, col: number) => boolean,
): boolean {
  let any = false;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === color && add(row, col)) any = true;
    }
  }
  return any;
}

function addRow(grid: Grid, row: number, add: (row: number, col: number) => boolean): boolean {
  let any = false;
  const line = grid[row];
  if (!line) return false;
  for (let col = 0; col < line.length; col++) {
    if (line[col] !== null && add(row, col)) any = true;
  }
  return any;
}

function addCol(grid: Grid, col: number, add: (row: number, col: number) => boolean): boolean {
  let any = false;
  for (let row = 0; row < grid.length; row++) {
    if (col >= 0 && col < grid[row].length && grid[row][col] !== null && add(row, col)) any = true;
  }
  return any;
}

function addPlus(grid: Grid, row: number, col: number, add: (row: number, col: number) => boolean): boolean {
  const a = addRow(grid, row, add);
  const b = addCol(grid, col, add);
  return a || b;
}

function hexDist(r1: number, c1: number, r2: number, c2: number): number {
  const x1 = c1 - (r1 - (r1 & 1)) / 2;
  const z1 = r1;
  const y1 = -x1 - z1;
  const x2 = c2 - (r2 - (r2 & 1)) / 2;
  const z2 = r2;
  const y2 = -x2 - z2;
  return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}

function addMagnet(grid: Grid, start: Cell, add: (row: number, col: number) => boolean): boolean {
  const color = grid[start.row][start.col];
  if (color === null) return false;
  let any = add(start.row, start.col);
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] !== color) continue;
      if (hexDist(start.row, start.col, row, col) <= 2 && add(row, col)) any = true;
    }
  }
  return any;
}

function applyInk(grid: Grid, specials: SpecialGrid, cell: Cell): void {
  const palette = presentPlayColors(grid, specials);
  const pool = palette.length ? palette : [0, 1, 2];
  for (const n of neighbors(cell.row, cell.col)) {
    if (grid[n.row][n.col] === null) continue;
    const sp = specials[n.row][n.col];
    if (sp === "rainbow" || sp === "lock") continue;
    grid[n.row][n.col] = pool[Math.floor(Math.random() * pool.length) % pool.length];
  }
}

function unlockAdjacentLocks(specials: SpecialGrid, keys: Set<string>): void {
  for (const key of [...keys]) {
    const comma = key.indexOf(",");
    const row = Number(key.slice(0, comma));
    const col = Number(key.slice(comma + 1));
    for (const n of neighbors(row, col)) {
      const nKey = `${n.row},${n.col}`;
      if (keys.has(nKey)) continue;
      if (specials[n.row]?.[n.col] === "lock") specials[n.row][n.col] = null;
    }
  }
}

function applyPaint(
  grid: Grid,
  specials: SpecialGrid,
  cell: Cell,
  add: (row: number, col: number) => boolean,
): boolean {
  const color = grid[cell.row][cell.col];
  if (color === null) return false;
  let any = add(cell.row, cell.col);
  for (const n of neighbors(cell.row, cell.col)) {
    if (grid[n.row][n.col] === null) continue;
    if (specials[n.row][n.col] === "rainbow") continue;
    grid[n.row][n.col] = color;
    if (add(n.row, n.col)) any = true;
  }
  return any;
}

export type PopResult = {
  cells: Cell[];
  heart: boolean;
  hourglass: boolean;
  anchor: boolean;
  kinds: SpecialKind[];
};

export function collectPops(
  grid: Grid,
  specials: SpecialGrid,
  start: Cell,
  shotSpecial: SpecialKind | null,
  hitColor: number | null,
): PopResult {
  const keys = new Set<string>();
  const add = (row: number, col: number): boolean => {
    if (!inBounds(row, col)) return false;
    if (grid[row][col] === null) return false;
    const key = `${row},${col}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  };

  const placedPaint = shotSpecial === "paint" || specials[start.row][start.col] === "paint";
  if (placedPaint) applyPaint(grid, specials, start, add);

  const placedInk = shotSpecial === "ink" || specials[start.row][start.col] === "ink";
  if (placedInk) {
    add(start.row, start.col);
    applyInk(grid, specials, start);
  }

  const placedGlass = shotSpecial === "hourglass" || specials[start.row][start.col] === "hourglass";
  if (placedGlass) add(start.row, start.col);

  const rainbowColor =
    shotSpecial === "rainbow" ? hitColor ?? inferAdjacentColor(grid, specials, start) : undefined;
  for (const cell of findMatches(grid, specials, start, rainbowColor)) {
    add(cell.row, cell.col);
  }

  const placedBomb = shotSpecial === "bomb" || specials[start.row][start.col] === "bomb";
  if (placedBomb) {
    add(start.row, start.col);
    for (const n of neighbors(start.row, start.col)) add(n.row, n.col);
  }
  for (const n of neighbors(start.row, start.col)) {
    if (specials[n.row][n.col] !== "bomb") continue;
    add(n.row, n.col);
    for (const nn of neighbors(n.row, n.col)) add(nn.row, nn.col);
  }

  const placedStar = shotSpecial === "star" || specials[start.row][start.col] === "star";
  if (placedStar) {
    add(start.row, start.col);
    const color = hitColor ?? inferAdjacentColor(grid, specials, start);
    if (color !== null) addAllOfColor(grid, color, add);
  }

  const placedBolt = shotSpecial === "lightning" || specials[start.row][start.col] === "lightning";
  if (placedBolt) {
    add(start.row, start.col);
    addRow(grid, start.row, add);
  }

  const placedLaser = shotSpecial === "laser" || specials[start.row][start.col] === "laser";
  if (placedLaser) {
    add(start.row, start.col);
    addCol(grid, start.col, add);
  }

  const placedPlus = shotSpecial === "plus" || specials[start.row][start.col] === "plus";
  if (placedPlus) {
    add(start.row, start.col);
    addPlus(grid, start.row, start.col, add);
  }

  const placedMagnet = shotSpecial === "magnet" || specials[start.row][start.col] === "magnet";
  if (placedMagnet) addMagnet(grid, start, add);

  let heart = shotSpecial === "heart" || specials[start.row][start.col] === "heart";
  if (heart) add(start.row, start.col);
  let hourglass = placedGlass;
  let anchor = shotSpecial === "anchor" || specials[start.row][start.col] === "anchor";
  if (anchor) add(start.row, start.col);

  const processed = new Set<string>();
  let grow = true;
  while (grow) {
    grow = false;
    for (const key of [...keys]) {
      if (processed.has(key)) continue;
      processed.add(key);
      const comma = key.indexOf(",");
      const row = Number(key.slice(0, comma));
      const col = Number(key.slice(comma + 1));
      const sp = specials[row][col];
      if (sp === "bomb") {
        for (const n of neighbors(row, col)) {
          if (add(n.row, n.col)) grow = true;
        }
      } else if (sp === "star") {
        const color = grid[row][col];
        if (color !== null && addAllOfColor(grid, color, add)) grow = true;
      } else if (sp === "heart") {
        heart = true;
      } else if (sp === "lightning") {
        if (addRow(grid, row, add)) grow = true;
      } else if (sp === "laser") {
        if (addCol(grid, col, add)) grow = true;
      } else if (sp === "plus") {
        if (addPlus(grid, row, col, add)) grow = true;
      } else if (sp === "magnet") {
        if (addMagnet(grid, { row, col }, add)) grow = true;
      } else if (sp === "paint") {
        if (applyPaint(grid, specials, { row, col }, add)) grow = true;
      } else if (sp === "ink") {
        applyInk(grid, specials, { row, col });
      } else if (sp === "hourglass") {
        hourglass = true;
      } else if (sp === "anchor") {
        anchor = true;
      }
    }
  }

  unlockAdjacentLocks(specials, keys);

  const cells: Cell[] = [];
  const kinds: SpecialKind[] = [];
  for (const key of keys) {
    const comma = key.indexOf(",");
    const row = Number(key.slice(0, comma));
    const col = Number(key.slice(comma + 1));
    cells.push({ row, col });
    const sp = specials[row][col];
    if (sp) kinds.push(sp);
  }
  if (shotSpecial && !kinds.includes(shotSpecial)) kinds.unshift(shotSpecial);
  return { cells, heart, hourglass, anchor, kinds };
}

export function presentPlayColors(grid: Grid, specials: SpecialGrid): number[] {
  const set = new Set<number>();
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const value = grid[row][col];
      if (value === null) continue;
      if (specials[row][col] === "rainbow") continue;
      set.add(value);
    }
  }
  return [...set].sort((a, b) => a - b);
}

import { COLS_EVEN, MAX_ROWS, SQRT3, colCount } from "./constants";

export type Grid = (number | null)[][];

export type Cell = { row: number; col: number };

const EVEN_DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [-1, 1],
  [0, 1],
];

const ODD_DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, -1],
  [0, 1],
  [1, 1],
];

export function makeGrid(): Grid {
  const grid: Grid = [];
  for (let row = 0; row < MAX_ROWS; row++) {
    grid.push(Array.from({ length: colCount(row) }, () => null));
  }
  return cloneGrid(grid);
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < MAX_ROWS && col >= 0 && col < colCount(row);
}

export function neighbors(row: number, col: number): Cell[] {
  const dirs = row % 2 === 1 ? ODD_DIRS : EVEN_DIRS;
  const out: Cell[] = [];
  for (const [dc, dr] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc)) out.push({ row: nr, col: nc });
  }
  return out;
}

export function hexToPixel(
  row: number,
  col: number,
  r: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  return {
    x: originX + (col + (row % 2 === 1 ? 0.5 : 0)) * 2 * r,
    y: originY + row * r * SQRT3,
  };
}

export function pixelToHex(
  x: number,
  y: number,
  r: number,
  originX: number,
  originY: number,
): Cell {
  const row = Math.round((y - originY) / (r * SQRT3));
  const col = Math.round((x - originX) / (2 * r) - (row % 2 === 1 ? 0.5 : 0));
  return { row, col };
}

export function hasOccupiedNeighbor(grid: Grid, row: number, col: number): boolean {
  for (const n of neighbors(row, col)) {
    if (grid[n.row][n.col] !== null) return true;
  }
  return false;
}

export function cellsConnectedToCeiling(grid: Grid): Set<string> {
  const seen = new Set<string>();
  const stack: Cell[] = [];
  const top = grid[0];
  if (!top) return seen;
  for (let col = 0; col < top.length; col++) {
    if (top[col] !== null) stack.push({ row: 0, col });
  }
  while (stack.length) {
    const cell = stack.pop()!;
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key)) continue;
    if (grid[cell.row][cell.col] === null) continue;
    seen.add(key);
    for (const n of neighbors(cell.row, cell.col)) stack.push(n);
  }
  return seen;
}

export function findFloating(grid: Grid): Cell[] {
  const anchored = cellsConnectedToCeiling(grid);
  const floating: Cell[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === null) continue;
      if (!anchored.has(`${row},${col}`)) floating.push({ row, col });
    }
  }
  return floating;
}

export function presentColors(grid: Grid): number[] {
  const set = new Set<number>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) set.add(cell);
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function isEmpty(grid: Grid): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) return false;
    }
  }
  return true;
}

export function lowestBubbleY(
  grid: Grid,
  r: number,
  originY: number,
): number {
  let maxY = -Infinity;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === null) continue;
      const y = originY + row * r * SQRT3;
      if (y > maxY) maxY = y;
    }
  }
  return maxY;
}

export function findSnapCell(
  grid: Grid,
  x: number,
  y: number,
  r: number,
  originX: number,
  originY: number,
  hit: Cell | null,
): Cell | null {
  const approx = pixelToHex(x, y, r, originX, originY);
  const candidates: Cell[] = [];
  const consider = (row: number, col: number) => {
    if (!inBounds(row, col)) return;
    if (grid[row][col] !== null) return;
    if (row !== 0 && !hasOccupiedNeighbor(grid, row, col)) return;
    candidates.push({ row, col });
  };

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      consider(approx.row + dr, approx.col + dc);
    }
  }
  if (hit) {
    for (const n of neighbors(hit.row, hit.col)) consider(n.row, n.col);
    consider(hit.row, hit.col);
  }
  consider(approx.row, approx.col);

  if (candidates.length === 0) {
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const row = approx.row + dr;
        const col = approx.col + dc;
        if (!inBounds(row, col)) continue;
        if (grid[row][col] !== null) continue;
        candidates.push({ row, col });
      }
    }
  }

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestD = Infinity;
  for (const cell of candidates) {
    const p = hexToPixel(cell.row, cell.col, r, originX, originY);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = cell;
    }
  }
  return best;
}

export function occupiedCells(grid: Grid): Array<Cell & { color: number }> {
  const out: Array<Cell & { color: number }> = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const color = grid[row][col];
      if (color !== null) out.push({ row, col, color });
    }
  }
  return out;
}

export function fieldRight(r: number, originX: number): number {
  return originX + COLS_EVEN * 2 * r;
}

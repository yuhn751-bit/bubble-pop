import { colCount, MAX_ROWS } from "./constants";
import { findFloating, makeGrid, type Grid } from "./grid";
import { mulberry32 } from "./rng";
import {
  makeSpecials,
  pickSpecial,
  SPECIAL_CHANCE,
  type SpecialGrid,
  type SpecialKind,
} from "./specials";

export type LevelSpec = {
  grid: Grid;
  specials: SpecialGrid;
  colorCount: number;
  dropEvery: number;
  starterColor?: number;
  starterSpecial?: SpecialKind | null;
};

export function buildLevel(level: number): LevelSpec {
  if (level <= 1) return buildBonusLevel();

  const rng = mulberry32(((Math.random() * 0xffffffff) ^ (level * 7919 + 17)) >>> 0);
  const colorCount = level <= 2 ? 3 : level <= 5 ? 4 : level <= 9 ? 5 : 6;
  const baseFill = Math.min(8, 4 + Math.floor((level - 1) / 2));
  const fillRows = Math.max(3, Math.min(8, baseFill + (rng() < 0.35 ? 1 : 0) - (rng() < 0.2 ? 1 : 0)));
  const dropEvery = Math.max(7, 13 - Math.floor((level - 1) / 2));
  const grid = makeGrid();
  const specials = makeSpecials(MAX_ROWS, colCount);
  const pattern = Math.floor(rng() * 4);
  const shift = Math.floor(rng() * colorCount);
  const colors = Array.from({ length: colorCount }, (_, i) => i);
  const clusterChance = Math.max(0.14, 0.55 - (level - 2) * 0.04 + (rng() - 0.5) * 0.08);

  for (let row = 0; row < fillRows; row++) {
    for (let col = 0; col < colCount(row); col++) {
      let color: number;
      if (pattern === 1) {
        color = (col + Math.floor(row / 2) + shift) % colorCount;
      } else if (pattern === 2) {
        color = (col + row + shift) % colorCount;
      } else if (pattern === 3) {
        color = Math.floor(col / 2 + row * 0.5 + shift) % colorCount;
      } else {
        color = colors[Math.floor(rng() * colors.length)];
      }
      if (col > 0 && rng() < clusterChance) {
        const prev = grid[row][col - 1];
        if (prev !== null) color = prev;
      } else if (row > 0 && rng() < clusterChance * 0.45) {
        const above = grid[row - 1][Math.min(col, grid[row - 1].length - 1)];
        if (above !== null) color = above;
      }
      grid[row][col] = color;
      if (rng() < SPECIAL_CHANCE) specials[row][col] = pickSpecial(rng, { allowBad: true });
    }
  }

  scrambleLayout(grid, specials, fillRows, colorCount, level, rng);
  thinLayout(grid, specials, fillRows, level, rng);
  return { grid, specials, colorCount, dropEvery };
}

function buildBonusLevel(): LevelSpec {
  const grid = makeGrid();
  const specials = makeSpecials(MAX_ROWS, colCount);
  const fillRows = 4;
  const accent = 0;
  for (let row = 0; row < fillRows; row++) {
    for (let col = 0; col < colCount(row); col++) {
      const edge = row === 0 || row === fillRows - 1;
      const spine = col === 4 || col === 5;
      if (edge || spine) {
        grid[row][col] = accent;
      } else {
        grid[row][col] = 1 + ((col + row * 2) % 5);
      }
    }
  }
  return {
    grid,
    specials,
    colorCount: 6,
    dropEvery: 13,
    starterColor: accent,
    starterSpecial: "star",
  };
}

function scrambleLayout(
  grid: Grid,
  specials: SpecialGrid,
  fillRows: number,
  colorCount: number,
  level: number,
  rng: () => number,
): void {
  const jitter = Math.min(0.3, 0.14 + (level - 2) * 0.03);
  for (let row = 0; row < fillRows; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === null) continue;
      if (rng() < jitter) {
        grid[row][col] = Math.floor(rng() * colorCount);
      }
      if (col > 0 && grid[row][col - 1] !== null && rng() < jitter * 0.45) {
        const color = grid[row][col];
        const special = specials[row][col];
        grid[row][col] = grid[row][col - 1];
        specials[row][col] = specials[row][col - 1];
        grid[row][col - 1] = color;
        specials[row][col - 1] = special;
      }
      if (row > 0 && col < grid[row - 1].length && grid[row - 1][col] !== null && rng() < jitter * 0.25) {
        const color = grid[row][col];
        const special = specials[row][col];
        grid[row][col] = grid[row - 1][col];
        specials[row][col] = specials[row - 1][col];
        grid[row - 1][col] = color;
        specials[row - 1][col] = special;
      }
    }
  }
}

function thinLayout(
  grid: Grid,
  specials: SpecialGrid,
  fillRows: number,
  level: number,
  rng: () => number,
): void {
  if (level < 3) return;
  const holeChance = 0.1 + Math.min(0.1, (level - 3) * 0.025);
  for (let row = 0; row < fillRows; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === null) continue;
      if (row === 0 && rng() < 0.55) continue;
      if (rng() < holeChance) {
        grid[row][col] = null;
        specials[row][col] = null;
      }
    }
  }
  for (const cell of findFloating(grid)) {
    grid[cell.row][cell.col] = null;
    specials[cell.row][cell.col] = null;
  }
}

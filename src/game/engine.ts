import {
  AIM_MAX,
  AIM_SPEED,
  BUBBLE_COLORS,
  DROP_ANIM,
  HITSTOP_BIG,
  HITSTOP_POP,
  POP_LOCK,
  SCORE_CLEAR,
  SCORE_FALL,
  SCORE_POP,
  SCORE_SPECIAL,
  SHOT_SPEED,
  skipAheadScore,
} from "./constants";
import {
  cloneGrid,
  findFloating,
  findSnapCell,
  hexToPixel,
  isEmpty,
  lowestBubbleY,
  occupiedCells,
  type Grid,
} from "./grid";
import { buildLevel } from "./levels";
import { computeLayout, type Layout } from "./layout";
import { pick } from "./rng";
import { clearSpriteCache, renderFrame } from "./render";
import { loadSave, writeSave } from "./save";
import { praiseForClear, praiseForOver, praiseForPop, praiseForSpecial, cheerForHelp, teaseForMiss } from "./praise";
import {
  resumeIfNeeded,
  setMuted,
  sfxBounce,
  sfxDrop,
  sfxFall,
  sfxLose,
  sfxPop,
  sfxShoot,
  sfxSnap,
  sfxSpecial,
  sfxWin,
  unlockAudio,
} from "./audio";
import {
  cloneSpecials,
  collectPops,
  presentPlayColors,
  pickSpecial,
  pickGoodSpecial,
  hintForSpecial,
  SPECIAL_CHANCE,
  SPECIAL_KINDS,
  type SpecialGrid,
  type SpecialKind,
} from "./specials";
import type {
  EngineHandlers,
  FallFx,
  FloatText,
  HudState,
  Overlay,
  Particle,
  PopFx,
  Shockwave,
  Shot,
} from "./types";

type Phase = "ready" | "flying" | "lock" | "dropping";

type JuiceFeel = {
  trauma: number;
  hitstop: number;
  flash: number;
  punch: number;
  waveLife: number;
  waves: number;
  shards: number;
  sparks: number;
  popLife: number;
  speed: number;
  shardSize: number;
};

function juiceFor(total: number, combo: number, specials: number): JuiceFeel {
  if (total >= 13) {
    return {
      trauma: 0.95,
      hitstop: HITSTOP_BIG + 0.06,
      flash: 0.88,
      punch: 0.09,
      waveLife: 0.5,
      waves: 2,
      shards: 22,
      sparks: 10,
      popLife: 0.42,
      speed: 320,
      shardSize: 4.4,
    };
  }
  if (total <= 5) {
    return {
      trauma: 0.16,
      hitstop: HITSTOP_POP * 0.42,
      flash: 0.12,
      punch: 0.01,
      waveLife: 0.16,
      waves: 1,
      shards: 7,
      sparks: 3,
      popLife: 0.22,
      speed: 140,
      shardSize: 2.4,
    };
  }
  const big = total >= 6 || combo >= 3 || specials > 0;
  if (big) {
    return {
      trauma: 0.72,
      hitstop: HITSTOP_BIG,
      flash: 0.7,
      punch: 0.06,
      waveLife: 0.38,
      waves: 1,
      shards: 16,
      sparks: 6,
      popLife: 0.34,
      speed: 240,
      shardSize: 3.8,
    };
  }
  return {
    trauma: 0.42,
    hitstop: HITSTOP_POP,
    flash: 0.38,
    punch: 0.032,
    waveLife: 0.26,
    waves: 1,
    shards: 14,
    sparks: 5,
    popLife: 0.3,
    speed: 200,
    shardSize: 3.2,
  };
}

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyP",
  "Escape",
  "Enter",
]);

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private handlers: EngineHandlers;
  private raf = 0;
  private running = false;
  private lastTs = 0;
  private layout: Layout;
  private grid: Grid;
  private specials: SpecialGrid;
  private phase: Phase = "ready";
  private overlay: Overlay = "title";
  private aim = 0;
  private shot: Shot | null = null;
  private currentColor = 0;
  private nextColor = 1;
  private currentSpecial: SpecialKind | null = null;
  private nextSpecial: SpecialKind | null = null;
  private score = 0;
  private best = 0;
  private level = 1;
  private shotsLeft = 14;
  private dropEvery = 14;
  private ceilingDrop = 0;
  private ceilingFrom = 0;
  private ceilingTo = 0;
  private ceilingT = 0;
  private combo = 0;
  private lockT = 0;
  private hitstop = 0;
  private trauma = 0;
  private time = 0;
  private muted = false;
  private reducedMotion = false;
  private lastClearBonus = 0;
  private praise = "";
  private toast = "";
  private toastKey = 0;
  private toastT = 0;
  private hint = "";
  private hintKey = 0;
  private hintT = 0;
  private helpAvailable = true;
  private maxCombo = 0;
  private missStreak = 0;
  private flash = 0;
  private punch = 0;
  private shockwaves: Shockwave[] = [];
  private keys = new Set<string>();
  private keysPrev = new Set<string>();
  private particles: Particle[] = [];
  private pops: PopFx[] = [];
  private falls: FallFx[] = [];
  private floats: FloatText[] = [];
  private path: Array<{ x: number; y: number }> = [];
  private deco: Array<{ x: number; y: number; r: number; color: number; a: number; vy: number }> =
    [];
  private hudDirty = true;
  private pointerAimX = 0;
  private pointerAimY = 0;
  private hasPointer = false;
  private aiming = false;
  private aimPointerId: number | null = null;
  private colorCount = 4;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerCancel: (e: PointerEvent) => void;
  private boundVisibility: () => void;
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, handlers: EngineHandlers) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.handlers = handlers;
    const save = loadSave();
    this.best = save.best;
    this.muted = save.muted;
    setMuted(this.muted);
    const spec = buildLevel(1);
    this.grid = spec.grid;
    this.specials = spec.specials;
    this.layout = computeLayout(360, 640, 0);
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.seedDeco();
    this.dealBubbles();

    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.onKeyUp(e);
    this.boundBlur = () => this.keys.clear();
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerDown = (e) => this.onPointerDown(e);
    this.boundPointerUp = (e) => this.onPointerUp(e);
    this.boundPointerCancel = (e) => this.onPointerCancel(e);
    this.boundVisibility = () => {
      if (document.visibilityState === "visible") resumeIfNeeded();
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", this.boundBlur);
    this.canvas.addEventListener("pointerdown", this.boundPointerDown, { passive: false });
    this.canvas.addEventListener("pointermove", this.boundPointerMove);
    this.canvas.addEventListener("pointerup", this.boundPointerUp);
    this.canvas.addEventListener("pointercancel", this.boundPointerCancel);
    document.addEventListener("visibilitychange", this.boundVisibility);
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
    this.emitHud();
    this.exposeDebug();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("blur", this.boundBlur);
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    this.canvas.removeEventListener("pointermove", this.boundPointerMove);
    this.canvas.removeEventListener("pointerup", this.boundPointerUp);
    this.canvas.removeEventListener("pointercancel", this.boundPointerCancel);
    document.removeEventListener("visibilitychange", this.boundVisibility);
    clearSpriteCache();
    if (window.__bubblePop) delete window.__bubblePop;
  }

  play(startLevel = 1): void {
    unlockAudio();
    this.score = 0;
    this.level = Math.max(1, Math.floor(startLevel));
    this.combo = 0;
    this.ceilingDrop = 0;
    this.praise = "";
    this.toast = "";
    this.hint = "";
    this.hintT = 0;
    this.maxCombo = 0;
    this.missStreak = 0;
    this.loadLevel(this.level);
    if (this.level >= 3) {
      this.score = skipAheadScore(this.level);
      this.currentSpecial = pickGoodSpecial(() => Math.random());
      this.announceSpecial(this.currentSpecial);
      const skipped = Array.from({ length: this.level - 1 }, (_, i) => String(i + 1)).join("·");
      this.toast = `${skipped}스테이지 보너스 +${this.score.toLocaleString()}`;
      this.toastKey += 1;
      this.toastT = 2.6;
      this.praise = this.toast;
    }
    this.overlay = "playing";
    this.phase = "ready";
    this.hudDirty = true;
  }

  pauseToggle(): void {
    if (this.overlay === "playing") {
      this.overlay = "paused";
      this.hudDirty = true;
    } else if (this.overlay === "paused") {
      this.overlay = "playing";
      this.hudDirty = true;
    }
  }

  resume(): void {
    if (this.overlay === "paused") {
      this.overlay = "playing";
      this.hudDirty = true;
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;
    setMuted(this.muted);
    writeSave({ version: 1, best: this.best, muted: this.muted });
    this.hudDirty = true;
  }

  useHelp(): void {
    if (this.overlay !== "playing" || this.phase !== "ready" || !this.helpAvailable) return;
    unlockAudio();
    this.currentSpecial = pickGoodSpecial(() => Math.random());
    this.helpAvailable = false;
    const line = cheerForHelp();
    this.praise = line;
    this.toast = line;
    this.toastKey += 1;
    this.toastT = 2.2;
    sfxSpecial(this.currentSpecial);
    this.announceSpecial(this.currentSpecial);
    this.rebuildPath();
    this.hudDirty = true;
  }

  nextLevel(): void {
    unlockAudio();
    this.level += 1;
    this.ceilingDrop = 0;
    this.loadLevel(this.level);
    this.overlay = "playing";
    this.phase = "ready";
    this.hudDirty = true;
  }

  private loadLevel(level: number): void {
    const spec = buildLevel(level);
    this.grid = spec.grid;
    this.specials = spec.specials;
    this.colorCount = spec.colorCount;
    this.dropEvery = spec.dropEvery;
    this.shotsLeft = spec.dropEvery;
    this.combo = 0;
    this.shot = null;
    this.missStreak = 0;
    this.phase = "ready";
    this.pops = [];
    this.falls = [];
    this.particles = [];
    this.floats = [];
    this.shockwaves = [];
    this.dealBubbles();
    if (spec.starterColor !== undefined) {
      this.currentColor = spec.starterColor;
      this.currentSpecial = spec.starterSpecial ?? null;
    }
    this.helpAvailable = true;
    this.announceSpecial(this.currentSpecial);
    this.layout = computeLayout(this.layout.cssW, this.layout.cssH, this.ceilingDrop);
    this.rebuildPath();
  }

  private announceSpecial(kind: SpecialKind | null): void {
    if (!kind) return;
    this.hint = hintForSpecial(kind);
    this.hintT = 3;
    this.hintKey += 1;
    this.hudDirty = true;
  }

  private rollSpecial(): SpecialKind | null {
    return Math.random() < SPECIAL_CHANCE
      ? pickSpecial(() => Math.random(), { allowBad: this.level >= 2 })
      : null;
  }

  private dealBubbles(): void {
    const colors = presentPlayColors(this.grid, this.specials);
    const pool = colors.length ? colors : [0, 1, 2, 3].slice(0, this.colorCount);
    this.currentColor = pick(() => Math.random(), pool);
    this.nextColor = pick(() => Math.random(), pool);
    this.currentSpecial = this.rollSpecial();
    this.nextSpecial = this.rollSpecial();
  }

  private takeShotColor(): { color: number; special: SpecialKind | null } {
    const fired = this.currentColor;
    const firedSpecial = this.currentSpecial;
    const colors = presentPlayColors(this.grid, this.specials);
    const pool = colors.length ? colors : [0];
    this.currentColor = this.nextColor;
    this.currentSpecial = this.nextSpecial;
    if (this.currentSpecial !== "rainbow" && !pool.includes(this.currentColor)) {
      this.currentColor = pick(() => Math.random(), pool);
    }
    this.nextColor = pick(() => Math.random(), pool);
    this.nextSpecial = this.rollSpecial();
    this.announceSpecial(this.currentSpecial);
    return { color: fired, special: firedSpecial };
  }

  private loop(ts: number): void {
    if (!this.running) return;
    let dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (dt > 0.1) dt = 0.1;
    this.time += dt;
    this.update(dt);
    this.draw();
    if (this.hudDirty) this.emitHud();
    this.keysPrev = new Set(this.keys);
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  private justPressed(code: string): boolean {
    return this.keys.has(code) && !this.keysPrev.has(code);
  }

  private update(dt: number): void {
    this.updateDeco(dt);
    this.updateFx(dt);
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 3.6);
    this.punch = Math.max(0, this.punch - dt * 0.28);
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) {
        this.toast = "";
        this.hudDirty = true;
      }
    }
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) {
        this.hint = "";
        this.hudDirty = true;
      }
    }

    if (this.overlay === "title" || this.overlay === "paused") {
      this.aim = Math.sin(this.time * 0.7) * 0.25;
      return;
    }
    if (this.overlay === "clear" || this.overlay === "over") return;

    this.updateAim(dt);

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    if (this.phase === "dropping") {
      this.ceilingT += dt / DROP_ANIM;
      const t = Math.min(1, this.ceilingT);
      const eased = 1 - (1 - t) ** 3;
      this.ceilingDrop = this.ceilingFrom + (this.ceilingTo - this.ceilingFrom) * eased;
      this.layout = computeLayout(this.layout.cssW, this.layout.cssH, this.ceilingDrop);
      if (t >= 1) {
        this.ceilingDrop = this.ceilingTo;
        this.layout = computeLayout(this.layout.cssW, this.layout.cssH, this.ceilingDrop);
        this.phase = "ready";
        if (this.crossedDanger()) this.lose();
      }
      return;
    }

    if (this.phase === "lock") {
      this.lockT -= dt;
      if (this.lockT <= 0) {
        this.phase = "ready";
      }
    }

    if (this.phase === "flying" && this.shot) this.stepShot(dt);

    if (this.phase === "ready") {
      if (
        this.justPressed("Space") ||
        this.justPressed("ArrowUp") ||
        this.justPressed("KeyW")
      ) {
        this.fire();
      }
    }

    if (this.justPressed("KeyP") || this.justPressed("Escape")) this.pauseToggle();
    this.rebuildPath();
  }

  private updateAim(dt: number): void {
    if (this.hasPointer) {
      const dx = this.pointerAimX - this.layout.shooterX;
      const dy = this.pointerAimY - this.layout.shooterY;
      let ang = Math.atan2(dx, -dy);
      this.aim = Math.max(-AIM_MAX, Math.min(AIM_MAX, ang));
    }
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    if (left) this.aim -= AIM_SPEED * dt;
    if (right) this.aim += AIM_SPEED * dt;
    this.aim = Math.max(-AIM_MAX, Math.min(AIM_MAX, this.aim));
  }

  private fire(): void {
    if (this.overlay !== "playing" || this.phase !== "ready") return;
    const { color, special } = this.takeShotColor();
    const r = this.layout.r;
    const dirX = Math.sin(this.aim);
    const dirY = -Math.cos(this.aim);
    this.shot = {
      x: this.layout.shooterX + dirX * r * 1.55,
      y: this.layout.shooterY + dirY * r * 1.55,
      vx: dirX * SHOT_SPEED,
      vy: dirY * SHOT_SPEED,
      color,
      special,
    };
    this.phase = "flying";
    this.combo = 0;
    sfxShoot();
  }

  private stepShot(dt: number): void {
    const shot = this.shot;
    if (!shot) return;
    const r = this.layout.r;
    const dist = SHOT_SPEED * dt;
    const steps = Math.max(1, Math.ceil(dist / (r * 0.28)));
    const sx = shot.vx * dt / steps;
    const sy = shot.vy * dt / steps;
    for (let i = 0; i < steps; i++) {
      shot.x += sx;
      shot.y += sy;
      if (shot.x - r <= this.layout.leftWall) {
        shot.x = this.layout.leftWall + r;
        shot.vx = Math.abs(shot.vx);
        sfxBounce();
      } else if (shot.x + r >= this.layout.rightWall) {
        shot.x = this.layout.rightWall - r;
        shot.vx = -Math.abs(shot.vx);
        sfxBounce();
      }
      if (shot.y - r <= this.layout.ceilingY) {
        this.land(null);
        return;
      }
      const hit = this.hitBubble(shot.x, shot.y, r);
      if (hit) {
        this.land(hit);
        return;
      }
      if (shot.y > this.layout.cssH + r) {
        this.shot = null;
        this.phase = "ready";
        this.noteMiss();
        this.dealBubbles();
        return;
      }
    }
  }

  private hitBubble(x: number, y: number, r: number): { row: number; col: number } | null {
    const thresh = (r * 2) * (r * 2) * 0.92;
    let best: { row: number; col: number } | null = null;
    let bestD = Infinity;
    for (const cell of occupiedCells(this.grid)) {
      const p = hexToPixel(cell.row, cell.col, r, this.layout.originX, this.layout.originY);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < thresh && d < bestD) {
        bestD = d;
        best = { row: cell.row, col: cell.col };
      }
    }
    return best;
  }

  private noteMiss(): void {
    this.missStreak += 1;
    if (this.missStreak < 3) return;
    const line = teaseForMiss(this.missStreak);
    this.toast = line;
    this.toastKey += 1;
    this.toastT = 2.7;
    this.praise = line;
    this.hudDirty = true;
  }

  private land(hit: { row: number; col: number } | null): void {
    const shot = this.shot;
    if (!shot) return;
    const cell = findSnapCell(
      this.grid,
      shot.x,
      shot.y,
      this.layout.r,
      this.layout.originX,
      this.layout.originY,
      hit,
    );
    this.shot = null;
    if (!cell || this.grid[cell.row][cell.col] !== null) {
      this.lose();
      return;
    }
    const hitColor = hit ? this.grid[hit.row][hit.col] : null;
    this.grid[cell.row][cell.col] = shot.color;
    this.specials[cell.row][cell.col] = shot.special;
    sfxSnap();
    const result = collectPops(this.grid, this.specials, cell, shot.special, hitColor);
    if (result.cells.length) {
      this.missStreak = 0;
      this.resolveMatches(result);
    } else {
      this.noteMiss();
      if (this.crossedDanger()) {
        this.lose();
        return;
      }
      this.shotsLeft -= 1;
      if (this.shotsLeft <= 0) this.startDrop();
      else this.phase = "lock";
      this.lockT = 0.08;
      this.recolorIfNeeded();
    }
    this.hudDirty = true;
  }

  private resolveMatches(result: {
    cells: { row: number; col: number }[];
    heart: boolean;
    hourglass: boolean;
    anchor: boolean;
    kinds: SpecialKind[];
  }): void {
    const matches = result.cells;
    this.combo += 1;
    const hitColor = this.grid[matches[0].row][matches[0].col] ?? 0;
    const gridCopy = cloneGrid(this.grid);
    const specialCopy = cloneSpecials(this.specials);
    for (const c of matches) {
      gridCopy[c.row][c.col] = null;
      specialCopy[c.row][c.col] = null;
    }
    const floating = findFloating(gridCopy);
    const total = matches.length + floating.length;
    const juice = juiceFor(total, this.combo, result.kinds.length);
    const specialBonus = result.kinds.length * SCORE_SPECIAL * this.combo;
    const popScore = matches.length * SCORE_POP * this.combo + specialBonus;
    const fallScore = floating.length * SCORE_FALL * this.combo;
    this.score += popScore + fallScore;
    if (this.score > this.best) {
      this.best = this.score;
      writeSave({ version: 1, best: this.best, muted: this.muted });
    }

    const centroid = { x: 0, y: 0 };
    for (const c of matches) {
      const p = hexToPixel(c.row, c.col, this.layout.r, this.layout.originX, this.layout.originY);
      centroid.x += p.x;
      centroid.y += p.y;
      this.spawnPop(p.x, p.y, this.grid[c.row][c.col] ?? 0, juice);
      this.grid[c.row][c.col] = null;
      this.specials[c.row][c.col] = null;
    }
    centroid.x /= matches.length;
    centroid.y /= matches.length;
    if (total > 3) {
      const line = result.kinds.length
        ? praiseForSpecial(result.kinds[0])
        : praiseForPop(matches.length, floating.length, this.combo);
      this.praise = line;
      this.toast = line;
      this.toastKey += 1;
      this.toastT = 2.1;
      this.floats.push({
        x: centroid.x,
        y: centroid.y - this.layout.r * 1.15,
        text: line,
        age: 0,
        life: 1.15,
        kind: "praise",
      });
    }
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.floats.push({
      x: centroid.x,
      y: centroid.y,
      text: `+${popScore}`,
      age: 0,
      life: 0.8,
      kind: "score",
    });
    if (this.combo > 1) {
      this.floats.push({
        x: centroid.x,
        y: centroid.y - this.layout.r * 2.05,
        text: `콤보 x${this.combo}`,
        age: 0,
        life: 0.9,
        kind: "score",
      });
    }

    for (const c of floating) {
      const p = hexToPixel(c.row, c.col, this.layout.r, this.layout.originX, this.layout.originY);
      this.spawnFall(p.x, p.y, this.grid[c.row][c.col] ?? 0);
      this.grid[c.row][c.col] = null;
      this.specials[c.row][c.col] = null;
    }
    if (floating.length) {
      this.score += 0;
      this.floats.push({
        x: centroid.x,
        y: centroid.y + this.layout.r * 0.9,
        text: `낙하 +${fallScore}`,
        age: 0,
        life: 0.85,
        kind: "score",
      });
      sfxFall(floating.length);
    }

    sfxPop(this.combo);
    if (result.kinds.length) sfxSpecial(result.kinds[0]);
    this.addTrauma(juice.trauma);
    this.hitstop = juice.hitstop;
    this.flash = Math.min(1, this.flash + juice.flash);
    this.punch = juice.punch;
    const pal = BUBBLE_COLORS[hitColor] ?? BUBBLE_COLORS[0];
    for (let i = 0; i < juice.waves; i++) {
      this.shockwaves.push({
        x: centroid.x,
        y: centroid.y,
        age: -i * 0.05,
        life: juice.waveLife + i * 0.08,
        color: pal?.light ?? "#ffffff",
      });
    }
    if (this.reducedMotion) {
      this.hitstop = 0;
      this.flash = 0;
      this.punch = 0;
    }

    if (isEmpty(this.grid)) {
      const bonus = SCORE_CLEAR * this.level;
      this.score += bonus;
      this.lastClearBonus = bonus;
      if (this.score > this.best) {
        this.best = this.score;
        writeSave({ version: 1, best: this.best, muted: this.muted });
      }
      this.burstConfetti();
      sfxWin();
      this.praise = praiseForClear(this.level, this.shotsLeft, this.dropEvery, this.maxCombo);
      this.overlay = "clear";
      this.phase = "ready";
      this.hudDirty = true;
      return;
    }

    this.recolorIfNeeded();
    if (result.heart) {
      this.shotsLeft = this.dropEvery;
      if (this.crossedDanger() && this.ceilingDrop <= 0) {
        this.lose();
        return;
      }
      if (this.ceilingDrop > 0) this.startLift();
      else {
        this.phase = "lock";
        this.lockT = POP_LOCK;
      }
      this.hudDirty = true;
      return;
    }
    if (result.anchor) {
      if (this.crossedDanger()) {
        this.lose();
        return;
      }
      this.startDrop();
      this.hudDirty = true;
      return;
    }
    if (this.level > 2) this.shotsLeft -= 1;
    if (result.hourglass) this.shotsLeft = Math.max(0, this.shotsLeft - 2);
    if (this.crossedDanger()) {
      this.lose();
      return;
    }
    if (this.shotsLeft <= 0) this.startDrop();
    else {
      this.phase = "lock";
      this.lockT = POP_LOCK;
    }
    this.hudDirty = true;
  }

  private startDrop(): void {
    this.shotsLeft = this.dropEvery;
    this.ceilingFrom = this.ceilingDrop;
    this.ceilingTo = this.ceilingDrop + 1;
    this.ceilingT = 0;
    this.phase = "dropping";
    this.addTrauma(0.4);
    sfxDrop();
    this.hudDirty = true;
  }

  private startLift(): void {
    this.ceilingFrom = this.ceilingDrop;
    this.ceilingTo = this.ceilingDrop - 1;
    this.ceilingT = 0;
    this.phase = "dropping";
    this.hudDirty = true;
  }

  private crossedDanger(): boolean {
    const y = lowestBubbleY(this.grid, this.layout.r, this.layout.originY);
    if (!Number.isFinite(y)) return false;
    return y + this.layout.r >= this.layout.dangerY;
  }

  private lose(): void {
    this.overlay = "over";
    this.phase = "ready";
    this.shot = null;
    const isBest = this.score > 0 && this.score >= this.best;
    if (this.score > this.best) {
      this.best = this.score;
      writeSave({ version: 1, best: this.best, muted: this.muted });
    }
    this.praise = praiseForOver(this.level, this.score, isBest);
    sfxLose();
    this.addTrauma(0.7);
    this.hudDirty = true;
  }

  private recolorIfNeeded(): void {
    const pool = presentPlayColors(this.grid, this.specials);
    if (!pool.length) return;
    if (this.currentSpecial !== "rainbow" && !pool.includes(this.currentColor)) {
      this.currentColor = pool[0];
    }
    if (this.nextSpecial !== "rainbow" && !pool.includes(this.nextColor)) {
      this.nextColor = pool[pool.length - 1];
    }
  }

  private spawnPop(x: number, y: number, color: number, juice: JuiceFeel): void {
    this.pops.push({ x, y, color, age: 0, life: juice.popLife });
    const pal = BUBBLE_COLORS[color] ?? BUBBLE_COLORS[0];
    for (let i = 0; i < juice.shards; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = juice.speed * (0.45 + Math.random());
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 1.4 + Math.random() * juice.shardSize,
        color: i % 3 === 0 ? "#ffffff" : pal.light,
        age: 0,
        life: juice.popLife * (0.7 + Math.random() * 0.7),
      });
    }
    for (let i = 0; i < juice.sparks; i++) {
      const a = (i / Math.max(1, juice.sparks)) * Math.PI * 2 + Math.random() * 0.3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * (juice.speed * 0.9 + Math.random() * 80),
        vy: Math.sin(a) * (juice.speed * 0.9 + Math.random() * 80),
        size: 2.2,
        color: pal.glow,
        age: 0,
        life: juice.popLife * 0.65,
        drag: 3.2,
      });
    }
  }

  private spawnFall(x: number, y: number, color: number): void {
    this.falls.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 80,
      vy: 40 + Math.random() * 40,
      rot: 0,
      vr: (Math.random() - 0.5) * 6,
      color,
      age: 0,
      life: 0.9,
    });
  }

  private burstConfetti(): void {
    for (let i = 0; i < 48; i++) {
      const pal = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
      this.particles.push({
        x: this.layout.cssW * (0.2 + Math.random() * 0.6),
        y: this.layout.cssH * 0.3,
        vx: (Math.random() - 0.5) * 260,
        vy: -80 - Math.random() * 220,
        size: 2 + Math.random() * 3.5,
        color: pal.base,
        age: 0,
        life: 0.9 + Math.random() * 0.5,
      });
    }
  }

  private addTrauma(v: number): void {
    if (this.reducedMotion) return;
    this.trauma = Math.min(1, this.trauma + v);
  }

  private updateFx(dt: number): void {
    for (const p of this.particles) {
      p.age += dt;
      const drag = p.drag ?? 0;
      if (drag) {
        p.vx *= Math.max(0, 1 - drag * dt);
        p.vy *= Math.max(0, 1 - drag * dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (drag ? 80 : 420) * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    for (const p of this.pops) p.age += dt;
    this.pops = this.pops.filter((p) => p.age < p.life);
    for (const w of this.shockwaves) w.age += dt;
    this.shockwaves = this.shockwaves.filter((w) => w.age < w.life);
    for (const f of this.falls) {
      f.age += dt;
      f.vy += 980 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
    }
    this.falls = this.falls.filter((f) => f.age < f.life);
    for (const f of this.floats) {
      f.age += dt;
      f.y -= 28 * dt;
    }
    this.floats = this.floats.filter((f) => f.age < f.life);
  }

  private updateDeco(dt: number): void {
    for (const d of this.deco) {
      d.y -= d.vy * dt;
      if (d.y < -40) {
        d.y = this.layout.cssH + 40;
        d.x = Math.random() * this.layout.cssW;
      }
    }
  }

  private seedDeco(): void {
    this.deco = Array.from({ length: 16 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 700,
      r: 8 + Math.random() * 18,
      color: Math.floor(Math.random() * 6),
      a: 0.18 + Math.random() * 0.28,
      vy: 12 + Math.random() * 22,
    }));
  }

  private rebuildPath(): void {
    if (this.overlay !== "playing" || this.phase === "flying") {
      this.path = [];
      return;
    }
    const r = this.layout.r;
    let x = this.layout.shooterX + Math.sin(this.aim) * r * 1.55;
    let y = this.layout.shooterY - Math.cos(this.aim) * r * 1.55;
    let vx = Math.sin(this.aim);
    let vy = -Math.cos(this.aim);
    const pts: Array<{ x: number; y: number }> = [];
    const step = r * 0.42;
    for (let i = 0; i < 64; i++) {
      x += vx * step;
      y += vy * step;
      if (x - r <= this.layout.leftWall) {
        x = this.layout.leftWall + r;
        vx = Math.abs(vx);
      } else if (x + r >= this.layout.rightWall) {
        x = this.layout.rightWall - r;
        vx = -Math.abs(vx);
      }
      if (y - r <= this.layout.ceilingY) break;
      if (this.hitBubble(x, y, r)) break;
      if (i % 1 === 0) pts.push({ x, y });
    }
    this.path = pts;
  }

  private draw(): void {
    const shake = this.trauma * this.trauma;
    const t = this.time * 22;
    const shakeX = this.reducedMotion ? 0 : Math.sin(t * 1.7) * 11 * shake;
    const shakeY = this.reducedMotion ? 0 : Math.cos(t * 1.9) * 9 * shake;
    const low = lowestBubbleY(this.grid, this.layout.r, this.layout.originY);
    const dangerPulse =
      Number.isFinite(low) && low + this.layout.r * 2.4 > this.layout.dangerY
        ? 0.5 + 0.5 * Math.sin(this.time * 8)
        : 0;
    renderFrame(this.ctx, {
      grid: this.grid,
      specials: this.specials,
      layout: this.layout,
      shot: this.shot,
      aimAngle: this.aim,
      currentColor: this.currentColor,
      nextColor: this.nextColor,
      currentSpecial: this.currentSpecial,
      nextSpecial: this.nextSpecial,
      particles: this.particles,
      pops: this.pops,
      falls: this.falls,
      floats: this.floats,
      path: this.path,
      ceilingDrop: this.ceilingDrop,
      ceilingAnim: this.ceilingT,
      shakeX,
      shakeY,
      time: this.time,
      attract: this.overlay === "title",
      deco: this.deco,
      reducedMotion: this.reducedMotion,
      dangerPulse,
      shockwaves: this.shockwaves,
      flash: this.reducedMotion ? 0 : this.flash,
      punch: this.reducedMotion ? 0 : this.punch,
    });
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    const cssW = Math.max(1, parent?.clientWidth ?? window.innerWidth);
    const cssH = Math.max(1, parent?.clientHeight ?? window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = computeLayout(cssW, cssH, this.ceilingDrop);
    clearSpriteCache();
    this.rebuildPath();
  }

  private canvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.layout.cssW,
      y: ((e.clientY - rect.top) / rect.height) * this.layout.cssH,
    };
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.aiming && this.aimPointerId !== null && e.pointerId !== this.aimPointerId) return;
    const p = this.canvasPoint(e);
    this.pointerAimX = p.x;
    this.pointerAimY = p.y;
    this.hasPointer = true;
    if (this.aiming) this.rebuildPath();
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / already captured */
    }
    const p = this.canvasPoint(e);
    this.pointerAimX = p.x;
    this.pointerAimY = p.y;
    this.hasPointer = true;
    if (this.overlay !== "playing") return;
    this.aiming = true;
    this.aimPointerId = e.pointerId;
    this.rebuildPath();
  }

  private onPointerUp(e: PointerEvent): void {
    const wasAiming = this.aiming && this.aimPointerId === e.pointerId;
    this.endAimPointer(e.pointerId);
    if (wasAiming && this.overlay === "playing") this.fire();
  }

  private onPointerCancel(e: PointerEvent): void {
    this.endAimPointer(e.pointerId);
  }

  private endAimPointer(pointerId: number): void {
    if (this.aimPointerId !== null && this.aimPointerId !== pointerId) return;
    this.aiming = false;
    this.aimPointerId = null;
    try {
      this.canvas.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (this.overlay === "title" && (e.code === "Enter" || e.code === "Space")) {
      this.play();
    } else if (this.overlay === "paused" && e.code === "Enter") {
      this.resume();
    } else if (this.overlay === "clear" && e.code === "Enter") {
      this.nextLevel();
    } else if (this.overlay === "over" && e.code === "Enter") {
      this.play();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private hud(): HudState {
    return {
      score: this.score,
      best: this.best,
      level: this.level,
      shotsLeft: this.shotsLeft,
      dropEvery: this.dropEvery,
      combo: this.combo,
      muted: this.muted,
      overlay: this.overlay,
      lastClearBonus: this.lastClearBonus,
      praise: this.praise,
      toast: this.toast,
      toastKey: this.toastKey,
      helpAvailable: this.helpAvailable,
      hint: this.hint,
      hintKey: this.hintKey,
    };
  }

  private emitHud(): void {
    this.hudDirty = false;
    this.handlers.onHud(this.hud());
  }

  private exposeDebug(): void {
    window.__bubblePop = {
      getHud: () => this.hud(),
      play: (level?: number) => this.play(level ?? 1),
      fire: () => this.fire(),
      aim: (deg: number) => {
        this.aim = (deg * Math.PI) / 180;
        this.hasPointer = false;
        this.rebuildPath();
      },
      score: () => this.score,
      overlay: () => this.overlay,
      phase: () => this.phase,
      aiming: () => this.aiming,
      giveSpecial: (kind: SpecialKind) => {
        this.currentSpecial = kind;
        this.announceSpecial(kind);
        this.rebuildPath();
      },
      useHelp: () => this.useHelp(),
      plantSpecials: () => {
        const kinds: SpecialKind[] = [...SPECIAL_KINDS];
        let i = 0;
        for (let row = 0; row < this.grid.length && i < kinds.length; row++) {
          for (let col = 0; col < this.grid[row].length && i < kinds.length; col++) {
            if (this.grid[row][col] === null) continue;
            this.specials[row][col] = kinds[i++];
          }
        }
      },
    };
  }
}

declare global {
  interface Window {
    __bubblePop?: {
      getHud: () => HudState;
      play: (level?: number) => void;
      fire: () => void;
      aim: (deg: number) => void;
      score: () => number;
      overlay: () => Overlay;
      phase: () => string;
      aiming: () => boolean;
      giveSpecial: (kind: SpecialKind) => void;
      useHelp: () => void;
      plantSpecials: () => void;
    };
  }
}


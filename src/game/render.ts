import { BUBBLE_COLORS, SQRT3, TAU } from "./constants";
import { occupiedCells, hexToPixel, type Grid } from "./grid";
import type { Layout } from "./layout";
import type { SpecialGrid, SpecialKind } from "./specials";
import type { Particle, PopFx, FallFx, FloatText, Shot, Shockwave } from "./types";

export type DrawWorld = {
  grid: Grid;
  specials: SpecialGrid;
  layout: Layout;
  shot: Shot | null;
  aimAngle: number;
  currentColor: number;
  nextColor: number;
  currentSpecial: SpecialKind | null;
  nextSpecial: SpecialKind | null;
  particles: Particle[];
  pops: PopFx[];
  falls: FallFx[];
  floats: FloatText[];
  path: Array<{ x: number; y: number }>;
  ceilingDrop: number;
  ceilingAnim: number;
  shakeX: number;
  shakeY: number;
  time: number;
  attract: boolean;
  deco: Array<{ x: number; y: number; r: number; color: number; a: number }>;
  reducedMotion: boolean;
  dangerPulse: number;
  shockwaves: Shockwave[];
  flash: number;
  punch: number;
};

const spriteCache = new Map<string, HTMLCanvasElement>();

function spriteKey(color: number, r: number): string {
  return `${color}:${r.toFixed(2)}`;
}

function bubbleSprite(color: number, r: number): HTMLCanvasElement {
  const key = spriteKey(color, r);
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const pal = BUBBLE_COLORS[color] ?? BUBBLE_COLORS[0];
  const pad = Math.ceil(r * 0.48);
  const size = Math.ceil(r * 2 + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.beginPath();
  ctx.ellipse(r * 0.06, r * 0.42, r * 0.9, r * 0.3, 0, 0, TAU);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();

  const body = ctx.createRadialGradient(-r * 0.34, -r * 0.4, r * 0.04, r * 0.12, r * 0.18, r * 1.12);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.12, pal.light);
  body.addColorStop(0.42, pal.base);
  body.addColorStop(0.78, pal.dark);
  body.addColorStop(1, "#14080c");
  ctx.fillStyle = body;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  const core = ctx.createRadialGradient(r * 0.2, r * 0.26, r * 0.04, r * 0.2, r * 0.26, r * 0.72);
  core.addColorStop(0, pal.dark);
  core.addColorStop(0.55, pal.base);
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(r * 0.18, r * 0.22, r * 0.7, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  const rim = ctx.createRadialGradient(0, 0, r * 0.62, 0, 0, r);
  rim.addColorStop(0, "rgba(255,255,255,0)");
  rim.addColorStop(0.72, "rgba(255,255,255,0)");
  rim.addColorStop(0.9, pal.light);
  rim.addColorStop(1, pal.dark);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.34, r * 0.2, -0.55, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-r * 0.16, -r * 0.48, r * 0.12, r * 0.07, -0.4, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.14, r * 0.07, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0.35, 1.15);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.4, 0, TAU);
  ctx.strokeStyle = pal.light;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(1.1, r * 0.055);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = Math.max(0.8, r * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, -2.4, -0.4);
  ctx.stroke();
  ctx.restore();

  spriteCache.set(key, canvas);
  if (spriteCache.size > 40) {
    const first = spriteCache.keys().next().value;
    if (first) spriteCache.delete(first);
  }
  return canvas;
}

export function clearSpriteCache(): void {
  spriteCache.clear();
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: number,
  scale = 1,
  alpha = 1,
  special: SpecialKind | null = null,
  time = 0,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (special === "rainbow") {
    drawRainbowBubble(ctx, x, y, r * scale, time);
  } else {
    const sprite = bubbleSprite(color, r);
    const w = sprite.width * scale;
    const h = sprite.height * scale;
    ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
    if (special) drawSpecialMark(ctx, x, y, r * scale, special, time);
  }
  ctx.restore();
}

function drawRainbowBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(r * 0.06, r * 0.42, r * 0.9, r * 0.3, 0, 0, TAU);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  const hues = [0, 32, 58, 145, 210, 280];
  const spin = time * 1.4;
  for (let i = 0; i < hues.length; i++) {
    const a0 = spin + (i / hues.length) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, a0, a0 + TAU / hues.length + 0.08);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hues[i]} 82% 58%)`;
    ctx.fill();
  }

  const shade = ctx.createRadialGradient(-r * 0.3, -r * 0.36, r * 0.04, r * 0.14, r * 0.2, r * 1.1);
  shade.addColorStop(0, "rgba(255,255,255,0.72)");
  shade.addColorStop(0.38, "rgba(255,255,255,0.08)");
  shade.addColorStop(0.78, "rgba(0,0,0,0.18)");
  shade.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.38, r * 0.3, r * 0.18, -0.5, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-r * 0.16, -r * 0.46, r * 0.1, r * 0.06, -0.4, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
  ctx.restore();
}

function drawSpecialMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  special: SpecialKind,
  time: number,
) {
  const pulse = 0.96 + Math.sin(time * 6) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse * 1.34, pulse * 1.34);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.max(3, r * 0.22);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (special === "bomb") {
    ctx.fillStyle = "rgba(18,12,14,0.92)";
    ctx.beginPath();
    ctx.arc(0, r * 0.04, r * 0.42, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#ffb347";
    ctx.lineWidth = Math.max(2.2, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(r * 0.12, -r * 0.26);
    ctx.quadraticCurveTo(r * 0.34, -r * 0.5, r * 0.22, -r * 0.6);
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(r * 0.24, -r * 0.62, r * 0.13, 0, TAU);
    ctx.fill();
  } else if (special === "star") {
    ctx.fillStyle = "#ffe08a";
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(1.8, r * 0.08);
    starPath(ctx, 0, 0, r * 0.52, r * 0.22, 5);
    ctx.fill();
    ctx.stroke();
  } else if (special === "heart") {
    ctx.fillStyle = "#ff5f92";
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = Math.max(1.8, r * 0.08);
    heartPath(ctx, 0, r * 0.08, r * 0.44);
    ctx.fill();
    ctx.stroke();
  } else if (special === "lightning") {
    ctx.fillStyle = "#ffe566";
    ctx.strokeStyle = "rgba(40,30,0,0.55)";
    ctx.lineWidth = Math.max(1.8, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.5);
    ctx.lineTo(-r * 0.16, r * 0.02);
    ctx.lineTo(r * 0.08, r * 0.02);
    ctx.lineTo(-r * 0.12, r * 0.52);
    ctx.lineTo(r * 0.22, -r * 0.06);
    ctx.lineTo(0, -r * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === "laser") {
    ctx.fillStyle = "#5ad0ff";
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = Math.max(1.8, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.52);
    ctx.lineTo(r * 0.16, -r * 0.08);
    ctx.lineTo(r * 0.06, -r * 0.08);
    ctx.lineTo(r * 0.06, r * 0.52);
    ctx.lineTo(-r * 0.06, r * 0.52);
    ctx.lineTo(-r * 0.06, -r * 0.08);
    ctx.lineTo(-r * 0.16, -r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === "paint") {
    ctx.fillStyle = "#b07cff";
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.28, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.22, r * 0.15, r * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(-r * 0.28, r * 0.26, r * 0.12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#5ad0ff";
    ctx.beginPath();
    ctx.arc(r * 0.3, r * 0.22, r * 0.11, 0, TAU);
    ctx.fill();
  } else if (special === "plus") {
    ctx.fillStyle = "#7ae0ff";
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = Math.max(1.8, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, -r * 0.5);
    ctx.lineTo(r * 0.13, -r * 0.5);
    ctx.lineTo(r * 0.13, -r * 0.13);
    ctx.lineTo(r * 0.5, -r * 0.13);
    ctx.lineTo(r * 0.5, r * 0.13);
    ctx.lineTo(r * 0.13, r * 0.13);
    ctx.lineTo(r * 0.13, r * 0.5);
    ctx.lineTo(-r * 0.13, r * 0.5);
    ctx.lineTo(-r * 0.13, r * 0.13);
    ctx.lineTo(-r * 0.5, r * 0.13);
    ctx.lineTo(-r * 0.5, -r * 0.13);
    ctx.lineTo(-r * 0.13, -r * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === "magnet") {
    ctx.strokeStyle = "#ff3d55";
    ctx.lineWidth = Math.max(3.2, r * 0.2);
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.32, Math.PI * 0.12, Math.PI * 0.88, true);
    ctx.stroke();
    ctx.strokeStyle = "#2d86e8";
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.32, Math.PI * 1.12, Math.PI * 1.88, true);
    ctx.stroke();
    ctx.fillStyle = "#e8eef6";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.2, r * 0.1, 0, TAU);
    ctx.arc(r * 0.28, -r * 0.2, r * 0.1, 0, TAU);
    ctx.fill();
  } else if (special === "lock") {
    ctx.fillStyle = "rgba(28, 24, 20, 0.95)";
    ctx.beginPath();
    ctx.rect(-r * 0.28, -r * 0.02, r * 0.56, r * 0.42);
    ctx.fill();
    ctx.strokeStyle = "#f0d8a8";
    ctx.lineWidth = Math.max(2.2, r * 0.11);
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.2, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(0, r * 0.16, r * 0.08, 0, TAU);
    ctx.fill();
  } else if (special === "ink") {
    ctx.fillStyle = "rgba(10, 8, 20, 0.95)";
    ctx.beginPath();
    ctx.arc(-r * 0.1, r * 0.04, r * 0.28, 0, TAU);
    ctx.arc(r * 0.18, r * 0.12, r * 0.18, 0, TAU);
    ctx.arc(0, -r * 0.2, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8a7cff";
    ctx.beginPath();
    ctx.arc(-r * 0.04, 0, r * 0.09, 0, TAU);
    ctx.fill();
  } else if (special === "hourglass") {
    ctx.fillStyle = "#f0c84a";
    ctx.strokeStyle = "rgba(40,28,0,0.55)";
    ctx.lineWidth = Math.max(1.8, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.4);
    ctx.lineTo(r * 0.26, -r * 0.4);
    ctx.lineTo(r * 0.05, 0);
    ctx.lineTo(r * 0.26, r * 0.4);
    ctx.lineTo(-r * 0.26, r * 0.4);
    ctx.lineTo(-r * 0.05, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === "anchor") {
    ctx.fillStyle = "#c5d0dc";
    ctx.strokeStyle = "rgba(20,24,32,0.55)";
    ctx.lineWidth = Math.max(1.8, r * 0.07);
    ctx.beginPath();
    ctx.arc(0, -r * 0.26, r * 0.15, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(-r * 0.07, -r * 0.22, r * 0.14, r * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, r * 0.26);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.08, -r * 0.36, r * 0.4);
    ctx.lineTo(-r * 0.22, r * 0.26);
    ctx.lineTo(0, r * 0.42);
    ctx.lineTo(r * 0.22, r * 0.26);
    ctx.lineTo(r * 0.36, r * 0.4);
    ctx.quadraticCurveTo(r * 0.4, r * 0.08, 0, r * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function starPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
  points: number,
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.7);
  ctx.bezierCurveTo(x - s * 1.1, y + s * 0.05, x - s * 0.7, y - s * 0.85, x, y - s * 0.28);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 0.85, x + s * 1.1, y + s * 0.05, x, y + s * 0.7);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, world: DrawWorld) {
  const { layout, time } = world;
  const w = layout.cssW;
  const h = layout.cssH;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0c1422");
  g.addColorStop(0.55, "#070b14");
  g.addColorStop(1, "#05080e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 3; i++) {
    const y = ((time * (8 + i * 5) + i * 120) % (h + 160)) - 80;
    const caustic = ctx.createLinearGradient(0, y, 0, y + 90);
    caustic.addColorStop(0, "rgba(80,140,180,0)");
    caustic.addColorStop(0.5, "rgba(110,170,200,0.07)");
    caustic.addColorStop(1, "rgba(80,140,180,0)");
    ctx.fillStyle = caustic;
    ctx.fillRect(0, y, w, 90);
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.38, h * 0.12, w * 0.5, h * 0.45, h * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawFrame(ctx: CanvasRenderingContext2D, world: DrawWorld) {
  const { layout } = world;
  const left = layout.leftWall;
  const right = layout.rightWall;
  const top = layout.ceilingY;
  const bottom = layout.dangerY;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(left, top, right - left, bottom - top);

  ctx.strokeStyle = "rgba(232,238,246,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, layout.shooterY + layout.r * 1.4);
  ctx.moveTo(right, top);
  ctx.lineTo(right, layout.shooterY + layout.r * 1.4);
  ctx.stroke();

  const barH = Math.max(10, layout.r * 0.42);
  const barY = top - barH;
  const bar = ctx.createLinearGradient(0, barY, 0, top);
  bar.addColorStop(0, "#2a3444");
  bar.addColorStop(1, "#161c26");
  ctx.fillStyle = bar;
  ctx.fillRect(left - 4, barY, right - left + 8, barH + 2);

  ctx.fillStyle = "#3a4558";
  const teeth = Math.floor((right - left) / (layout.r * 0.7));
  for (let i = 0; i < teeth; i++) {
    const x = left + (i + 0.5) * ((right - left) / teeth);
    ctx.beginPath();
    ctx.moveTo(x - 4, top);
    ctx.lineTo(x, top + 7);
    ctx.lineTo(x + 4, top);
    ctx.fill();
  }

  const pulse = 0.35 + world.dangerPulse * 0.65;
  ctx.strokeStyle = `rgba(212,90,90,${0.28 + pulse * 0.35})`;
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function pathColor(world: DrawWorld): string {
  if (world.currentSpecial === "rainbow") return "#fff4d6";
  if (world.currentSpecial === "bomb") return "#ffb347";
  if (world.currentSpecial === "star") return "#ffe08a";
  if (world.currentSpecial === "heart") return "#ff9ab8";
  if (world.currentSpecial === "lightning") return "#ffe566";
  if (world.currentSpecial === "laser") return "#7ad0ff";
  if (world.currentSpecial === "paint") return "#b07cff";
  if (world.currentSpecial === "plus") return "#9be7ff";
  if (world.currentSpecial === "magnet") return "#ff8a94";
  if (world.currentSpecial === "lock") return "#d8c4a0";
  if (world.currentSpecial === "ink") return "#7a6cff";
  if (world.currentSpecial === "hourglass") return "#e8c56b";
  if (world.currentSpecial === "anchor") return "#9aa8b8";
  return (BUBBLE_COLORS[world.currentColor] ?? BUBBLE_COLORS[0]).light;
}

function drawPath(ctx: CanvasRenderingContext2D, world: DrawWorld) {
  if (world.path.length < 2 || world.attract) return;
  const fill = pathColor(world);
  ctx.save();
  for (let i = 0; i < world.path.length; i++) {
    const p = world.path[i];
    const t = i / world.path.length;
    ctx.globalAlpha = (1 - t) * 0.75;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.6, world.layout.r * 0.12 * (1 - t * 0.4)), 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.restore();
}

function drawShooter(ctx: CanvasRenderingContext2D, world: DrawWorld) {
  const { layout, aimAngle } = world;
  const x = layout.shooterX;
  const y = layout.shooterY;
  const r = layout.r;

  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 1.55, 0, TAU);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();

  const well = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.45);
  well.addColorStop(0, "#1c2430");
  well.addColorStop(1, "#0e131a");
  ctx.beginPath();
  ctx.arc(0, r * 0.1, r * 1.4, 0, TAU);
  ctx.fillStyle = well;
  ctx.fill();
  ctx.strokeStyle = "rgba(232,238,246,0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.rotate(aimAngle);
  const barrel = ctx.createLinearGradient(-r * 0.38, 0, r * 0.38, 0);
  barrel.addColorStop(0, "#1a222c");
  barrel.addColorStop(0.5, "#3a4658");
  barrel.addColorStop(1, "#1a222c");
  ctx.fillStyle = barrel;
  ctx.beginPath();
  ctx.roundRect(-r * 0.38, -r * 2.15, r * 0.76, r * 1.7, r * 0.2);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,238,246,0.2)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  if (!world.attract && world.shot === null) {
    const mouthX = Math.sin(aimAngle) * r * 1.55;
    const mouthY = -Math.cos(aimAngle) * r * 1.55;
    drawBubble(ctx, mouthX, mouthY, r * 0.92, world.currentColor, 1, 1, world.currentSpecial, world.time);
  }

  ctx.restore();

  const nextX = layout.leftWall + r * 1.15;
  const nextY = layout.shooterY + r * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.font = `600 ${Math.max(10, r * 0.38)}px "Noto Sans KR", sans-serif`;
  ctx.fillStyle = "#8b97a8";
  ctx.textAlign = "center";
  ctx.fillText("NEXT", nextX, nextY - r * 1.15);
  ctx.restore();
  drawBubble(ctx, nextX, nextY, r * 0.62, world.nextColor, 1, 0.95, world.nextSpecial, world.time);
}

function drawGrid(ctx: CanvasRenderingContext2D, world: DrawWorld) {
  const { layout, grid, specials } = world;
  for (const cell of occupiedCells(grid)) {
    const p = hexToPixel(cell.row, cell.col, layout.r, layout.originX, layout.originY);
    drawBubble(ctx, p.x, p.y, layout.r, cell.color, 1, 1, specials[cell.row][cell.col], world.time);
  }
}

function drawFx(ctx: CanvasRenderingContext2D, world: DrawWorld) {
  const { layout } = world;
  for (const wave of world.shockwaves) {
    const t = Math.min(1, wave.age / wave.life);
    const radius = layout.r * (0.6 + t * 3.4);
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.7;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = Math.max(2, layout.r * 0.16 * (1 - t));
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  for (const pop of world.pops) {
    const t = Math.min(1, pop.age / pop.life);
    const scale = 1 + t * 0.7;
    const alpha = 1 - t;
    if (t < 0.35) {
      ctx.save();
      ctx.globalAlpha = (1 - t / 0.35) * 0.85;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, layout.r * (1.05 + t * 0.55), 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    drawBubble(ctx, pop.x, pop.y, layout.r, pop.color, scale, alpha);
  }
  for (const fall of world.falls) {
    const alpha = Math.max(0, 1 - fall.age / fall.life);
    ctx.save();
    ctx.translate(fall.x, fall.y);
    ctx.rotate(fall.rot);
    drawBubble(ctx, 0, 0, layout.r, fall.color, 1, alpha);
    ctx.restore();
  }
  for (const p of world.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.textAlign = "center";
  for (const f of world.floats) {
    const t = Math.min(1, f.age / f.life);
    ctx.globalAlpha = 1 - t;
    if (f.kind === "praise") {
      ctx.font = `700 ${Math.max(18, layout.r * 0.82)}px "Jua", "Noto Sans KR", sans-serif`;
      ctx.fillStyle = "#e8eef6";
    } else {
      ctx.font = `700 ${Math.max(14, layout.r * 0.58)}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = "#e8eef6";
    }
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

export function renderFrame(ctx: CanvasRenderingContext2D, world: DrawWorld): void {
  const { layout } = world;
  ctx.save();
  ctx.translate(layout.cssW / 2, layout.cssH / 2);
  const zoom = 1 + world.punch;
  ctx.scale(zoom, zoom);
  ctx.translate(-layout.cssW / 2 + world.shakeX, -layout.cssH / 2 + world.shakeY);
  drawBackground(ctx, world);

  if (world.attract) {
    for (const d of world.deco) {
      drawBubble(ctx, d.x, d.y, d.r, d.color, 1, d.a);
    }
  }

  drawFrame(ctx, world);
  if (!world.attract) drawGrid(ctx, world);
  drawPath(ctx, world);
  if (world.shot) {
    drawBubble(
      ctx,
      world.shot.x,
      world.shot.y,
      world.layout.r,
      world.shot.color,
      1,
      1,
      world.shot.special,
      world.time,
    );
  }
  drawShooter(ctx, world);
  drawFx(ctx, world);
  ctx.restore();

  if (world.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = world.flash * 0.22;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, layout.cssW, layout.cssH);
    ctx.restore();
  }
}

export { SQRT3 };

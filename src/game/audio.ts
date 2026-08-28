import type { SpecialKind } from "./specials";

type Bus = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
};

let bus: Bus | null = null;
let muted = false;
let noiseBuffer: AudioBuffer | null = null;

function ensure(): Bus | null {
  if (typeof window === "undefined") return null;
  if (bus) return bus;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor({ latencyHint: "interactive" });
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  sfx.gain.value = 0.7;
  master.gain.value = muted ? 0 : 0.85;
  sfx.connect(master);
  master.connect(ctx.destination);
  noiseBuffer = makeNoise(ctx);
  bus = { ctx, master, sfx };
  return bus;
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function unlockAudio(): void {
  const b = ensure();
  if (!b) return;
  if (b.ctx.state === "suspended") void b.ctx.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
  if (!bus) return;
  bus.master.gain.setTargetAtTime(value ? 0 : 0.85, bus.ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

function envGain(node: AudioNode, dest: AudioNode, t: number, peak: number, attack: number, release: number) {
  const g = bus!.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  node.connect(g);
  g.connect(dest);
  return g;
}

function tone(freq: number, dur: number, type: OscillatorType, peak: number, slide = 0) {
  const b = bus;
  if (!b || muted) return;
  const t = b.ctx.currentTime;
  const osc = b.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  envGain(osc, b.sfx, t, peak, 0.008, dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur: number, peak: number, freq = 900, q = 2) {
  const b = bus;
  if (!b || muted || !noiseBuffer) return;
  const t = b.ctx.currentTime;
  const src = b.ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = b.ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter);
  envGain(filter, b.sfx, t, peak, 0.004, dur);
  src.start(t);
  src.stop(t + dur + 0.04);
}

export function sfxShoot(): void {
  tone(420, 0.09, "triangle", 0.12, 280);
  noise(0.05, 0.08, 1800, 1.2);
}

export function sfxBounce(): void {
  tone(620 + Math.random() * 80, 0.04, "square", 0.05);
}

export function sfxPop(combo: number): void {
  const pitch = 480 + Math.min(combo, 8) * 85 + Math.random() * 40;
  tone(92 + Math.random() * 18, 0.1, "sine", 0.26, -40);
  noise(0.09, 0.22, 640, 0.55);
  tone(pitch, 0.11, "triangle", 0.16, -320);
  noise(0.045, 0.14, 2600, 1.5);
}

export function sfxFall(count: number): void {
  tone(280 + count * 12, 0.18, "triangle", 0.1, -140);
}

export function sfxSnap(): void {
  tone(180, 0.05, "sine", 0.08);
}

export function sfxWin(): void {
  const b = bus;
  if (!b || muted) return;
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => {
    const t = b.ctx.currentTime + i * 0.08;
    const osc = b.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    envGain(osc, b.sfx, t, 0.12, 0.01, 0.22);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}

export function sfxLose(): void {
  tone(180, 0.28, "sawtooth", 0.1, -90);
  tone(110, 0.34, "sine", 0.08, -40);
}

export function sfxDrop(): void {
  tone(90, 0.2, "sine", 0.12);
  noise(0.12, 0.08, 300, 0.6);
}

export function sfxSpecial(kind: SpecialKind): void {
  if (kind === "bomb") {
    tone(70, 0.22, "sine", 0.32, -30);
    noise(0.16, 0.28, 420, 0.45);
    tone(180, 0.12, "sawtooth", 0.12, -80);
    return;
  }
  if (kind === "star") {
    tone(740, 0.12, "triangle", 0.16, 220);
    tone(980, 0.16, "sine", 0.12, 160);
    noise(0.06, 0.08, 2800, 1.4);
    return;
  }
  if (kind === "heart") {
    tone(392, 0.12, "sine", 0.14, 40);
    tone(523, 0.16, "triangle", 0.12, 80);
    return;
  }
  if (kind === "lightning") {
    noise(0.1, 0.22, 1800, 0.7);
    tone(980, 0.08, "square", 0.12, -400);
    tone(240, 0.12, "sawtooth", 0.08, -80);
    return;
  }
  if (kind === "laser") {
    tone(880, 0.1, "sawtooth", 0.12, 420);
    tone(1320, 0.12, "square", 0.08, 200);
    noise(0.06, 0.1, 2400, 1.2);
    return;
  }
  if (kind === "paint") {
    tone(330, 0.1, "sine", 0.12, 80);
    tone(440, 0.14, "triangle", 0.1, 60);
    noise(0.08, 0.08, 700, 0.8);
    return;
  }
  if (kind === "lock") {
    tone(180, 0.1, "square", 0.1, -40);
    tone(140, 0.14, "sine", 0.08, -20);
    return;
  }
  if (kind === "ink") {
    noise(0.12, 0.16, 420, 0.6);
    tone(220, 0.14, "triangle", 0.08, -80);
    return;
  }
  if (kind === "hourglass") {
    tone(660, 0.08, "sine", 0.1, -180);
    tone(440, 0.12, "triangle", 0.08, -120);
    return;
  }
  if (kind === "plus") {
    noise(0.08, 0.16, 1600, 0.8);
    tone(920, 0.1, "square", 0.1, 280);
    tone(240, 0.12, "sawtooth", 0.08, -60);
    return;
  }
  if (kind === "magnet") {
    tone(280, 0.1, "sine", 0.14, 80);
    tone(420, 0.14, "triangle", 0.1, 120);
    noise(0.07, 0.08, 900, 0.9);
    return;
  }
  if (kind === "anchor") {
    tone(90, 0.18, "sine", 0.22, -20);
    noise(0.1, 0.14, 280, 0.5);
    tone(140, 0.12, "triangle", 0.08, -40);
    return;
  }
  tone(523, 0.08, "triangle", 0.12, 80);
  tone(659, 0.1, "sine", 0.1, 90);
  tone(784, 0.14, "triangle", 0.1, 120);
}

export function resumeIfNeeded(): void {
  if (!bus) return;
  if (bus.ctx.state === "suspended") void bus.ctx.resume();
}

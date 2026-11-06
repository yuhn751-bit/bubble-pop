export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  stage: number;
};

export type SubmitResult = {
  ok: boolean;
  rank: number | null;
  qualifies: boolean;
  message: string;
};

export type QualifyResult = {
  qualifies: boolean;
  rank: number | null;
};

const NAME_MAX = 12;
export const LIST_LIMIT = 10;
export const SCORE_MAX = 10_000_000;

function stripControls(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) continue;
    out += ch;
  }
  return out;
}

export function sanitizeName(raw: string): string {
  const cleaned = stripControls(raw).replace(/\s+/g, " ").trim();
  const cut = [...cleaned].slice(0, NAME_MAX).join("");
  return cut || "강수림";
}

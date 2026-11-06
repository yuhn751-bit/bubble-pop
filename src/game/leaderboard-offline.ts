import {
  LIST_LIMIT,
  SCORE_MAX,
  sanitizeName,
  type QualifyResult,
  type ScoreRow,
  type SubmitResult,
} from "./leaderboard-shared";

export type { QualifyResult, ScoreRow, SubmitResult };
export { sanitizeName, LIST_LIMIT };

const KEY = "bubble-pop-device-scores";

type Entry = {
  name: string;
  score: number;
  stage: number;
  at: number;
};

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Entry>;
  return (
    typeof row.name === "string" &&
    row.name.length > 0 &&
    Number.isInteger(row.score) &&
    (row.score ?? 0) > 0 &&
    (row.score ?? 0) <= SCORE_MAX &&
    Number.isInteger(row.stage) &&
    (row.stage ?? 0) >= 1 &&
    (row.stage ?? 0) <= 99 &&
    Number.isInteger(row.at)
  );
}

function read(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function write(rows: Entry[]): void {
  if (typeof window === "undefined") return;
  const trimmed = sorted(rows).slice(0, 50);
  window.localStorage.setItem(KEY, JSON.stringify(trimmed));
}

function sorted(rows: Entry[]): Entry[] {
  return [...rows].sort((a, b) => b.score - a.score || a.at - b.at);
}

function toRows(rows: Entry[]): ScoreRow[] {
  return sorted(rows)
    .slice(0, LIST_LIMIT)
    .map((row, index) => ({
      rank: index + 1,
      name: row.name,
      score: row.score,
      stage: row.stage,
    }));
}

export async function listScores(): Promise<ScoreRow[]> {
  return toRows(read());
}

export async function qualifyScore(input: { data: { score: number } }): Promise<QualifyResult> {
  const score = input.data.score;
  if (!Number.isInteger(score) || score <= 0 || score > SCORE_MAX) {
    return { qualifies: false, rank: null };
  }
  const above = read().filter((row) => row.score > score).length;
  const rank = above + 1;
  return { qualifies: rank <= LIST_LIMIT, rank };
}

export async function submitScore(input: {
  data: { name: string; score: number; stage: number };
}): Promise<SubmitResult> {
  const score = input.data.score;
  const stage = input.data.stage;
  if (!Number.isInteger(score) || score <= 0 || score > SCORE_MAX) {
    throw new Error("bad score");
  }
  if (!Number.isInteger(stage) || stage < 1 || stage > 99) {
    throw new Error("bad stage");
  }
  const name = sanitizeName(input.data.name);
  const rows = read();
  const above = rows.filter((row) => row.score > score).length;
  const rank = above + 1;
  if (rank > LIST_LIMIT) {
    return {
      ok: false,
      rank,
      qualifies: false,
      message: "아쉽지만 10위 밖이에요.",
    };
  }
  rows.push({ name, score, stage, at: Date.now() });
  write(rows);
  const placed = toRows(read()).find((row) => row.name === name && row.score === score);
  return {
    ok: true,
    rank: placed?.rank ?? rank,
    qualifies: true,
    message: `이 기기 ${placed?.rank ?? rank}위 등록!`,
  };
}

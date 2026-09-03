import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
const SCORE_MAX = 10_000_000;
export const LIST_LIMIT = 10;

export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  const cut = [...cleaned].slice(0, NAME_MAX).join("");
  return cut || "유수현";
}

async function rankForScore(score: number): Promise<number> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const above = await sql<{ n: number }>`
    select count(*)::int as n from scores where score > ${score}
  `;
  return (above[0]?.n ?? 0) + 1;
}

export const listScores = createServerFn({ method: "GET" }).handler(async (): Promise<ScoreRow[]> => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ name: string; score: number; stage: number }>`
    select name, score, stage
    from scores
    order by score desc, created_at asc
    limit 10
  `;
  return rows.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: Number(row.score),
    stage: Number(row.stage),
  }));
});

export const qualifyScore = createServerFn({ method: "POST" })
  .validator(z.object({ score: z.number().int().min(0).max(SCORE_MAX) }))
  .handler(async ({ data }): Promise<QualifyResult> => {
    if (data.score <= 0) return { qualifies: false, rank: null };
    const rank = await rankForScore(data.score);
    return { qualifies: rank <= LIST_LIMIT, rank };
  });

export const submitScore = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().max(24),
      score: z.number().int().positive().max(SCORE_MAX),
      stage: z.number().int().min(1).max(99),
    }),
  )
  .handler(async ({ data }): Promise<SubmitResult> => {
    const name = sanitizeName(data.name);
    const score = data.score;
    const stage = data.stage;
    const rank = await rankForScore(score);
    if (rank > LIST_LIMIT) {
      return {
        ok: false,
        rank,
        qualifies: false,
        message: "아쉽지만 10위 밖이에요.",
      };
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into scores (name, score, stage)
      values (${name}, ${score}, ${stage})
    `;
    return {
      ok: true,
      rank,
      qualifies: true,
      message: `세계 랭킹 ${rank}위 등록!`,
    };
  });

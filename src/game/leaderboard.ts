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
  message: string;
};

const NAME_MAX = 12;
const SCORE_MAX = 10_000_000;
const LIST_LIMIT = 20;

export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  const cut = [...cleaned].slice(0, NAME_MAX).join("");
  return cut || "유수현";
}

export const listScores = createServerFn({ method: "GET" }).handler(async (): Promise<ScoreRow[]> => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ name: string; score: number; stage: number }>`
    select name, score, stage
    from scores
    order by score desc, created_at asc
    limit ${LIST_LIMIT}
  `;
  return rows.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: Number(row.score),
    stage: Number(row.stage),
  }));
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
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into scores (name, score, stage)
      values (${name}, ${score}, ${stage})
    `;
    const above = await sql<{ n: number }>`
      select count(*)::int as n from scores where score > ${score}
    `;
    const rank = (above[0]?.n ?? 0) + 1;
    return {
      ok: true,
      rank,
      message: rank <= LIST_LIMIT ? `세계 랭킹 ${rank}위!` : `${rank}위예요. 조금 더 높이!`,
    };
  });

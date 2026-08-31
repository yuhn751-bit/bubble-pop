import { Trophy } from "lucide-react";
import type { ScoreRow } from "@/game/leaderboard";
import { cn } from "@/lib/utils";

export function LeaderboardList({
  rows,
  loading,
  error,
  highlightName,
}: {
  rows: ScoreRow[];
  loading: boolean;
  error: string;
  highlightName?: string;
}) {
  if (loading) {
    return <p className="py-6 text-center text-sm text-muted">랭킹을 불러오는 중…</p>;
  }
  if (error) {
    return <p className="py-6 text-center text-sm text-muted">{error}</p>;
  }
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        아직 기록이 없어요.
        <br />
        첫 주인공은 수현이?
      </p>
    );
  }
  return (
    <ol className="flex max-h-64 flex-col gap-1 overflow-y-auto">
      {rows.map((row) => {
        const mine = highlightName !== undefined && row.name === highlightName;
        return (
          <li
            key={`${row.rank}-${row.name}-${row.score}`}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-1.5",
              mine ? "bg-background/50" : "",
            )}
          >
            <span
              className={cn(
                "w-6 shrink-0 text-center text-sm font-semibold tabular-nums",
                row.rank <= 3 ? "text-accent" : "text-muted",
              )}
            >
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm text-foreground">
              {row.name}
            </span>
            <span className="shrink-0 tabular-nums text-sm text-foreground">
              {row.score.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function LeaderboardHeader() {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-muted">
      <Trophy className="size-3.5" />
      WORLD RANK
    </p>
  );
}

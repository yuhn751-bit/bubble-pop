import { useEffect, useRef, useState } from "react";
import { HandHelping, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaderboardHeader, LeaderboardList } from "@/components/leaderboard-panel";
import { Engine } from "@/game/engine";
import { listScores, qualifyScore, sanitizeName, submitScore, type ScoreRow } from "@/game/leaderboard";
import { loadSave, writeSave } from "@/game/save";
import type { HudState } from "@/game/types";
import { cn } from "@/lib/utils";

const INITIAL: HudState = {
  score: 0,
  best: 0,
  level: 1,
  shotsLeft: 14,
  dropEvery: 14,
  combo: 0,
  muted: false,
  overlay: "title",
  lastClearBonus: 0,
  praise: "",
  toast: "",
  toastKey: 0,
  toastKind: "praise",
  helpAvailable: false,
  hint: "",
  hintKey: 0,
};

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const skipInputRef = useRef<HTMLInputElement>(null);
  const [hud, setHud] = useState<HudState>(INITIAL);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipName, setSkipName] = useState("");
  const [skipError, setSkipError] = useState("");
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardRows, setBoardRows] = useState<ScoreRow[]>([]);
  const [boardError, setBoardError] = useState("");
  const [boardLoading, setBoardLoading] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qualify, setQualify] = useState<"idle" | "checking" | "in" | "out" | "error">("idle");
  const [qualifyRank, setQualifyRank] = useState<number | null>(null);
  const submittedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const overlay = hud.overlay;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, { onHud: setHud });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (skipOpen) skipInputRef.current?.focus();
  }, [skipOpen]);

  useEffect(() => {
    const saved = loadSave().name;
    if (saved && saved !== "유수현") setPlayerName(saved);
  }, []);

  useEffect(() => {
    if (overlay !== "over") {
      setSubmitMsg("");
      setSubmitting(false);
      setSubmitted(false);
      submittedRef.current = false;
      setQualify("idle");
      setQualifyRank(null);
      return;
    }
    if (hud.score <= 0) {
      setQualify("out");
      return;
    }
    let alive = true;
    setQualify("checking");
    void qualifyScore({ data: { score: hud.score } })
      .then((result) => {
        if (!alive) return;
        setQualifyRank(result.rank);
        setQualify(result.qualifies ? "in" : "out");
      })
      .catch(() => {
        if (!alive) return;
        setQualify("error");
      });
    return () => {
      alive = false;
    };
  }, [overlay, hud.score]);

  useEffect(() => {
    if (qualify === "in" && !submitted) nameInputRef.current?.focus();
  }, [qualify, submitted]);

  const loadBoard = async () => {
    setBoardLoading(true);
    try {
      const rows = await listScores();
      setBoardRows(rows);
      setBoardError("");
    } catch {
      setBoardError("지금은 랭킹을 불러올 수 없어요.");
    } finally {
      setBoardLoading(false);
    }
  };

  const openBoard = () => {
    setBoardOpen(true);
    void loadBoard();
  };

  const postScore = async () => {
    if (submittedRef.current || submitting || hud.score <= 0) return;
    const name = sanitizeName(playerName);
    setPlayerName(name);
    writeSave({ name });
    submittedRef.current = true;
    setSubmitted(true);
    setSubmitting(true);
    setSubmitMsg("올리는 중…");
    try {
      const result = await submitScore({
        data: { name, score: hud.score, stage: hud.level },
      });
      setSubmitMsg(result.message);
      void loadBoard();
    } catch {
      submittedRef.current = false;
      setSubmitted(false);
      setSubmitMsg("지금은 올릴 수 없어요. 다시 눌러 봐.");
    } finally {
      setSubmitting(false);
    }
  };

  const showBoardHud = overlay === "playing" || overlay === "paused";

  const closeSkip = () => {
    setSkipOpen(false);
    setSkipName("");
    setSkipError("");
  };

  const submitSkip = () => {
    if (skipName.trim() === "김현일") {
      closeSkip();
      engineRef.current?.play(3);
      return;
    }
    setSkipError("아니야. 다시 생각해 봐.");
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background text-foreground">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full touch-none"
        aria-label="버블팝 게임판"
      />

      {showBoardHud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex max-w-xl items-start justify-between gap-3">
            <HudChip label="스테이지" value={String(hud.level)} />
            <HudChip label="점수" value={hud.score.toLocaleString()} emphasize />
            <HudChip label="최고" value={hud.best.toLocaleString()} />
            <div className="pointer-events-auto flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="size-11"
                aria-label={hud.muted ? "소리 켜기" : "소리 끄기"}
                onClick={() => engineRef.current?.toggleMute()}
              >
                <span className="relative size-4">
                  <Volume2
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                      hud.muted ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none",
                    )}
                  />
                  <VolumeX
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                      hud.muted ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]",
                    )}
                  />
                </span>
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-11"
                aria-label={overlay === "paused" ? "계속하기" : "일시정지"}
                onClick={() => engineRef.current?.pauseToggle()}
              >
                <span className="relative size-4">
                  <Pause
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                      overlay === "paused"
                        ? "scale-[0.25] opacity-0 blur-[4px]"
                        : "scale-100 opacity-100 blur-none",
                    )}
                  />
                  <Play
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                      overlay === "paused"
                        ? "scale-100 opacity-100 blur-none"
                        : "scale-[0.25] opacity-0 blur-[4px]",
                    )}
                  />
                </span>
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-3 flex max-w-xl flex-wrap items-center justify-center gap-1">
            {Array.from({ length: hud.dropEvery }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-3 rounded-full transition-opacity duration-150",
                  i < hud.shotsLeft ? "bg-accent/80" : "bg-foreground/15",
                )}
              />
            ))}
          </div>
          {overlay === "playing" && hud.hint && (
            <p
              key={hud.hintKey}
              className="special-hint mx-auto mt-3 max-w-lg px-4 py-2 text-center font-display text-lg leading-snug text-foreground"
            >
              {hud.hint}
            </p>
          )}
        </div>
      )}

      {overlay === "playing" && hud.toast && (
        <div
          key={hud.toastKey}
          className={cn(
            "praise-toast pointer-events-none absolute inset-x-0 top-24 z-10 px-4 text-center",
            hud.toastKind === "cheer" && "praise-toast-cheer",
          )}
        >
          <p className="font-display text-2xl tracking-tight text-foreground">{hud.toast}</p>
        </div>
      )}

      {overlay === "playing" && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-10">
          <Button
            size="sm"
            className="help-btn"
            disabled={!hud.helpAvailable}
            aria-label="선배의 도움"
            onClick={() => engineRef.current?.useHelp()}
          >
            <HandHelping className="size-4" />
            {hud.helpAvailable ? "선배의 도움" : "사용함"}
          </Button>
        </div>
      )}

      {overlay === "title" && (
        <div className="title-screen absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
          <div className="title-art" aria-hidden />
          <div className="title-card w-full max-w-xs rounded-xl border border-border px-5 py-5 text-center">
            <div className="title-bubbles stagger-item" aria-hidden>
              <span className="title-bubble" />
              <span className="title-bubble" />
              <span className="title-bubble" />
              <span className="title-bubble" />
              <span className="title-bubble" />
              <span className="title-bubble" />
              <span className="title-bubble" />
            </div>
            <p className="stagger-item mt-3 text-xs font-medium tracking-widest text-muted">
              FOR SUHYEON
            </p>
            <h1 className="title-logo stagger-item mt-1 font-display text-4xl leading-tight tracking-tight text-foreground">
              버블팝
            </h1>
            <p className="stagger-item mt-1 text-sm text-accent">수현이를 위한 버블 퍼즐</p>
            <p className="stagger-item mt-3 text-xs leading-relaxed text-muted">
              같은 색 세 개를 모으면 팡!
              <br />
              특수 구슬과 선배의 도움도 있어요.
            </p>
            {hud.best > 0 && (
              <p className="stagger-item mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/25 px-3 py-1 text-xs text-accent">
                <Trophy className="size-3.5" />
                최고 {hud.best.toLocaleString()}
              </p>
            )}
            <div className="stagger-item mt-4 flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full font-display text-base tracking-wide"
                onClick={() => engineRef.current?.play()}
              >
                게임 시작
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSkipOpen(true);
                  setSkipName("");
                  setSkipError("");
                }}
              >
                3스테이지부터
              </Button>
              <Button variant="secondary" className="w-full" onClick={openBoard}>
                <Trophy className="size-4" />
                세계 랭킹
              </Button>
            </div>
            <p className="stagger-item mt-3 text-xs leading-relaxed text-muted">
              손가락을 대고 움직여 조준, 손을 떼면 발사
              <br />
              키보드 ← → 조준, 스페이스 발사
            </p>
          </div>
        </div>
      )}

      {overlay === "title" && skipOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-stage-title"
            className="w-full max-w-xs rounded-xl border border-border bg-card px-6 py-7 text-center shadow-lg"
          >
            <h2 id="skip-stage-title" className="font-display text-2xl leading-snug">
              제일 존경하는
              <br />
              선배님의 이름은?
            </h2>
            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                submitSkip();
              }}
            >
              <input
                ref={skipInputRef}
                value={skipName}
                onChange={(e) => {
                  setSkipName(e.target.value);
                  if (skipError) setSkipError("");
                }}
                autoComplete="off"
                aria-label="선배 이름"
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-center text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {skipError && <p className="mt-3 text-sm text-accent">{skipError}</p>}
              <div className="mt-5 flex flex-col gap-2">
                <Button type="submit" size="lg" className="w-full">
                  확인
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={closeSkip}>
                  취소
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {overlay === "title" && boardOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-title"
            className="w-full max-w-xs rounded-xl border border-border bg-card px-5 py-6 text-center shadow-lg"
          >
            <LeaderboardHeader />
            <h2 id="leaderboard-title" className="mt-2 font-display text-2xl">
              세계 랭킹 TOP 10
            </h2>
            <div className="mt-4">
              <LeaderboardList
                rows={boardRows}
                loading={boardLoading}
                error={boardError}
                highlightName={playerName}
              />
            </div>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => setBoardOpen(false)}>
              닫기
            </Button>
          </div>
        </div>
      )}

      {overlay === "paused" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 px-6">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card px-6 py-7 text-center">
            <h2 className="font-display text-3xl">일시정지</h2>
            <div className="mt-6 flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={() => engineRef.current?.resume()}>
                계속하기
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={() => engineRef.current?.play()}
              >
                <RotateCcw className="size-4" />
                처음부터
              </Button>
            </div>
          </div>
        </div>
      )}

      {overlay === "clear" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/45 px-6">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card px-6 py-7 text-center">
            <p className="text-xs font-medium tracking-widest text-muted">
              STAGE {hud.level}
            </p>
            <h2 className="overlay-title mt-2 font-display text-3xl">
              스테이지
              <br />
              클리어
            </h2>
            {hud.praise && (
              <p className="mt-3 font-display text-xl text-foreground">{hud.praise}</p>
            )}
            <p className="mt-3 tabular-nums text-sm text-muted">
              점수 {hud.score.toLocaleString()}
              {hud.lastClearBonus > 0 ? ` · 보너스 +${hud.lastClearBonus.toLocaleString()}` : ""}
            </p>
            <Button
              size="lg"
              className="mt-6 w-full"
              onClick={() => engineRef.current?.nextLevel()}
            >
              다음 스테이지
            </Button>
          </div>
        </div>
      )}

      {overlay === "over" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 px-6">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card px-6 py-7 text-center">
            <h2 className="font-display text-3xl">게임 오버</h2>
            {hud.praise && (
              <p className="mt-3 font-display text-xl text-foreground">{hud.praise}</p>
            )}
            <p className="mt-3 tabular-nums text-foreground">
              {hud.score.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted">
              스테이지 {hud.level}
              {hud.best >= hud.score && hud.best > 0 ? ` · 최고 ${hud.best.toLocaleString()}` : ""}
            </p>
            {hud.score >= hud.best && hud.score > 0 && (
              <p className="mt-2 text-sm text-accent">새 최고 기록</p>
            )}
            {qualify === "checking" && (
              <p className="mt-4 text-sm text-muted">랭킹 확인 중…</p>
            )}
            {qualify === "in" && !submitted && (
              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void postScore();
                }}
              >
                <p className="font-display text-lg text-accent">
                  {qualifyRank ? `${qualifyRank}위 진입!` : "TOP 10 진입!"}
                </p>
                <p className="mt-1 text-xs tracking-widest text-muted">ENTER NAME</p>
                <input
                  ref={nameInputRef}
                  id="score-name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={12}
                  placeholder="닉네임"
                  autoComplete="off"
                  aria-label="닉네임"
                  className="mt-3 h-11 w-full rounded-md border border-border bg-background px-3 text-center font-display text-lg tracking-wide text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="lg" className="mt-3 w-full" disabled={submitting}>
                  등록
                </Button>
                {submitMsg && <p className="mt-2 text-center text-sm text-accent">{submitMsg}</p>}
              </form>
            )}
            {submitted && submitMsg && (
              <p className="mt-4 font-display text-lg text-accent">{submitMsg}</p>
            )}
            {qualify === "out" && hud.score > 0 && (
              <p className="mt-4 text-sm text-muted">세계 10위 밖이에요. 다시 도전해 봐.</p>
            )}
            {qualify === "error" && (
              <p className="mt-4 text-sm text-muted">지금은 랭킹을 확인할 수 없어요.</p>
            )}
            <Button
              size="lg"
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => engineRef.current?.play()}
            >
              다시 하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HudChip({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-widest text-muted">{label}</p>
      <p
        className={cn(
          "truncate tabular-nums text-sm font-semibold",
          emphasize ? "text-foreground" : "text-foreground/90",
        )}
      >
        {value}
      </p>
    </div>
  );
}

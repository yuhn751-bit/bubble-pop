import type { SpecialKind } from "./specials";

export const PLAYER_NAME = "강수림";

let lastPop = "";
let lastClear = "";
let lastOver = "";

function pickLine(lines: string[], prev: string): { line: string; next: string } {
  const pool = lines.length > 1 ? lines.filter((s) => s !== prev) : lines;
  const line = pool[Math.floor(Math.random() * pool.length)] ?? lines[0];
  return { line, next: line };
}

const POP_SMALL = [
  "좋아, 수림아!",
  "잘 맞췄어, 수림아!",
  "바로 그거야 수림아!",
  "오 수림아 좋다!",
  "수림이 감각 좋은데!",
  "수림아 잘 보고 쐈다!",
  "응, 수림아 그거야!",
  "수림이 손 빠르다!",
  "좋아요 강수림!",
  "수림아 집중 잘하네!",
  "방금 샷 예뻤어 수림아!",
  "수림이 리듬 좋은데!",
  "강수림, 방금 좋았어!",
  "수림아 한 수 앞선다!",
  "오케이 강수림!",
  "수림이 오늘은 된다!",
];

const POP_NICE = [
  "잘했어 강수림!",
  "수림이 솜씨 좋은데!",
  "깔끔하다 수림아!",
  "와, 수림아!",
  "수림이 잘 쏘네!",
  "수림아 시원하게 터졌다!",
  "오 수림아 똑똑하다!",
  "강수림 느낌 살아있네!",
  "수림이 점점 늘고 있어!",
  "방금 멋있었어 수림아!",
  "수림아 눈이 밝다!",
  "좋아 좋아, 강수림!",
  "강수림 손끝 살아있다!",
  "수림아 그게 정답이야!",
  "역시 강수림!",
  "수림이 센스 최고!",
  "방금 그거 강수림답다!",
];

const POP_GOOD = [
  "멋져 강수림!",
  "수림이 진짜 잘한다!",
  "대박이야 수림아!",
  "수림아 눈이 빠르다!",
  "이거지 수림아!",
  "수림이 오늘 컨디션 최고!",
  "와 수림아 시원하다!",
  "강수림 고수 같은데?",
  "수림아 계산이 빨라!",
  "방금 예술이야 수림아!",
  "수림이 손맛 좋다!",
  "진짜 잘한다 강수림!",
  "강수림 오늘 왜 이렇게 잘해!",
  "수림아 박수 나와!",
  "강수림, 그 샷 예술이야!",
  "수림이 머리가 빠르다!",
  "인정, 강수림!",
  "와 수림아 그거 반칙 아냐?",
  "강수림 손이 노래한다!",
  "수림아 오늘 천재 모드!",
  "방금 그거 영화야 강수림!",
];

const POP_GREAT = [
  "최고야 강수림!",
  "수림이 천재 아냐?",
  "완전 멋져 수림아!",
  "수림이만 할 수 있는 샷!",
  "와 수림아 너무 좋아!",
  "수림아 이 판의 주인공이야!",
  "강수림 오늘 안 막힌다!",
  "수림이 버블 요정이다!",
  "대박 대박, 수림아!",
  "수림아 손이 빛났어!",
  "이렇게 잘한다고? 강수림!",
  "수림이 진짜 프로 같아!",
  "강수림 클래스 나온다!",
  "수림아 거의 안 틀리네!",
  "오늘 주인공은 강수림!",
  "수림이 천재 확정!",
  "강수림, 그거 레전드야!",
  "수림아 나 지금 기립박수야!",
  "강수림 버블계 슈퍼스타!",
  "수림이 손이 국가대표급!",
  "와 수림아 과하지? 과해도 돼!",
  "강수림, 구슬들이 항복했어!",
  "수림아 오늘 역사 쓰는 중!",
];

const POP_AMAZING = [
  "강수림 천재!",
  "오늘 수림이 최고!",
  "수림아 너무 잘한다!",
  "수림이 버블 고수!",
  "수림아 진짜 대단해!",
  "강수림 전설 간다!",
  "수림아 이 게임 너 거야!",
  "와아 수림아 최고최고!",
  "수림이 손이 마법이야!",
  "강수림, 완전 승리의 샷!",
  "수림아 깜짝 놀랐어!",
  "오늘 수림이 안 져!",
  "강수림 완전 전설이야!",
  "수림아 이 판 네 거야!",
  "강수림 버블 여왕 등극!",
  "수림이 손에서 별이 떨어져!",
  "와 강수림, 소름이야!",
  "강수림 완전 신이야 신!",
  "수림아 나 울뻔했어 방금!",
  "강수림 전설 확정, 이의 없음!",
  "수림이 손이 마법 지팡이야!",
  "와아아 강수림!!! 미쳤어!",
  "수림아 버블팝이 수림이 거야!",
  "강수림, 구슬이 수림이 팬클럽임!",
  "수림아 과한 칭찬? 아직 모자람!",
];

const POP_COUNT = [
  (n: number) => `${n}개나 터뜨렸어 수림아!`,
  (n: number) => `수림이 ${n}개를 한 번에!`,
  (n: number) => `와 ${n}개, 강수림!`,
  (n: number) => `수림아 ${n}개 클리어!`,
  (n: number) => `${n}개 성공, 수림아 멋져!`,
  (n: number) => `한 방에 ${n}개야 수림아!`,
  (n: number) => `수림이 ${n}개를 정리했어!`,
  (n: number) => `강수림 ${n}개 콤보 샷!`,
  (n: number) => `펑펑, ${n}개다 수림아!`,
  (n: number) => `수림아 ${n}개나 날렸어!`,
  (n: number) => `${n}개 팡팡, 수림아!`,
  (n: number) => `수림이 ${n}개 맞춤!`,
  (n: number) => `좋아 ${n}개, 강수림!`,
  (n: number) => `수림아 ${n}개를 빗자루로 쓸었네!`,
  (n: number) => `${n}개 정리 완료, 수림아!`,
  (n: number) => `강수림 ${n}개 정리왕!`,
  (n: number) => `수림아 ${n}개, 선배도 감탄!`,
  (n: number) => `똑똑하다 강수림, ${n}개!`,
];

const POP_FOUR = [
  "네 개다 수림아!",
  "딱 네 개, 수림아 좋다!",
  "수림이 네 개를 깔끔하게!",
  "네 개 성공, 강수림!",
  "수림아 네 개면 충분해!",
  "방금 네 개, 수림이 감각!",
  "강수림 네 개 깔끔!",
  "네 개면 강수림이지!",
];

const POP_FIVE = [
  "다섯 개다 수림아!",
  "오 수림아 다섯 개!",
  "수림이 다섯 개를 한 방에!",
  "다섯 개 성공, 강수림!",
  "수림아 손맛이 다섯!",
  "와 다섯, 수림이 잘한다!",
  "강수림 다섯 개 성공!",
  "다섯이면 수림이 몫이야!",
];

const POP_SIX_EIGHT = [
  (n: number) => `${n}개나, 수림아 시원하다!`,
  (n: number) => `수림이 ${n}개 연쇄 성공!`,
  (n: number) => `와 ${n}개다 강수림!`,
  (n: number) => `수림아 ${n}개를 제대로 터뜨렸어!`,
  (n: number) => `${n}개 샷, 수림이 고수 같아!`,
  (n: number) => `펑! ${n}개야 수림아!`,
  (n: number) => `수림이 ${n}개면 합격!`,
  (n: number) => `좋아 좋아 ${n}개, 강수림!`,
  (n: number) => `강수림 ${n}개 손맛!`,
  (n: number) => `수림아 ${n}개면 합격 이상!`,
  (n: number) => `와 ${n}개! 수림아 손 맛있다!`,
  (n: number) => `강수림 ${n}개면 거의 마법이야!`,
  (n: number) => `수림아 ${n}개 연쇄, 박수 나와!`,
  (n: number) => `${n}개야 강수림, 과하게 잘한다!`,
];

const POP_NINE_TWELVE = [
  (n: number) => `${n}개 대박, 수림아!`,
  (n: number) => `수림이 ${n}개를 쓸어버렸어!`,
  (n: number) => `와아 ${n}개, 강수림 천재!`,
  (n: number) => `수림아 ${n}개면 거의 잔치야!`,
  (n: number) => `${n}개 연쇄, 수림이 멋져!`,
  (n: number) => `오늘 수림이 ${n}개 모드!`,
  (n: number) => `수림아 손이 번개야, ${n}개!`,
  (n: number) => `강수림 ${n}개 퍼레이드!`,
  (n: number) => `수림아 ${n}개, 눈이 부셔!`,
  (n: number) => `강수림 ${n}개면 잔치야!`,
  (n: number) => `${n}개!!! 수림아 나 기절할 뻔!`,
  (n: number) => `강수림 ${n}개면 축제 열어!`,
  (n: number) => `수림아 ${n}개 한방, 이건 예술 그 이상!`,
  (n: number) => `와아 ${n}개! 강수림 오늘 여왕이야!`,
  (n: number) => `수림이 ${n}개 쓸었다. 구슬들이 기립박수!`,
  (n: number) => `${n}개라니 강수림, 과해도 너무 과해!`,
  (n: number) => `수림아 ${n}개면 다큐 찍어야 해!`,
  (n: number) => `강수림 ${n}개 쇼! 나 지금 소름!`,
];

const POP_HUGE = [
  (n: number) => `${n}개!? 수림아 진짜 최고!`,
  (n: number) => `수림이 ${n}개를 한 판에 날렸어!`,
  (n: number) => `전설이다 강수림, ${n}개!`,
  (n: number) => `수림아 ${n}개면 버블 여왕이야!`,
  (n: number) => `와 ${n}개, 수림이 오늘 안 져!`,
  (n: number) => `강수림 ${n}개 폭죽이다!`,
  (n: number) => `수림아 화면이 비었어, ${n}개!`,
  (n: number) => `${n}개 클리어쇼, 수림아!`,
  (n: number) => `강수림 ${n}개 신기록급!`,
  (n: number) => `수림아 ${n}개, 전설이야!`,
  (n: number) => `${n}개!? 수림아 나 무릎 꿇었어!`,
  (n: number) => `강수림 ${n}개!!! 이건 신이다 신!`,
  (n: number) => `수림아 ${n}개면 버블팝 종료각이야!`,
  (n: number) => `와 ${n}개! 강수림 전설의 고향이야!`,
  (n: number) => `수림이 ${n}개를 한 방에? 반칙 신고합니다!`,
  (n: number) => `강수림 ${n}개. 구슬들이 수림이 신으로 모심`,
  (n: number) => `${n}개 폭죽, 수림아 오늘 역사다!`,
  (n: number) => `수림아 ${n}개면 과한 칭찬이 부족해!`,
  (n: number) => `강수림 ${n}개 클리어쇼. 나 기립박수 10분!`,
  (n: number) => `수림아 ${n}개!!! 화면이 수림이 편이야!`,
  (n: number) => `와아아 ${n}개 강수림! 여왕 등극 확정!`,
  (n: number) => `수림이 ${n}개. 이 게임 수림이 거 맞다`,
  (n: number) => `강수림 ${n}개면 우주도 박수친다!`,
];

const POP_FALL = [
  (n: number) => `낙하까지 ${n}개, 수림아!`,
  (n: number) => `수림이 ${n}개를 떨어뜨렸어!`,
  (n: number) => `와 수림아 ${n}개가 우르르!`,
  (n: number) => `강수림, ${n}개 연쇄 낙하!`,
  (n: number) => `우수수, ${n}개다 수림아!`,
  (n: number) => `수림이 낙하 ${n}개 성공!`,
  (n: number) => `바닥으로 ${n}개, 강수림!`,
  (n: number) => `수림아 ${n}개가 비처럼 내려와!`,
  (n: number) => `강수림 낙하쇼 ${n}개!`,
  (n: number) => `수림이 ${n}개를 다 떨어뜨렸다!`,
  (n: number) => `우르르 ${n}개! 수림아 낙하가 예술이야!`,
  (n: number) => `강수림 ${n}개 낙하쇼, 과하다 과해!`,
  (n: number) => `수림아 ${n}개가 비처럼! 나 감동이야!`,
];

const CLEAR_COMBO = [
  "콤보 왕 수림아!",
  "수림이 콤보가 예술이야!",
  "연타 성공, 강수림!",
  "강수림 콤보 장인!",
  "수림아 연타가 예술이야!",
];

const CLEAR_CLEAN = [
  "완벽해 수림아!",
  "수림이 이번 판 깨끗하다!",
  "한 번에 정리했다 수림아!",
  "강수림 완벽 클리어!",
  "수림아 빈틈이 없어!",
];

const CLEAR_DEFAULT = [
  "대단해 강수림!",
  "수림아 스테이지 클리어!",
  "강수림 완전 잘했어!",
  "수림이 최고다!",
  "수림아 이번 판 멋졌어!",
  "수림이 또 이겼다!",
  "강수림, 깔끔한 클리어!",
  "수림아 다음 판도 너 거야!",
  "강수림, 또 해냈다!",
  "수림이 클리어 요정!",
];

const CLEAR_DEEP = [
  "수림이 진짜 잘한다!",
  "여기까지 온 수림이 대단해!",
  "수림아 점점 고수가 된다!",
  "강수림 점점 무서워진다!",
  "수림아 이 게임 적응 끝!",
  "강수림 여기까지 오다니!",
  "수림이 점점 전설이야!",
];

const OVER_BEST = [
  "강수림 신기록이야!",
  "수림아 최고 기록이다!",
  "수림이 오늘 제일 잘했어!",
  "강수림 기록 경신!",
  "수림아 최고점이야!",
];

const OVER_DEEP = [
  "여기까지 온 수림이 멋져!",
  "수림아 벌써 이만큼이야!",
  "수림이 진짜 잘하고 있어!",
  "강수림 여기까지 대단해!",
  "수림아 다음엔 더 멀리!",
];

const OVER_MID = [
  "수림이 잘하고 있어!",
  "아깝다 수림아, 거의 다 왔어!",
  "수림아 다음엔 더 갈 수 있어!",
];

const OVER_EARLY = [
  "괜찮아 수림아, 한 번 더!",
  "수림아 다시 해보자!",
  "연습하면 수림이가 이기지!",
  "수림아 금방 늘 거야!",
];

export function praiseForPop(popCount: number, fallCount: number, combo: number): string {
  const total = popCount + fallCount;
  const weight = popCount + fallCount * 1.5 + (combo - 1) * 3;
  if (fallCount >= 4 && Math.random() < 0.5) {
    const picked = pickLine(
      POP_FALL.map((fn) => fn(total)),
      lastPop,
    );
    lastPop = picked.next;
    return picked.line;
  }
  const counted = countLines(total);
  if (counted.length && Math.random() < 0.7) {
    const picked = pickLine(counted, lastPop);
    lastPop = picked.next;
    return picked.line;
  }
  const pool =
    weight >= 16 ? POP_AMAZING : weight >= 10 ? POP_GREAT : weight >= 6 ? POP_GOOD : weight >= 4 ? POP_NICE : POP_SMALL;
  const picked = pickLine(pool, lastPop);
  lastPop = picked.next;
  return picked.line;
}

function countLines(total: number): string[] {
  if (total === 4) return POP_FOUR;
  if (total === 5) return POP_FIVE;
  if (total >= 13) return [...POP_HUGE.map((fn) => fn(total)), ...POP_COUNT.map((fn) => fn(total))];
  if (total >= 9) return [...POP_NINE_TWELVE.map((fn) => fn(total)), ...POP_COUNT.map((fn) => fn(total))];
  if (total >= 6) return [...POP_SIX_EIGHT.map((fn) => fn(total)), ...POP_COUNT.map((fn) => fn(total))];
  return POP_COUNT.map((fn) => fn(total));
}

export function praiseForClear(level: number, shotsLeft: number, dropEvery: number, maxCombo: number): string {
  const leftover = dropEvery > 0 ? shotsLeft / dropEvery : 0;
  const pool =
    maxCombo >= 4 ? CLEAR_COMBO : leftover >= 0.55 ? CLEAR_CLEAN : level >= 5 ? CLEAR_DEEP : CLEAR_DEFAULT;
  const picked = pickLine(pool, lastClear);
  lastClear = picked.next;
  return picked.line;
}

export function praiseForOver(level: number, score: number, isBest: boolean): string {
  const pool = isBest && score > 0 ? OVER_BEST : level >= 5 ? OVER_DEEP : level >= 3 ? OVER_MID : OVER_EARLY;
  const picked = pickLine(pool, lastOver);
  lastOver = picked.next;
  return picked.line;
}

const SPECIAL_RAINBOW = [
  "무지개다 수림아!",
  "수림이 무지개 맞췄어!",
  "와 수림아 무지개!",
  "알록달록, 강수림!",
];
const SPECIAL_BOMB = [
  "폭탄이다 수림아!",
  "수림이 한 방에 터뜨렸어!",
  "대박 폭탄, 수림아!",
  "펑! 수림아 시원하다!",
];
const SPECIAL_STAR = [
  "별이다 수림아!",
  "수림이 별 한방!",
  "반짝, 수림아 최고!",
  "강수림 별똥별이야!",
];
const SPECIAL_HEART = [
  "하트다 수림아!",
  "수림아 천장이 올라갔어!",
  "한번 더, 수림아!",
  "수림이 하트 챙겼어!",
];
const SPECIAL_LIGHTNING = [
  "번개다 수림아!",
  "한 줄을 쓸었다 수림아!",
  "와 수림아 번개!",
  "수림이 번개 고수!",
];
const SPECIAL_LASER = [
  "레이저다 수림아!",
  "수림이 세로로 뚫었어!",
  "쭉 지나간다 수림아!",
  "강수림 레이저 샷!",
];
const SPECIAL_PAINT = [
  "물감이다 수림아!",
  "수림이 색깔을 바꿨어!",
  "칠했다, 수림아!",
  "수림아 색깔 마법이야!",
];
const SPECIAL_PLUS = [
  "십자다 수림아!",
  "가로세로 한방, 강수림!",
  "수림이 십자로 뚫었어!",
  "와 수림아 십자 샷!",
];
const SPECIAL_MAGNET = [
  "자석이다 수림아!",
  "같은 색이 끌려와, 강수림!",
  "수림이 자석 한방!",
  "끌어당겼다 수림아!",
];
const SPECIAL_LOCK = [
  "자물쇠다 수림아, 한 번 더!",
  "잠겼어 수림아, 옆을 터뜨려!",
  "수림아 자물쇠는 두 번이야!",
];
const SPECIAL_INK = [
  "먹물이다 수림아, 색깔이 섞였어!",
  "어질어질하다 수림아!",
  "수림아 다시 보고 맞춰봐!",
];
const SPECIAL_HOURGLASS = [
  "모래시계다 수림아, 조금만 서두르자!",
  "시간이 빨라졌어 수림아!",
  "수림아 천장 카운트가 줄었어!",
];
const SPECIAL_ANCHOR = [
  "닻이다 수림아, 천장이 내려와!",
  "무거워졌어 강수림!",
  "수림아 닻은 조심해!",
];
const SPECIAL_VIRUS = [
  "바이러스다 수림아, 색이 엉망이야!",
  "퍼졌다 수림아, 다시 봐!",
  "강수림, 주변이 뒤섞였어!",
];
const SPECIAL_CURSE = [
  "저주다 수림아, 다음 구슬 조심해!",
  "수림아 다음 알이 험해졌어!",
  "저주 맞았다 강수림!",
];

const HELP_CHEER = [
  "수림아 선배가 도와줄게!",
  "자, 수림아 이걸로 쏴!",
  "수림이라면 할 수 있어!",
  "선배가 응원할게, 수림아!",
  "이건 수림이 꺼야!",
  "수림아 잘하고 있어, 받아!",
  "힘내 수림아, 선배 찬스!",
  "수림이 화이팅!",
  "수림아 이 구슬로 한 방이야!",
  "선배가 믿어, 수림아!",
  "강수림, 이걸로 한 방이야!",
  "수림아 선배가 응원 중!",
  "자 강수림, 네 차례야!",
  "봐, 수림아. 선배가 한 방 챙겨 줬지?",
  "이 구슬, 선배 특제야. 감사는 나중에.",
  "수림아 지금 이건 선배 실력이야. 잘 받아!",
  "후후, 수림아. 선배 찬스 나왔다.",
  "강수림, 이런 구슬은 아무나 못 줘.",
  "선배가 괜히 선배겠니 수림아.",
  "자 수림아, 선배가 판 깔아 줬어.",
  "이 정도면 수림이도 인정하지? 선배 굿.",
  "수림아 빚진 거다. 이 구슬 값 커.",
  "선배 도움 받고도 못 맞추면 진짜야, 수림아.",
  "강수림, 선배가 등판했다. 집중해.",
  "이봐 수림아, 선배가 구해줄 줄 알았지?",
  "수림아 오늘은 선배가 좀 잘해 준다.",
  "자랑 아닌데, 이 구슬은 선배만 줄 수 있어.",
  "수림아 고마운 줄 알아. 선배 찬스 한정이야.",
  "후후후 수림아, 선배 타이밍 보소.",
  "강수림, 선배가 안 도와줬으면 큰일 날 뻔.",
  "받아 수림아. 이건 선배 간판 구슬이야.",
  "수림아 선배 도움은 공짜가 아니야. 팬이야.",
  "봐봐 수림아, 선배면 이 정도는 기본이지.",
  "강수림, 선배가 구원투수다. 감사 인사 준비해.",
];

let lastHelp = "";

export function praiseForSpecial(kind: SpecialKind): string {
  const pool =
    kind === "rainbow"
      ? SPECIAL_RAINBOW
      : kind === "bomb"
        ? SPECIAL_BOMB
        : kind === "star"
          ? SPECIAL_STAR
          : kind === "heart"
            ? SPECIAL_HEART
            : kind === "lightning"
              ? SPECIAL_LIGHTNING
              : kind === "laser"
                ? SPECIAL_LASER
                : kind === "paint"
                  ? SPECIAL_PAINT
                  : kind === "plus"
                    ? SPECIAL_PLUS
                    : kind === "magnet"
                      ? SPECIAL_MAGNET
                      : kind === "lock"
                        ? SPECIAL_LOCK
                        : kind === "ink"
                          ? SPECIAL_INK
                          : kind === "hourglass"
                            ? SPECIAL_HOURGLASS
                            : kind === "anchor"
                              ? SPECIAL_ANCHOR
                              : kind === "virus"
                                ? SPECIAL_VIRUS
                                : SPECIAL_CURSE;
  const picked = pickLine(pool, lastPop);
  lastPop = picked.next;
  return picked.line;
}

export function cheerForHelp(): string {
  const picked = pickLine(HELP_CHEER, lastHelp);
  lastHelp = picked.next;
  return picked.line;
}

const TEASE_THREE = [
  (n: number) => `수림아 ${n}연속 꽝! 구슬이 수림이 피하는 중~`,
  (n: number) => `강수림, 세 번이야. 눈 감고 쏜 거지?`,
  (n: number) => `${n}번 허공! 수림아 조준이 휴가 갔어`,
  (n: number) => `수림아 ${n}번 못 맞췄어. 구슬들이 킥킥대는 소리 들려`,
  (n: number) => `세 번이야 수림아. GPS 꺼졌니?`,
  (n: number) => `강수림 ${n}연속. 구슬이 '저 아이 아닌가?' 한대`,
  (n: number) => `수림아 ${n}번 허공. 손만 바쁘고 눈은 낮잠`,
  (n: number) => `${n}연속 꽝! 수림아 공기랑 친해졌네`,
  (n: number) => `와 수림아 ${n}번. 조준선이 수림이 모른 척한다`,
  (n: number) => `강수림, ${n}번이면 연습이 아니라 공연이야`,
  (n: number) => `수림아 구슬이 인사하고 지나갔어. ${n}번`,
  (n: number) => `${n}연속! 수림아 오늘은 허공 전담이니?`,
];
const TEASE_FOUR = [
  (n: number) => `강수림 ${n}연속 꽝, 이건 꽝 예술이야?`,
  (n: number) => `수림아 ${n}번이야. 손 풀기니, 아니면 눈 풀기니?`,
  (n: number) => `${n}연속! 수림아 버블이 너 보고 비웃는다`,
  (n: number) => `와 강수림 ${n}번. 허공이 수림이 팬이네`,
  (n: number) => `수림아 ${n}번. 구슬들이 단체로 점프하네`,
  (n: number) => `강수림 ${n}연속 미스. 조준이 해외여행 중`,
  (n: number) => `${n}번이야 수림아. 판이 수림이 피한다`,
  (n: number) => `수림아 손 있지? ${n}번이면 확인 좀`,
  (n: number) => `강수림, ${n}연속 허공. 공기청정기 모드냐`,
  (n: number) => `${n}꽝! 수림아 구슬이 '다음에' 하고 도망감`,
  (n: number) => `수림아 ${n}번. 이건 버블팝이 아니라 허공팝`,
  (n: number) => `와 강수림 ${n}연속. 관중석에서 한숨 소리`,
];
const TEASE_FIVE = [
  (n: number) => `수림아 ${n}연속 꽝! 오늘 구슬이랑 싸우는 거야?`,
  (n: number) => `강수림 ${n}번 미스… 기록 세우지 마, 그거`,
  (n: number) => `${n}번이야 수림아. 구슬들이 도망 연습 중~`,
  (n: number) => `수림아 ${n}연속. 조준이 수림이 모른 척한다`,
  (n: number) => `강수림 ${n}번. 구슬이 수림이 보고 숨었다`,
  (n: number) => `${n}연속 꽝! 수림아 눈 뜨고 쏴, 진짜로`,
  (n: number) => `수림아 ${n}번이면 구슬이 은퇴 고민한다`,
  (n: number) => `와 강수림 ${n}연속. 허공이 MVP야 오늘은`,
  (n: number) => `수림아 ${n}번. 손가락은 바쁜데 구슬은 한가해`,
  (n: number) => `강수림, ${n}꽝. 판이 수림이한테 인사도 안 함`,
  (n: number) => `${n}연속! 수림아 버블들이 단체 휴가 갔어`,
  (n: number) => `수림아 ${n}번이야. 이건 좀 웃긴데 ㅋㅋ`,
];
const TEASE_MANY = [
  (n: number) => `와 ${n}번. 수림아 이건 좀 심각한데 ㅋㅋ`,
  (n: number) => `강수림 ${n}연속 꽝! 전설의 허공 슈터 등극`,
  (n: number) => `수림아 ${n}번이나! 구슬이 수림이 안 보인대`,
  (n: number) => `${n}연속 허공, 강수림. 이건 재능이야 재능`,
  (n: number) => `수림아 ${n}번 못 터뜨리다니… 버블팝이 울고 있다`,
  (n: number) => `강수림 ${n}연속. 구슬들이 수림이 블랙리스트에 올림`,
  (n: number) => `${n}번이야 수림아. 우주로 쏘는 거니?`,
  (n: number) => `수림아 ${n}꽝. 조준선이 사직서 냈다`,
  (n: number) => `와 강수림 ${n}번. 허공 명예의 전당 입성`,
  (n: number) => `수림아 ${n}연속. 구슬이 '저 아이 아니에요' 함`,
  (n: number) => `강수림 ${n}번 미스. 이건 다큐로 찍어야 해`,
  (n: number) => `${n}번! 수림아 손 바꿔 쏴볼래? 왼손?`,
  (n: number) => `수림아 ${n}연속 꽝. 버블들이 수림이 전설로 기억함`,
  (n: number) => `강수림, ${n}번이면 구슬이 이삿짐 싼다`,
  (n: number) => `${n}꽝! 수림아 오늘은 허공이 주인공이야`,
  (n: number) => `수림아 ${n}번. 관중이 팝콘 들고 왔다 ㅋㅋ`,
];

let lastTease = "";

export function teaseForMiss(streak: number): string {
  const pool =
    streak <= 3 ? TEASE_THREE : streak === 4 ? TEASE_FOUR : streak === 5 ? TEASE_FIVE : TEASE_MANY;
  const picked = pickLine(
    pool.map((fn) => fn(streak)),
    lastTease,
  );
  lastTease = picked.next;
  return picked.line;
}

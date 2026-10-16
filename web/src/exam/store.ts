// 정보처리기사 모드의 기록과 임시 저장.
//
// 쓰는 즉시(0.3초 뒤) 브라우저 저장소(localStorage)에 저장하고, 탭을 닫거나 다른 탭으로 갈 때도
// 바로 저장한다. 그래서 브라우저가 갑자기 꺼져도 마지막 몇 글자 말고는 남는다.
// 저장소는 이 브라우저에만 있다: 다른 기기·시크릿 창에서는 보이지 않는다.

const KEY = 'codestep.exam.v2';
const OLD_KEY = 'codestep.exam';   // 첫 버전의 맞힘 표시

export type Mark = 'ok' | 'no' | 'part';

export interface RoundState {
  answers: Record<string, string[]>;   // 문제 id → 칸별 답
  elapsed: number;                     // 푼 시간(ms), 화면을 보고 있을 때만 흐른다
  updated: number;                     // 마지막 저장 시각
  submitted?: { at: number; score: number; scores: Record<string, number> };
  history: { at: number; score: number }[];
}

interface State {
  drafts: Record<string, string[]>;    // 유형별 연습에서 쓰던 답
  marks: Record<string, Mark>;         // 유형별 연습 채점 결과
  rounds: Record<string, RoundState>;
}

let state: State = load();
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSaved = 0;
let failed = false;
const listeners = new Set<() => void>();

function load(): State {
  const empty: State = { drafts: {}, marks: {}, rounds: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty, ...(JSON.parse(raw) as Partial<State>) };
    const old = localStorage.getItem(OLD_KEY);
    if (old) empty.marks = JSON.parse(old) as Record<string, Mark>;
  } catch { /* 저장소를 못 쓰거나 깨진 값: 새로 시작 */ }
  return empty;
}

function writeNow() {
  if (timer) { clearTimeout(timer); timer = null; }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    lastSaved = Date.now();
    failed = false;
  } catch {
    failed = true;
  }
  for (const f of listeners) f();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(writeNow, 300);
}

/** 기다리는 저장을 바로 한다 (화면을 떠날 때) */
export function flush() { if (timer) writeNow(); }

// 탭을 닫거나 숨길 때 바로 저장
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
// 다른 탭에서 저장하면 그 내용을 받는다 (쓰는 중인 것이 없을 때)
addEventListener('storage', (e) => {
  if (e.key !== KEY || timer) return;
  state = load();
  for (const f of listeners) f();
});

/** 저장 상태 표시용 */
export function saveStatus(): { at: number; failed: boolean; pending: boolean } {
  return { at: lastSaved, failed, pending: !!timer };
}
export function onSaved(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

// ── 유형별 연습 ─────────────────────────────────────────

export const draftOf = (id: string): string[] => state.drafts[id] ?? [];
export function setDraft(id: string, inputs: string[]) {
  if (inputs.every((s) => !s)) delete state.drafts[id];
  else state.drafts[id] = inputs;
  schedule();
}
export const marks = (): Readonly<Record<string, Mark>> => state.marks;
export function setMark(id: string, m: Mark) {
  state.marks[id] = m;
  writeNow();
}

// ── 회차 모의고사 ───────────────────────────────────────

export function roundState(id: string): RoundState | undefined { return state.rounds[id]; }

function ensure(id: string): RoundState {
  return (state.rounds[id] ??= { answers: {}, elapsed: 0, updated: Date.now(), history: [] });
}

export function setRoundAnswer(rid: string, pid: string, inputs: string[]) {
  const r = ensure(rid);
  if (inputs.every((s) => !s)) delete r.answers[pid];
  else r.answers[pid] = inputs;
  r.updated = Date.now();
  schedule();
}

export function addElapsed(rid: string, ms: number) {
  const r = ensure(rid);
  r.elapsed += ms;
  schedule();
}

export function submitRound(rid: string, scores: Record<string, number>, total: number) {
  const r = ensure(rid);
  const at = Date.now();
  r.submitted = { at, score: total, scores };
  r.history.push({ at, score: total });
  r.updated = at;
  writeNow();
}

/** 다시 풀기: 답과 시간을 지우고 점수 기록은 남긴다 */
export function resetRound(rid: string) {
  const r = ensure(rid);
  r.answers = {};
  r.elapsed = 0;
  delete r.submitted;
  r.updated = Date.now();
  writeNow();
}

export const allRounds = (): Readonly<Record<string, RoundState>> => state.rounds;

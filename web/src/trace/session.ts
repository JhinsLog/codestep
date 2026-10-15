// 기록된 Trace 위에서 도는 디버거.
//
// 모든 명령이 "규칙을 만족하는 다음(또는 이전) 단계 찾기"라서 뒤로 가기가 공짜다.
// step over / out은 줄 번호가 아니라 프레임 깊이로 판정해서 재귀에서도
// 실제 디버거처럼 동작한다.
import type { Step, Trace } from './types';

export class Session {
  readonly steps: Step[];
  readonly breakpoints = new Set<number>();
  cur = 0;

  constructor(trace: Trace) {
    this.steps = trace.steps;
  }

  get step(): Step | undefined {
    return this.steps[this.cur];
  }

  get last(): number {
    return Math.max(0, this.steps.length - 1);
  }

  private depth(i: number): number {
    return this.steps[i]?.frames.length ?? 0;
  }

  private find(from: number, dir: 1 | -1, ok: (i: number) => boolean): number | null {
    for (let i = from + dir; i >= 0 && i < this.steps.length; i += dir) if (ok(i)) return i;
    return null;
  }

  go(i: number): void {
    this.cur = Math.max(0, Math.min(this.last, i));
  }

  stepInto(): void { this.go(this.cur + 1); }
  stepBack(): void { this.go(this.cur - 1); }

  /** 함수 호출은 안으로 들어가지 않고 끝까지 실행한 뒤 다음 줄로 */
  stepOver(): void {
    this.go(this.overFrom(this.cur) ?? this.last);
  }

  /** 지금 함수가 끝나 호출한 쪽으로 돌아간 지점까지 */
  stepOut(): void {
    const d = this.depth(this.cur);
    this.go(this.find(this.cur, 1, (i) => this.depth(i) < d) ?? this.last);
  }

  /** 거꾸로 step over: 같은 깊이 이하의 직전 단계 */
  stepOverBack(): void {
    const d = this.depth(this.cur);
    this.go(this.find(this.cur, -1, (i) => this.depth(i) <= d && this.steps[i]?.event !== 'return') ?? 0);
  }

  /** 다음 중단점까지. 없으면 끝까지 */
  continue(): void {
    this.go(this.find(this.cur, 1, (i) => this.hitsBreakpoint(i)) ?? this.last);
  }

  continueBack(): void {
    this.go(this.find(this.cur, -1, (i) => this.hitsBreakpoint(i)) ?? 0);
  }

  private hitsBreakpoint(i: number): boolean {
    const s = this.steps[i];
    return !!s && s.event !== 'return' && this.breakpoints.has(s.line);
  }

  private overFrom(i: number): number | null {
    const d = this.depth(i);
    return this.find(i, 1, (j) => this.depth(j) <= d && !this.isContinuation(j));
  }

  /**
   * 같은 줄이 이어지는 기록인가. 함수 호출에서 돌아와 같은 줄의 나머지
   * (반환값을 변수에 넣기 등)를 실행할 때 그 줄이 다시 기록되는데,
   * 사람이 보기에는 한 줄이므로 넘어가기·줄 클릭에서는 멈추지 않는다.
   */
  private isContinuation(j: number): boolean {
    const s = this.steps[j];
    if (!s || s.event === 'return') return false;
    const d = s.frames.length;
    for (let p = j - 1; p >= 0; p--) {
      const q = this.steps[p]!;
      if (q.frames.length > d) continue; // 호출된 함수 안쪽은 건너뛴다
      return q.frames.length === d && q.line === s.line && q.event !== 'return';
    }
    return false;
  }

  /**
   * 줄 클릭: 그 줄이 "실행된 직후" 상태로 간다.
   * 반복문 안의 줄이면 누를 때마다 다음 회차로, 마지막 회차 다음에는 첫 회차로 돈다.
   */
  runLine(line: number): boolean {
    const after: number[] = [];
    this.steps.forEach((s, i) => {
      if (s.line !== line || s.event === 'return' || this.isContinuation(i)) return;
      const a = this.overFrom(i);
      if (a !== null && !after.includes(a)) after.push(a);
    });
    if (after.length === 0) return false;
    after.sort((x, y) => x - y); // 재귀에서는 안쪽 호출이 먼저 끝나므로 시간 순으로
    this.go(after.find((a) => a > this.cur) ?? after[0]!);
    return true;
  }

  /** 이 줄이 몇 번째 실행인지 (반복문 회차 표시용) */
  visitsOf(line: number): number {
    let n = 0;
    for (let i = 0; i <= this.cur; i++) {
      const s = this.steps[i]!;
      if (s.line === line && s.event !== 'return' && !this.isContinuation(i)) n++;
    }
    return n;
  }
}

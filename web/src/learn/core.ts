// 개념 그림(학습 모드)의 공통 도구: 그림 계약, 움직임(tween), SVG 만들기, 재생 단추, 설명 칸.
import { el } from '../view/stage';
import { normTerm } from '../exam/answer';

/** 개념 그림 하나 */
export interface Viz {
  el: HTMLElement;
  /** 정답 위치 강조: 이름(한글·영문)이 맞는 항목을 빛나게 한다 */
  focus?(names: string[]): void;
  dispose(): void;
}

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** t: 0 → 1 로 흐르는 움직임. 줄이기 설정이면 바로 끝난다. stop()으로 멈출 수 있다 */
export function tween(ms: number, step: (t: number) => void, ease: (t: number) => number = easeInOut): { done: Promise<void>; stop(): void } {
  let raf = 0;
  let stopped = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  if (reduced() || ms <= 0) {
    step(1);
    resolve();
    return { done, stop() {} };
  }
  const t0 = performance.now();
  const frame = (now: number) => {
    if (stopped) return;
    const t = Math.min(1, (now - t0) / ms);
    step(ease(t));
    if (t < 1) raf = requestAnimationFrame(frame);
    else resolve();
  };
  raf = requestAnimationFrame(frame);
  return { done, stop() { stopped = true; cancelAnimationFrame(raf); resolve(); } };
}
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const linear = (t: number) => t;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced() ? 0 : ms));

const NS = 'http://www.w3.org/2000/svg';
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

/** 이름이 정답 목록과 맞는가: 띄어쓰기·기호를 빼고, 한쪽이 다른 쪽을 포함하면 맞다고 본다 */
export function nameHits(names: (string | undefined)[], answers: string[]): boolean {
  const ns = names.filter(Boolean).map((n) => normTerm(n!)).filter((n) => n.length >= 2);
  return answers.some((a) => {
    const w = normTerm(a);
    if (w.length < 2) return false;
    return ns.some((n) => n === w || n.includes(w) || w.includes(n));
  });
}

/** 그림 아래의 설명 칸 */
export function detailBox(placeholder: string): { el: HTMLElement; show(title: string, body: string | Node, sub?: string): void; reset(): void } {
  const box = el('div', 'viz-detail');
  const reset = () => box.replaceChildren(el('span', 'muted small', placeholder));
  reset();
  return {
    el: box,
    show(title, body, sub) {
      box.replaceChildren(el('b', '', title));
      if (sub) box.append(el('span', 'viz-sub', sub));
      box.append(typeof body === 'string' ? el('p', '', body) : body);
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    },
    reset,
  };
}

/** ▶ 재생 · ◀ ▶ 한 단계 · ⟲ 처음 */
export interface Player {
  el: HTMLElement;
  setLabel(text: string): void;
  /** k단계로 간다. 앞으로 갈 때는 지나는 단계를 하나씩 움직여 보여 준다 */
  jump(k: number): Promise<void>;
  /** 지금 몇 단계인지 (-1은 시작 전) */
  at(): number;
  dispose(): void;
}
export function player(opts: { steps: number; go: (i: number, instant: boolean) => Promise<void> | void; reset: () => void; label?: (i: number) => string; delay?: number }): Player {
  const bar = el('div', 'viz-bar');
  const play = el('button', 'viz-play', '▶ 재생');
  const prev = el('button', '', '◀');
  const next = el('button', '', '▶');
  const first = el('button', '', '⟲ 처음');
  prev.title = '이전 단계';
  next.title = '다음 단계';
  const pos = el('span', 'viz-pos muted small');
  bar.append(play, prev, next, first, pos);
  let i = -1;
  let playing = false;
  let busy = false;
  let alive = true;
  const paint = () => {
    pos.textContent = i < 0 ? `0 / ${opts.steps}` : `${i + 1} / ${opts.steps}${opts.label ? ` · ${opts.label(i)}` : ''}`;
    prev.disabled = i < 0;
    next.disabled = i >= opts.steps - 1;
    play.textContent = playing ? '⏸ 멈춤' : i >= opts.steps - 1 ? '⟲ 다시 재생' : '▶ 재생';
    play.classList.toggle('on', playing);
  };
  const goto = async (k: number) => {
    if (busy) return;
    busy = true;
    // 뒤로 갈 때는 처음부터 k - 1까지 움직임 없이 다시 쌓는다
    if (k < i) { opts.reset(); for (let j = 0; j < k; j++) await opts.go(j, true); }
    i = k;
    paint();
    await opts.go(i, false);
    busy = false;
    paint();
  };
  const loop = async () => {
    while (playing && alive && i < opts.steps - 1) {
      await goto(i + 1);
      if (!playing || !alive) break;
      await sleep(opts.delay ?? 700);
    }
    playing = false;
    if (alive) paint();
  };
  play.addEventListener('click', () => {
    if (playing) { playing = false; paint(); return; }
    if (i >= opts.steps - 1) { opts.reset(); i = -1; }
    playing = true;
    paint();
    void loop();
  });
  next.addEventListener('click', () => { playing = false; if (i < opts.steps - 1) void goto(i + 1); });
  prev.addEventListener('click', () => { playing = false; if (i > 0) void goto(i - 1); else { opts.reset(); i = -1; paint(); } });
  first.addEventListener('click', () => { playing = false; opts.reset(); i = -1; paint(); });
  paint();
  const jump = async (k: number) => {
    playing = false;
    paint();
    if (busy) return;
    if (k === i) return;
    if (k < i) { await goto(k); return; }
    while (alive && i < k) await goto(i + 1);
  };
  return {
    el: bar,
    setLabel: (t) => { pos.textContent = t; },
    jump,
    at: () => i,
    dispose: () => { alive = false; playing = false; },
  };
}

/** 그림 상자: 제목 + 본문 + 설명 칸 */
export function frame(title: string, en?: string): { root: HTMLElement; body: HTMLElement } {
  const root = el('div', 'viz');
  const h = el('div', 'viz-title');
  h.append(el('b', '', title));
  if (en) h.append(el('span', 'viz-en', en));
  const body = el('div', 'viz-body');
  root.append(h, body);
  return { root, body };
}

/** 여러 그림을 위아래로 묶는다 */
export function stack(parts: Viz[]): Viz {
  const root = el('div', 'viz-stack');
  root.append(...parts.map((p) => p.el));
  return {
    el: root,
    focus: (names) => { for (const p of parts) p.focus?.(names); },
    dispose: () => { for (const p of parts) p.dispose(); },
  };
}

/** 탭으로 고르는 그림들 (예: 상향식·하향식) */
export function tabs(items: { name: string; make: () => Viz }[]): Viz {
  const root = el('div', 'viz-tabs');
  const head = el('div', 'seg viz-tabhead');
  const host = el('div');
  let cur: Viz | null = null;
  let focusNames: string[] = [];
  const open = (k: number) => {
    cur?.dispose();
    cur = items[k]!.make();
    host.replaceChildren(cur.el);
    if (focusNames.length) cur.focus?.(focusNames);
    head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
  };
  items.forEach((it, k) => {
    const b = el('button', '', it.name);
    b.addEventListener('click', () => open(k));
    head.append(b);
  });
  root.append(head, host);
  open(0);
  return {
    el: root,
    focus: (names) => { focusNames = names; cur?.focus?.(names); },
    dispose: () => cur?.dispose(),
  };
}

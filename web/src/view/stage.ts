// 무대: 한 단계(Step)의 호출 스택·힙을 2D로 그린다.
// Trace 계약만 보고 그리므로 어느 언어의 기록이든 같은 화면이 나온다.
import type { HeapObj, Step, Value, Var } from '../trace/types';

/** 무대가 그릴 때 받는 맥락: 몇 번째 단계인지, 전체 기록, 실행한 소스 */
export interface RenderCtx {
  index: number;
  steps: Step[];
  source: string[];
  stdout: string;   // 전체 표준출력. 단계마다 step.out 길이까지가 그 시점의 출력
  lang?: 'java' | 'python' | 'c';   // 소스 해석(반복문 범위, 값의 출처)에 쓴다
}

/** 2D·3D 무대가 같이 따르는 모양. 화면은 둘 중 하나를 골라 끼운다 */
export interface StageView {
  clear(message?: string): void;
  render(step: Step, prev: Step | undefined, ctx: RenderCtx): void;
  setTempo?(ms: number): void;
  dispose(): void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** 프레임 이름 표시: 함수는 f(), Python 전역처럼 <module>은 그대로 */
export const fnLabel = (fn: string): string =>
  fn === '<global>' ? '전역 변수 (데이터 영역)' : fn.startsWith('<') ? fn : `${fn}()`;

/** C 포인터 주소 줄임: 0x7ffd5a3c1bb5 → 0x…1bb5 */
export const shortAddr = (a: string): string => (a.length > 8 ? `0x…${a.slice(-4)}` : a);

export function showValue(v: Value | undefined, heap?: Record<string, HeapObj>): string {
  if (!v) return '?';
  switch (v.t) {
    case 'num': return v.text ?? (v.v === null ? 'NaN' : v.float && Number.isInteger(v.v) ? v.v.toFixed(1) : String(v.v));
    case 'str': return JSON.stringify(v.v);
    case 'char': return `'${v.v}'`;
    case 'bool': return String(v.v);
    case 'null': return 'null';
    case 'ref': {
      if (v.id.startsWith('@var:')) return `${v.addr ? `${shortAddr(v.addr)} ` : ''}→ ${v.id.split(':')[2]}`;
      const o = heap?.[v.id];
      const at = v.idx !== undefined && v.idx !== null ? `[${v.idx}]` : '';
      return `${v.addr ? `${shortAddr(v.addr)} ` : ''}${o ? `→ ${o.type}${at}` : '→ …'}`;
    }
    case 'unknown': return v.text;
  }
}

const same = (a: Value | undefined, b: Value | undefined) => JSON.stringify(a) === JSON.stringify(b);

const KIND_LABEL: Record<HeapObj['kind'], string> = {
  array: '배열', list: '리스트', stack: '스택', deque: '덱(스택/큐)', set: '집합', map: '맵', object: '객체', opaque: '객체',
};

export class Stage implements StageView {
  private hoverId: string | null = null;
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement) {
    const root = el('div', 's2d');
    parent.append(root);
    this.root = root;
    root.addEventListener('mouseover', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-ref]')?.dataset.ref ?? null;
      if (id !== this.hoverId) this.highlight(id);
    });
    root.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-ref]')?.dataset.ref;
      if (id) root.querySelector(`[data-obj="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private highlight(id: string | null) {
    this.hoverId = id;
    for (const n of this.root.querySelectorAll('.linked')) n.classList.remove('linked');
    if (!id) return;
    for (const n of this.root.querySelectorAll(`[data-ref="${CSS.escape(id)}"], [data-obj="${CSS.escape(id)}"]`)) {
      n.classList.add('linked');
    }
  }

  clear(message?: string) {
    this.root.replaceChildren(el('p', 'muted', message ?? '실행하면 여기에 변수와 자료구조가 나타납니다.'));
  }

  dispose() {
    this.root.remove();
  }

  render(step: Step, prev: Step | undefined) {
    const heap = step.heap;
    const inner = step.frames.at(-1);

    // ── 호출 스택 (안쪽 함수가 위)
    const stack = el('section', 'frames');
    stack.append(el('h3', '', '호출 스택'));
    step.frames.slice().reverse().forEach((f, ri) => {
      const idx = step.frames.length - 1 - ri;
      const before = prev?.frames[idx];
      const sameFrame = before && before.fn === f.fn && before.cls === f.cls;
      const card = el('div', `frame${ri === 0 ? ' top' : ''}`);
      const head = el('div', 'frame-head');
      head.append(el('span', 'fn', `${fnLabel(f.fn)}`), el('span', 'muted', ` ${f.cls ?? ''} · ${f.line}줄`));
      card.append(head);
      if (f.locals.length === 0) card.append(el('p', 'muted small', '지역 변수 없음'));
      const table = el('table', 'vars');
      for (const v of f.locals) {
        const old = sameFrame ? before.locals.find((x) => x.name === v.name) : undefined;
        const changed = !!sameFrame && (!old || !same(old.value, v.value));
        table.append(this.varRow(v, heap, changed && !!prev));
      }
      if (f.locals.length) card.append(table);
      stack.append(card);
    });

    // ── 반환값 / 예외 배너
    const banners: HTMLElement[] = [];
    if (step.event === 'return' && step.ret) {
      banners.push(el('div', 'banner ret', `↩ ${fnLabel(inner?.fn ?? '')} 이 ${showValue(step.ret, heap)} 를 돌려줌`));
    } else if (step.event === 'return') {
      banners.push(el('div', 'banner ret', `↩ ${fnLabel(inner?.fn ?? '')} 종료`));
    } else if (step.event === 'call') {
      banners.push(el('div', 'banner call', `→ ${fnLabel(inner?.fn ?? '')} 호출됨`));
    }
    if (step.event === 'exception') banners.push(el('div', 'banner exc', `⚠ 예외: ${step.exception ?? ''}`));

    // ── 힙
    const heapSec = el('section', 'heap');
    heapSec.append(el('h3', '', '힙 (객체·배열·컬렉션)'));
    const ids = Object.keys(heap);
    if (ids.length === 0) heapSec.append(el('p', 'muted small', '아직 만들어진 객체가 없습니다.'));
    const pointers = this.pointersTo(step);
    for (const id of ids) heapSec.append(this.heapCard(id, heap[id]!, heap, prev?.heap[id], pointers.get(id) ?? [], inner?.locals ?? []));

    this.root.replaceChildren(...banners, stack, heapSec);
    if (this.hoverId) this.highlight(this.hoverId);
  }

  private varRow(v: Var, heap: Record<string, HeapObj>, changed: boolean): HTMLTableRowElement {
    const tr = el('tr', changed ? 'changed' : '');
    tr.append(el('td', 'vname', v.name), el('td', 'vtype muted', v.type));
    const td = el('td', 'vval');
    td.append(this.valueNode(v.value, heap));
    tr.append(td);
    return tr;
  }

  private valueNode(v: Value, heap: Record<string, HeapObj>): HTMLElement {
    if (v.t === 'ref') {
      const chip = el('span', 'ref', showValue(v, heap));
      chip.dataset.ref = v.id;
      chip.title = '누르면 가리키는 객체로 이동';
      return chip;
    }
    return el('span', `val ${v.t}`, showValue(v, heap));
  }

  /** 객체 id → 그 객체를 가리키는 변수 이름들 (가장 안쪽 프레임 우선) */
  private pointersTo(step: Step): Map<string, string[]> {
    const m = new Map<string, string[]>();
    const add = (id: string, name: string) => {
      const list = m.get(id) ?? [];
      if (!list.includes(name)) list.push(name);
      m.set(id, list);
    };
    for (const f of step.frames.slice().reverse()) {
      for (const v of f.locals) if (v.value.t === 'ref') add(v.value.id, v.name);
    }
    for (const [id, o] of Object.entries(step.heap)) {
      if (o.kind === 'object') {
        for (const f of o.fields) if (f.value.t === 'ref') add(f.value.id, `${step.heap[id]?.type}.${f.name}`);
      }
    }
    return m;
  }

  private heapCard(id: string, o: HeapObj, heap: Record<string, HeapObj>, before: HeapObj | undefined,
    names: string[], locals: Var[]): HTMLElement {
    const card = el('div', `obj ${o.kind}`);
    card.dataset.obj = id;
    const head = el('div', 'obj-head');
    head.append(el('span', 'otype', o.type), el('span', 'muted small', ` ${KIND_LABEL[o.kind]}`));
    if ('len' in o) head.append(el('span', 'muted small', ` · 크기 ${o.len}`));
    if (names.length) head.append(el('span', 'onames', names.join(', ')));
    card.append(head);

    switch (o.kind) {
      case 'array': case 'list': case 'stack': case 'deque': case 'set': {
        const old = before && 'items' in before ? before.items : undefined;
        card.append(this.cells(o.items, o.len, heap, old, o.kind === 'array' || o.kind === 'list' ? locals : [], o.kind));
        break;
      }
      case 'map': {
        const table = el('table', 'vars');
        const old = before?.kind === 'map' ? before.entries : undefined;
        for (const [k, v] of o.entries) {
          const prevEntry = old?.find(([ok]) => same(ok, k));
          const tr = el('tr', old && (!prevEntry || !same(prevEntry[1], v)) ? 'changed' : '');
          const kt = el('td'); kt.append(this.valueNode(k, heap));
          const vt = el('td'); vt.append(this.valueNode(v, heap));
          tr.append(kt, el('td', 'muted', '→'), vt);
          table.append(tr);
        }
        if (o.entries.length < o.len) table.append(el('tr', 'muted small', `… ${o.len - o.entries.length}개 더`));
        card.append(table);
        break;
      }
      case 'object': {
        const table = el('table', 'vars');
        const old = before?.kind === 'object' ? before.fields : undefined;
        for (const f of o.fields) {
          const pf = old?.find((x) => x.name === f.name);
          table.append(this.varRow(f, heap, !!old && (!pf || !same(pf.value, f.value))));
        }
        card.append(table);
        break;
      }
      case 'opaque':
        card.append(el('p', 'muted small', '라이브러리 내부 구조는 펼치지 않습니다.'));
        break;
    }
    return card;
  }

  /** 배열·리스트를 칸으로. 정수 지역 변수가 가리키는 칸 아래에 변수 이름을 단다. */
  private cells(items: Value[], len: number, heap: Record<string, HeapObj>, old: Value[] | undefined,
    locals: Var[], kind: string): HTMLElement {
    const wrap = el('div', 'cells-wrap');
    const row = el('div', 'cells');
    const pointers = new Map<number, string[]>();
    for (const v of locals) {
      if (v.value.t === 'num' && !v.value.float && v.value.v !== null && Number.isInteger(v.value.v)) {
        const i = v.value.v;
        if (i >= 0 && i < items.length && /^(i|j|k|l|r|m|lo|hi|left|right|mid|low|high|idx|index|start|end|top|front|rear|p|q)$/i.test(v.name)) {
          pointers.set(i, [...(pointers.get(i) ?? []), v.name]);
        }
      }
    }
    if (kind === 'stack') wrap.append(el('div', 'cells-note muted small', '아래 ← → 위(top)'));
    if (kind === 'deque') wrap.append(el('div', 'cells-note muted small', '앞(first) ← → 뒤(last)'));
    items.forEach((v, i) => {
      const cell = el('div', 'cell');
      if (old && (i >= old.length || !same(old[i], v))) cell.classList.add('changed');
      if (pointers.has(i)) cell.classList.add('pointed');
      cell.append(el('div', 'idx', String(i)));
      const val = el('div', 'cv');
      val.append(this.valueNode(v, heap));
      cell.append(val);
      const ps = pointers.get(i);
      cell.append(el('div', 'ptr', ps ? `↑ ${ps.join(', ')}` : ''));
      row.append(cell);
    });
    if (items.length < len) row.append(el('div', 'cell more muted', `… +${len - items.length}`));
    if (len === 0) row.append(el('div', 'cell empty muted', '(비어 있음)'));
    wrap.append(row);
    return wrap;
  }
}

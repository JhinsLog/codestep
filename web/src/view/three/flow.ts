// 값이 어디서 왔는지 추정한다: "t = x[j]"가 실행됐으면 x[j] 칸에서 t로 값이 날아가게.
//
// 기록(Trace)에는 "값이 바뀌었다"만 있고 "어디서 왔다"는 없다. 그래서 방금 실행한 줄의
// 글자를 보고 오른쪽 식이 단순할 때(변수 하나, 배열 칸 하나, 컬렉션 꺼내기, 함수 반환)만
// 출처를 정한다. 확실하지 않으면 출처 없음 — 그 자리에서 값이 바뀌는 효과만 낸다.
import type { Value } from '../../trace/types';

export interface Source {
  key: string;
  kind: 'var' | 'cell' | 'field' | 'ret';
  name: string;         // 변수·필드 이름 (칸이면 '')
  holder?: string;      // 칸·필드가 속한 객체 id
  frame?: string;       // 변수가 속한 프레임 키
  idx?: number;         // 칸 번호
  value: Value;
}

export interface Dest {
  kind: 'var' | 'cell' | 'field' | 'key' | 'val';
  name: string;
  holder?: string;
  frame?: string;
  idx?: number;
  isNew: boolean;       // 이번 단계에 새로 생긴 칸·변수
}

export interface Ctx {
  line: string;                                  // 방금 실행한 줄
  owners: Map<string, string[]>;                 // 객체 id → 그 객체를 가리키는 이름들
  kinds: Map<string, string>;                    // 객체 id → array/list/stack/…
  oldLens: Map<string, number>;                  // 객체 id → 이전 단계의 원소 수
  vars: Map<string, Value>;                      // 지금 프레임의 이전 값들 (인덱스 계산용)
  sources: Source[];
}

export function sameValue(a: Value, b: Value): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 최상위 대입 기호(=)의 위치. ==, <=, >=, != 는 대입이 아니다 */
function assignAt(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      for (i++; i < s.length && s[i] !== q; i++) if (s[i] === '\\') i++;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '=' && depth === 0) {
      const p = s[i - 1] ?? '';
      if (s[i + 1] === '=' || '=<>!'.includes(p)) { if (s[i + 1] === '=') i++; continue; }
      if ('+-*/%&|^'.includes(p)) return -2;   // 복합 대입: 출처 없이 그 자리에서 바뀜
      return i;
    }
  }
  return -1;
}

/** 쉼표로 나눈 최상위 인자들 */
export function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '"' || c === "'") {
      let j = i + 1;
      for (; j < s.length && s[j] !== c; j++) if (s[j] === '\\') j++;
      cur += s.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth--;
    }
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** 정수 식 계산: 숫자, 변수, + - * / % 와 괄호만. 그 밖이면 null */
export function evalIndex(expr: string, vars: Map<string, Value>): number | null {
  const toks = expr.match(/\s*([A-Za-z_$][\w$]*|\d+|[-+*/%()])/g)?.map((t) => t.trim());
  if (!toks || toks.join('') !== expr.replace(/\s+/g, '')) return null;
  let p = 0;
  const atom = (): number | null => {
    const t = toks[p++];
    if (t === undefined) return null;
    if (t === '(') { const v = sum(); return toks[p++] === ')' ? v : null; }
    if (t === '-') { const v = atom(); return v === null ? null : -v; }
    if (/^\d+$/.test(t)) return Number(t);
    const v = vars.get(t);
    return v?.t === 'num' && typeof v.v === 'number' && Number.isInteger(v.v) ? v.v : null;
  };
  const prod = (): number | null => {
    let a = atom();
    while (a !== null && (toks[p] === '*' || toks[p] === '/' || toks[p] === '%')) {
      const op = toks[p++];
      const b = atom();
      if (b === null || (op !== '*' && b === 0)) return null;
      a = op === '*' ? a * b : op === '/' ? Math.trunc(a / b) : a % b;
    }
    return a;
  };
  const sum = (): number | null => {
    let a = prod();
    while (a !== null && (toks[p] === '+' || toks[p] === '-')) {
      const op = toks[p++];
      const b = prod();
      if (b === null) return null;
      a = op === '+' ? a + b : a - b;
    }
    return a;
  };
  const v = sum();
  return p === toks.length ? v : null;
}

const lastName = (s: string) => s.split('.').at(-1) ?? s;

/** 이름이 가리키는 객체 id들 (변수 이름 또는 필드 이름) */
function holdersNamed(name: string, ctx: Ctx): string[] {
  const n = lastName(name);
  const out: string[] = [];
  for (const [id, names] of ctx.owners) if (names.includes(n)) out.push(id);
  return out;
}

const TAKE_LAST = new Set(['pop', 'removeLast', 'pollLast', 'peekLast', 'getLast']);
const TAKE_FIRST = new Set(['poll', 'remove', 'removeFirst', 'pollFirst', 'peekFirst', 'getFirst', 'element', 'peek']);

/** 식 하나가 가리키는 값의 출처 */
function sourceOfExpr(expr: string, value: Value, ctx: Ctx, dest: Dest): Source | null {
  const e = expr.trim().replace(/;$/, '').trim();
  const eq = (s: Source) => sameValue(s.value, value);

  // 형 변환 (int) x 는 벗긴다
  const cast = /^\(\s*\w+\s*\)\s*(.+)$/.exec(e);
  if (cast) return sourceOfExpr(cast[1]!, value, ctx, dest);

  // 변수·필드 하나: a, this.a, node.next.val
  if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(e)) {
    const n = lastName(e);
    const sameFrame = ctx.sources.find((s) => s.kind === 'var' && s.name === n && s.frame === dest.frame && eq(s));
    return sameFrame ?? ctx.sources.find((s) => (s.kind === 'var' || s.kind === 'field') && s.name === n && eq(s)) ?? null;
  }

  // 배열 칸: a[expr]
  const arr = /^([A-Za-z_$][\w$.]*)\s*\[(.+)\]$/.exec(e);
  if (arr) {
    const idx = evalIndex(arr[2]!, ctx.vars);
    for (const h of holdersNamed(arr[1]!, ctx)) {
      const s = ctx.sources.find((x) => x.kind === 'cell' && x.holder === h && (idx === null || x.idx === idx) && eq(x));
      if (s) return s;
    }
    return null;
  }

  // 컬렉션에서 꺼내기: list.get(i), stack.pop(), queue.poll() …
  const call = /^([A-Za-z_$][\w$.]*)\.(\w+)\s*\((.*)\)$/.exec(e);
  if (call) {
    const [, obj, method, args] = call;
    for (const h of holdersNamed(obj!, ctx)) {
      const cells = ctx.sources.filter((x) => x.kind === 'cell' && x.holder === h);
      if (cells.length === 0) continue;
      const len = ctx.oldLens.get(h) ?? cells.length;
      let idx: number | null = null;
      if (method === 'get' || method === 'elementAt') idx = evalIndex(args!, ctx.vars);
      else if (TAKE_LAST.has(method!) || (method === 'peek' && ctx.kinds.get(h) === 'stack')) idx = len - 1;
      else if (TAKE_FIRST.has(method!) && args!.trim() === '') idx = 0;
      if (idx === null) continue;
      const s = cells.find((x) => x.idx === idx && eq(x));
      if (s) return s;
    }
  }

  // 그 밖의 함수 호출: 방금 끝난 함수의 반환값
  if (/[A-Za-z_$][\w$]*\s*\(/.test(e)) return ctx.sources.find((s) => s.kind === 'ret' && eq(s)) ?? null;
  return null;
}

/** 바뀐(또는 새로 생긴) 자리 하나의 값 출처. 'drop'은 새 값이 위에서 떨어진다(리터럴 등) */
export function findSource(dest: Dest, value: Value, ctx: Ctx): Source | 'drop' | null {
  if (value.t === 'ref') return null;           // 참조는 화살표가 옮겨 가는 것으로 보인다
  const line = ctx.line.trim();

  // for (int x : xs) → xs의 칸에서
  const each = /\bfor\s*\((?:final\s+)?[\w<>[\],.?\s]+?\s+([A-Za-z_$][\w$]*)\s*:\s*([^)]+)\)/.exec(line);
  if (each && dest.kind === 'var' && dest.name === each[1]) {
    for (const h of holdersNamed(each[2]!.trim(), ctx)) {
      const s = ctx.sources.find((x) => x.kind === 'cell' && x.holder === h && sameValue(x.value, value));
      if (s) return s;
    }
    return null;
  }

  // 컬렉션에 넣기: list.add(x), stack.push(x), map.put(k, v) → 새로 생긴 칸
  const put = /([A-Za-z_$][\w$.]*)\.(add|addLast|addFirst|push|offer|offerLast|offerFirst|put|set)\s*\((.*)\)\s*;?\s*$/.exec(line);
  if (put && (dest.kind === 'cell' || dest.kind === 'key' || dest.kind === 'val')) {
    const [, obj, method, rawArgs] = put;
    if (!dest.holder || !holdersNamed(obj!, ctx).includes(dest.holder)) return null;
    const args = splitArgs(rawArgs!);
    const arg = method === 'put' ? (dest.kind === 'key' ? args[0] : args[1])
      : method === 'set' || (method === 'add' && args.length === 2) ? args[1] : args[0];
    if (arg === undefined) return null;
    return sourceOfExpr(arg, value, ctx, dest) ?? 'drop';
  }

  // for 머리에서 이미 있던 변수가 바뀌었으면 초기식이 아니라 증감식(i++) 때문이다
  if (/\bfor\s*\(/.test(line) && !dest.isNew) return null;

  // 대입: lhs = rhs
  const body = line.replace(/^.*?\bfor\s*\(/, '').replace(/^(?:return|else)\b/, '');
  const at = assignAt(body);
  if (at < 0) return null;
  const lhs = body.slice(0, at).trim();
  const rhs = body.slice(at + 1).split(';')[0]!.trim();
  // 왼쪽이 이 자리를 가리키는지 확인 (int t / t / a[j] / this.x)
  const target = lhs.replace(/\[.*\]$/, '').trim().split(/\s+/).at(-1) ?? '';
  if (dest.kind === 'var' || dest.kind === 'field') {
    if (lastName(target) !== dest.name || /\]$/.test(lhs)) return null;
  } else if (dest.kind === 'cell') {
    if (!/\]$/.test(lhs) || !dest.holder || !holdersNamed(target, ctx).includes(dest.holder)) return null;
  } else return null;

  const s = sourceOfExpr(rhs, value, ctx, dest);
  if (s) return s;
  // 리터럴 하나면 위에서 떨어뜨린다: 5, "a", 'c', true, null
  if (/^(-?\d[\w.]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)+'|true|false|null)$/.test(rhs)) return 'drop';
  return null;
}

/** 새 프레임의 매개변수 k가 호출한 쪽의 어느 값에서 왔는지: foo(a, arr[i]) */
export function argSource(callerLine: string, fn: string, cls: string | undefined, k: number,
  value: Value, ctx: Ctx, dest: Dest): Source | null {
  if (value.t === 'ref') return null;
  const name = fn === '<init>' ? `new\\s+${(cls ?? '').split('.').at(-1)}` : fn;
  const m = new RegExp(`(?:^|[^\\w$])${name}\\s*\\(`).exec(callerLine);
  if (!m) return null;
  const args = splitArgs(callerLine.slice(m.index + m[0].length));
  const arg = args[k];
  if (arg === undefined) return null;
  return sourceOfExpr(arg, value, ctx, dest);
}

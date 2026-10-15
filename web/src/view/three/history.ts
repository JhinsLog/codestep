// 회차별 기록: 바깥 반복문이 한 바퀴 돌 때마다 배열·리스트의 모습을 남긴다.
//
// 이중 반복문(예: 버블 정렬)에서 안쪽 반복이 끝나고 바깥 변수(i)가 바뀌는 순간마다
// 배열이 어떻게 달라졌는지 쌓아 두면, "한 바퀴에 큰 값 하나가 끝으로 간다" 같은
// 흐름이 한눈에 보인다.
//
// 기록(Trace)에는 반복문 구조가 없어서 소스의 중괄호로 반복문 범위를 찾고, 안에 다른
// 반복문을 품은 것을 "바깥 반복문"으로 본다. 실행이 그 머리 줄에 다시 돌아올 때가
// 한 바퀴가 끝난 때다.
import type { Step, Value } from '../../trace/types';

export interface Loop {
  line: number;        // 머리 줄 (1부터)
  end: number;         // 몸체의 마지막 줄
  outer: boolean;      // 안에 다른 반복문이 있다
}

export interface Snapshot {
  step: number;        // 기록한 단계 번호
  label: string;       // '시작', '1회차 후', …
  loopLine: number;
  items: Value[];
}

const LOOP_HEAD = /^\s*(?:\}\s*)?(?:for|while)\s*\(/;

/** 소스에서 반복문 범위를 찾는다 (중괄호 기준, 문자열·주석은 지운 뒤) */
export function findLoops(source: string[]): Loop[] {
  const loops: Loop[] = [];
  // braced: 몸체가 { } 로 묶였다 / waiting: 중괄호 없는 몸체가 또 다른 반복문이라 그것이 끝나기를 기다린다
  const open: { loop: Loop; depth: number; braced: boolean; waiting: boolean }[] = [];
  const close = (end: number) => {
    const o = open.pop();
    if (!o) return;
    o.loop.end = end;
    const parent = open.at(-1);
    if (parent && parent.waiting) close(end);
  };
  let depth = 0;
  let inBlock = false;
  source.forEach((raw, i) => {
    const n = i + 1;
    let line = raw.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    if (inBlock) {
      const e = line.indexOf('*/');
      if (e < 0) return;
      line = line.slice(e + 2);
      inBlock = false;
    }
    line = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
    const bs = line.indexOf('/*');
    if (bs >= 0) { line = line.slice(0, bs); inBlock = true; }
    const text = line.trim();
    const head = LOOP_HEAD.test(line) && !/^\}?\s*while\b.*;$/.test(text);

    // 중괄호 없는 반복문의 몸체: 다음 문장 하나 (그 문장이 반복문이면 그것이 끝날 때까지)
    const top = open.at(-1);
    if (top && !top.braced && !top.waiting && n > top.loop.line && text !== '' && !text.startsWith('{')) {
      if (head) top.waiting = true;
      else close(n);
    }

    if (head) {
      for (const o of open) o.loop.outer = true;
      const loop: Loop = { line: n, end: n, outer: false };
      loops.push(loop);
      open.push({ loop, depth, braced: false, waiting: false });
    }
    for (const ch of line) {
      if (ch === '{') {
        const o = open.at(-1);
        if (o && !o.braced && !o.waiting && o.depth === depth) o.braced = true;
        depth++;
      } else if (ch === '}') {
        depth--;
        const o = open.at(-1);
        if (o && o.braced && depth === o.depth) close(n);
      }
    }
  });
  return loops;
}

/** 전체 기록에서 바깥 반복문이 한 바퀴 돌 때마다의 배열 모습. 객체 id → 차례대로 */
export function snapshots(steps: Step[], source: string[]): Map<string, Snapshot[]> {
  const outer = findLoops(source).filter((l) => l.outer);
  const out = new Map<string, Snapshot[]>();
  if (outer.length === 0) return out;
  const counts = new Map<string, number>();

  steps.forEach((s, k) => {
    if (s.event !== 'line') return;
    const loop = outer.find((l) => l.line === s.line);
    if (!loop) return;
    const depth = s.frames.length;
    // 같은 프레임에서 바로 앞에 실행한 줄. 반복문 몸체 안이었으면 한 바퀴를 마치고 돌아온 것
    let prevLine: number | undefined;
    for (let j = k - 1; j >= 0; j--) {
      const d = steps[j]!.frames.length;
      if (d < depth) break;
      if (d === depth) { prevLine = steps[j]!.line; break; }
    }
    if (prevLine === loop.line) return;
    const back = prevLine !== undefined && prevLine > loop.line && prevLine <= loop.end;
    const ck = `${depth}:${loop.line}`;
    const n = back ? (counts.get(ck) ?? 0) + 1 : 0;
    counts.set(ck, n);
    const label = n === 0 ? '시작' : `${n}회차 후`;
    for (const [id, o] of Object.entries(s.heap)) {
      if (o.kind !== 'array' && o.kind !== 'list') continue;
      const list = out.get(id) ?? [];
      list.push({ step: k, label, loopLine: loop.line, items: o.items.slice() });
      out.set(id, list);
    }
  });

  // 한 번도 달라진 적이 없는 배열은 기록할 필요가 없다
  for (const [id, list] of out) {
    const first = JSON.stringify(list[0]?.items);
    if (list.every((x) => JSON.stringify(x.items) === first)) out.delete(id);
  }
  return out;
}

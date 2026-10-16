// 단계 해설: 직전 단계와 지금 단계를 비교해 "방금 무슨 일이 일어났는지"를 문장으로 풀어 준다.
// 2D·3D 무대가 같이 쓴다. 문장 속 용어(호출 스택, 힙, 참조 …)를 누르면 무대의 그 자리를 빛낸다.
import type { HeapObj, Step, Value } from '../trace/types';
import { el, fnLabel, showValue } from './stage';

/** 무대에서 빛낼 자리 */
export interface Spot { kind: 'stack' | 'frame' | 'heap' | 'obj' | 'var' | 'out'; id?: string; name?: string }

export type Term = 'stack' | 'frame' | 'local' | 'param' | 'heap' | 'ref' | 'field' | 'gc' | 'ret' | 'out' | 'cond' | 'changed' | 'pointer';

export const TERMS: Record<Term, { name: string; spot?: Spot['kind']; text: (lang?: string) => string }> = {
  stack: { name: '호출 스택', spot: 'stack', text: () => '함수를 부를 때마다 그 함수의 작업 공간(프레임)이 위에 하나씩 쌓이고, 함수가 끝나면 맨 위 것부터 빠집니다(나중에 들어온 것이 먼저 나감, LIFO). 맨 위가 지금 실행 중인 함수입니다.' },
  frame: { name: '프레임', spot: 'frame', text: () => '함수 호출 하나의 작업 공간입니다. 매개변수와 지역 변수, 끝나면 돌아갈 위치를 담습니다. 같은 함수를 두 번 부르면(재귀) 프레임도 두 개 생깁니다.' },
  local: { name: '지역 변수', spot: 'frame', text: () => '함수(프레임) 안에서 선언한 변수입니다. 그 함수가 끝나면 프레임과 함께 사라집니다.' },
  param: { name: '매개변수', spot: 'frame', text: () => '함수를 부를 때 넘긴 값이 "복사"되어 들어간 지역 변수입니다. 기본형이면 값이 복사되어 원본에 영향이 없고, 참조형이면 같은 객체를 가리키는 참조가 복사됩니다.' },
  heap: { name: '힙', spot: 'heap', text: (l) => (l === 'c' ? 'malloc 등으로 직접 할당한 메모리 영역입니다. 함수가 끝나도 남아 있으므로 free로 돌려줘야 합니다.' : 'new로 만든 객체·배열·리스트가 사는 곳입니다. 함수가 끝나도 남아 있고, 가리키는 참조가 하나라도 있으면 계속 살아 있습니다.') },
  ref: { name: '참조(→)', spot: 'heap', text: (l) => (l === 'c' ? '포인터 변수에는 값 대신 다른 칸의 주소가 들어 있고, 화살표가 그 칸을 가리킵니다.' : '객체형 변수에는 객체 자체가 아니라 힙에 있는 객체를 가리키는 값(참조)이 들어 있습니다. 화살표(→)가 가리키는 곳이 실제 객체이고, 두 변수가 같은 객체를 가리킬 수 있습니다.') },
  pointer: { name: '포인터', spot: 'frame', text: () => '다른 변수·배열 칸의 주소를 담는 변수입니다. *p는 그 주소에 있는 값, p+1은 다음 원소의 주소입니다.' },
  field: { name: '필드', spot: 'heap', text: () => '객체 안에 들어 있는 변수입니다. 같은 클래스라도 객체마다 따로 가집니다(static 제외).' },
  gc: { name: 'GC 대상', spot: 'heap', text: () => '아무 변수도 가리키지 않게 된 객체는 더 이상 쓸 수 없어서 가비지 컬렉터가 메모리를 회수합니다.' },
  ret: { name: '반환값', spot: 'frame', text: () => 'return으로 함수가 돌려주는 값입니다. 프레임은 사라지고 값은 호출한 쪽으로 전달됩니다.' },
  out: { name: '출력', spot: 'out', text: () => 'System.out·print·printf로 찍은 글입니다. 왼쪽 아래 출력 칸에 쌓입니다.' },
  cond: { name: '조건·반복', text: () => 'if·while·for의 조건을 계산해 참이면 블록 안으로, 거짓이면 건너뛰거나 반복을 끝냅니다. 다음에 실행할 줄로 결과를 알 수 있습니다.' },
  changed: { name: '노란 표시', text: () => '방금 값이 바뀌거나 새로 생긴 자리입니다.' },
};

/** 문장 조각: 글 또는 누를 수 있는 용어 */
export type Piece = string | { term: Term; text?: string; spot?: Spot };
export interface Narration { head: string; lines: Piece[][] }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isRef = (v: Value) => v.t === 'ref';
const kindName: Record<HeapObj['kind'], string> = { array: '배열', list: '리스트', stack: '스택', deque: '덱', set: '집합', map: '맵', object: '객체', opaque: '객체' };

function valText(v: Value, heap: Record<string, HeapObj>): string {
  if (v.t === 'ref') { const o = heap[v.id]; return o ? `${o.type} ${kindName[o.kind]}를 가리키는 참조` : showValue(v, heap); }
  return showValue(v, heap);
}

export function narrate(step: Step, prev: Step | undefined, src: string[], stdout: string, lang?: string): Narration {
  const lines: Piece[][] = [];
  const inner = step.frames.at(-1);
  const code = (n: number) => (src[n - 1] ?? '').trim();
  const q = (n: number) => (code(n) ? ` \`${code(n)}\`` : '');
  if (!prev) {
    return { head: `프로그램 시작 — ${inner ? fnLabel(inner.fn) : ''}부터 실행합니다`, lines: [[{ term: 'stack' }, `에 첫 `, { term: 'frame' }, `(${inner ? fnLabel(inner.fn) : ''})이 놓였습니다. 이제 ${step.line}줄을 실행할 차례입니다.`]] };
  }
  const pInner = prev.frames.at(-1);
  let head: string;
  if (step.event === 'call') {
    head = `${fnLabel(inner?.fn ?? '')} 호출 — ${prev.line}줄${q(prev.line)}`;
    lines.push([{ term: 'stack' }, ' 맨 위에 새 ', { term: 'frame' }, `(${fnLabel(inner?.fn ?? '')})이 쌓였습니다. 이 함수가 끝날 때까지 아래 프레임(${fnLabel(pInner?.fn ?? '')})은 기다립니다.`]);
    const params = inner?.locals ?? [];
    if (params.length) lines.push([{ term: 'param' }, `로 받은 값: ${params.map((v) => `${v.name} = ${valText(v.value, step.heap)}`).join(', ')}`]);
    if (params.some((v) => isRef(v.value))) lines.push(['참조형 매개변수는 객체를 복사하지 않고 ', { term: 'ref' }, '만 복사합니다 → 함수 안에서 객체를 고치면 원본도 바뀝니다.']);
    return { head, lines };
  }
  if (step.event === 'return') {
    head = `${fnLabel(inner?.fn ?? '')} 반환 — ${step.line}줄`;
    if (step.ret) lines.push([`${fnLabel(inner?.fn ?? '')}이(가) `, { term: 'ret' }, ` ${valText(step.ret, step.heap)}을(를) 돌려줍니다.`]);
    lines.push(['이 ', { term: 'frame' }, '은 곧 ', { term: 'stack' }, '에서 빠지고, 지역 변수도 함께 사라집니다. 실행은 부른 곳으로 돌아갑니다.']);
    return { head, lines };
  }
  if (step.event === 'exception') {
    return { head: `예외 발생 — ${step.line}줄`, lines: [[`${step.exception ?? ''}: 처리하는 catch가 없으면 프로그램이 여기서 멈춥니다.`]] };
  }
  // 줄 하나를 실행한 결과
  const back = step.frames.length < prev.frames.length;
  const ran = back ? step.frames[step.frames.length - 1]!.line : prev.line;
  head = back ? `${fnLabel(pInner?.fn ?? '')}에서 돌아옴 — ${ran}줄${q(ran)}` : `${ran}줄 실행 —${q(ran) || ' (빈 줄)'}`;
  if (back) lines.push([`${fnLabel(pInner?.fn ?? '')}의 `, { term: 'frame' }, '이 ', { term: 'stack' }, '에서 빠졌습니다. 돌려받은 값으로 이 줄의 나머지를 계산했습니다.']);

  // 지역 변수: 같은 프레임에서 새로 생기거나 바뀐 것
  const now = step.frames[step.frames.length - 1];
  const before = prev.frames[step.frames.length - 1];
  if (now && before && now.fn === before.fn) {
    for (const v of now.locals) {
      const o = before.locals.find((x) => x.name === v.name);
      if (!o) {
        const pc: Piece[] = [{ term: 'local', text: `변수 ${v.name}`, spot: { kind: 'var', name: v.name } }, `(${v.type})이(가) 생겼습니다 = ${valText(v.value, step.heap)}`];
        if (isRef(v.value)) pc.push(' — 화살표 ', { term: 'ref', text: '참조(→)', spot: { kind: 'obj', id: (v.value as { id: string }).id } }, '가 힙의 객체를 가리킵니다.');
        lines.push(pc);
      } else if (!same(o.value, v.value)) {
        lines.push([{ term: 'changed', text: `${v.name}`, spot: { kind: 'var', name: v.name } }, ` 값이 바뀜: ${valText(o.value, prev.heap)} → ${valText(v.value, step.heap)}`]);
      }
    }
  }
  // 힙: 새 객체, 바뀐 필드·칸, 사라진 객체
  for (const [id, o] of Object.entries(step.heap)) {
    const old = prev.heap[id];
    if (!old) {
      const detail = o.kind === 'object' ? ` (${o.fields.map((f) => `${f.name} = ${showValue(f.value, step.heap)}`).join(', ')})` : 'len' in o ? ` (크기 ${o.len})` : '';
      lines.push([{ term: 'heap', text: '힙', spot: { kind: 'obj', id } }, `에 ${o.type} ${kindName[o.kind]}가 새로 만들어졌습니다${detail}.`]);
      continue;
    }
    if (o.kind === 'object' && old.kind === 'object') {
      for (const f of o.fields) {
        const pf = old.fields.find((x) => x.name === f.name);
        if (pf && !same(pf.value, f.value)) lines.push([{ term: 'field', text: `${o.type}의 ${f.name}`, spot: { kind: 'obj', id } }, ` 필드가 바뀜: ${showValue(pf.value, prev.heap)} → ${showValue(f.value, step.heap)}`]);
      }
    } else if ('items' in o && old && 'items' in old) {
      const ch = o.items.map((v, i) => [i, v, old.items[i]] as const).filter(([, v, b]) => !same(v, b));
      if (o.len !== old.len) lines.push([{ term: 'heap', text: `${o.type} ${kindName[o.kind]}`, spot: { kind: 'obj', id } }, ` 크기가 ${old.len} → ${o.len}(으)로 바뀌었습니다.`]);
      else for (const [i, v, b] of ch.slice(0, 4)) lines.push([{ term: 'changed', text: `[${i}]번 칸`, spot: { kind: 'obj', id } }, ` 값이 바뀜: ${b ? showValue(b, prev.heap) : '(없음)'} → ${showValue(v, step.heap)}`]);
    } else if (o.kind === 'map' && old.kind === 'map' && !same(o.entries, old.entries)) {
      lines.push([{ term: 'heap', text: `${o.type} 맵`, spot: { kind: 'obj', id } }, ` 내용이 바뀌었습니다 (항목 ${old.len} → ${o.len}개).`]);
    }
  }
  if (!back) for (const id of Object.keys(prev.heap)) if (!step.heap[id]) lines.push([`${prev.heap[id]!.type} ${kindName[prev.heap[id]!.kind]}를 가리키는 변수가 없어졌습니다 → `, { term: 'gc' }]);
  // 출력
  const said = stdout.slice(prev.out, step.out);
  if (said) lines.push([{ term: 'out', text: '화면에 출력', spot: { kind: 'out' } }, `: ${JSON.stringify(said.length > 80 ? `${said.slice(0, 79)}…` : said)}`]);
  // 바뀐 것이 없으면 조건·반복 판단
  if (!lines.length) {
    const c = code(ran);
    if (/^(\}\s*)?(else\s+)?if\b|^while\b|^for\b|^elif\b|^\}?\s*while\b|^do\b/.test(c)) {
      const into = step.line > ran && step.line <= ran + 2;
      lines.push([{ term: 'cond' }, `을(를) 계산했습니다 → 다음은 ${step.line}줄${into ? ' (조건이 참이라 블록 안으로)' : step.line < ran ? ' (반복의 처음으로)' : ' (조건이 거짓이라 건너뜀)'}.`]);
    } else lines.push([`눈에 보이는 값의 변화는 없습니다. 다음은 ${step.line}줄입니다.`]);
  }
  return { head, lines };
}

/** 해설 칸을 그린다. onTerm: 용어를 눌렀을 때 */
export function narrationView(n: Narration, onTerm: (t: Term, spot?: Spot) => void): HTMLElement[] {
  const h = el('div', 'narr-head');
  h.textContent = n.head;
  const ul = el('ul', 'narr-list');
  for (const ln of n.lines) {
    const li = el('li');
    for (const p of ln) {
      if (typeof p === 'string') { li.append(p); continue; }
      const b = el('button', 'narr-term', p.text ?? TERMS[p.term].name);
      b.title = TERMS[p.term].name;
      b.addEventListener('click', () => onTerm(p.term, p.spot ?? (TERMS[p.term].spot ? { kind: TERMS[p.term].spot! } : undefined)));
      li.append(b);
    }
    ul.append(li);
  }
  return [h, ul];
}


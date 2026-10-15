// 이진 트리 순회와 수식 표기 변환 (중위 → 후위·전위).

export interface TNode { id: number; v: string; l: TNode | null; r: TNode | null }
export type Order = 'pre' | 'in' | 'post';
export const ORDER_NAME: Record<Order, string> = { pre: '전위(Preorder)', in: '중위(Inorder)', post: '후위(Postorder)' };

/** 레벨 순서 목록으로 트리를 만든다. '-'는 빈 자리 */
export function fromLevel(tokens: string[]): TNode | null {
  const nodes = tokens.map((v, i) => (v === '-' ? null : { id: i, v, l: null, r: null } as TNode));
  nodes.forEach((n, i) => {
    if (!n) return;
    n.l = nodes[2 * i + 1] ?? null;
    n.r = nodes[2 * i + 2] ?? null;
  });
  return nodes[0] ?? null;
}

export interface VisitStep { node: TNode; seq: string[]; note: string }

export function traverse(root: TNode | null, order: Order): VisitStep[] {
  const out: VisitStep[] = [];
  const seq: string[] = [];
  const visit = (n: TNode) => {
    seq.push(n.v);
    out.push({ node: n, seq: seq.slice(), note: `${n.v} 방문` });
  };
  const go = (n: TNode | null) => {
    if (!n) return;
    if (order === 'pre') visit(n);
    go(n.l);
    if (order === 'in') visit(n);
    go(n.r);
    if (order === 'post') visit(n);
  };
  go(root);
  const rule = { pre: '루트 → 왼쪽 → 오른쪽', in: '왼쪽 → 루트 → 오른쪽', post: '왼쪽 → 오른쪽 → 루트' }[order];
  out.forEach((s) => { s.note = `${s.note} (${rule})`; });
  return out;
}

// ── 수식 ──

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };

export interface ConvStep { token: string; stack: string[]; output: string[]; note: string }

/** 중위 → 후위 (스택 사용). 피연산자는 한 글자 또는 숫자 */
export function toPostfix(infix: string): ConvStep[] {
  const tokens = infix.replace(/\s+/g, '').match(/[A-Za-z]|\d+|[-+*/^()]/g) ?? [];
  const stack: string[] = [];
  const output: string[] = [];
  const steps: ConvStep[] = [];
  const snap = (token: string, note: string) => steps.push({ token, stack: stack.slice(), output: output.slice(), note });
  for (const tk of tokens) {
    if (/^[A-Za-z\d]/.test(tk)) {
      output.push(tk);
      snap(tk, `피연산자 ${tk}는 바로 출력`);
    } else if (tk === '(') {
      stack.push(tk);
      snap(tk, '( 는 스택에 넣는다');
    } else if (tk === ')') {
      const popped: string[] = [];
      while (stack.length && stack.at(-1) !== '(') { const o = stack.pop()!; output.push(o); popped.push(o); }
      stack.pop();
      snap(tk, `) 를 만나면 ( 까지 꺼내 출력${popped.length ? `: ${popped.join(' ')}` : ''}`);
    } else {
      const popped: string[] = [];
      while (stack.length && stack.at(-1) !== '(' && (PREC[stack.at(-1)!]! > PREC[tk]! || (PREC[stack.at(-1)!] === PREC[tk] && tk !== '^'))) {
        const o = stack.pop()!;
        output.push(o);
        popped.push(o);
      }
      stack.push(tk);
      snap(tk, popped.length ? `${tk}보다 우선순위가 같거나 높은 ${popped.join(' ')}를 꺼내 출력하고 ${tk}를 넣는다` : `연산자 ${tk}를 스택에 넣는다`);
    }
  }
  if (stack.length) {
    while (stack.length) output.push(stack.pop()!);
    snap('끝', '남은 연산자를 모두 꺼내 출력');
  }
  return steps;
}

/** 후위식으로 수식 트리를 만든다 (전위 표기를 구하거나 트리를 그릴 때) */
export function exprTree(postfix: string[]): TNode | null {
  const st: TNode[] = [];
  let id = 0;
  for (const tk of postfix) {
    if (PREC[tk] !== undefined) {
      const r = st.pop() ?? null;
      const l = st.pop() ?? null;
      st.push({ id: id++, v: tk, l, r });
    } else st.push({ id: id++, v: tk, l: null, r: null });
  }
  return st.pop() ?? null;
}

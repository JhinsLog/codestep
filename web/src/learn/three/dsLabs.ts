// 자료구조 3D 실습: 해시 테이블(충돌·체이닝·선형 조사), 이진 트리 순회, 수식 표기 변환(스택·수식 트리).
import { Object3D, Vector3 } from 'three';
import { exprTree, fromLevel, traverse, type Order, type TNode } from '../../exam/sims/tree';
import { sleep, type Viz } from '../core';
import { hsl } from './adapt';
import type { SyncOpts, Want } from './keyed';
import { base, hopAll } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

// ───────────────────────── 해시 테이블 ─────────────────────────

const KEYS = [15, 22, 8, 29, 11, 36, 4];
const N = 7;
const HI: Record<string, Info> = {
  bucket: { title: '버킷 (Bucket)', sub: '해시 주소', body: '해시 함수가 계산한 주소의 칸입니다. 서로 다른 키가 같은 버킷으로 계산되면 충돌(Collision), 그 키들을 동의어(Synonym)라고 합니다.' },
  fn: { title: '해시 함수', sub: 'h(k) = k mod 7', body: '키를 넣으면 주소(버킷 번호)를 바로 계산해 줍니다. 그래서 찾을 때도 처음부터 훑지 않고 계산 한 번으로 갑니다. 대표적인 방법: 제산법(나머지), 폴딩, 제곱법, 기수 변환.' },
  key: { title: '키', sub: 'Key', body: '저장할 값입니다. 해시 함수를 거쳐 버킷 번호가 정해집니다.' },
};

export function hashLab(): Viz {
  return lab({ title: '해시 테이블 3D', en: 'h(k) = k mod 7 · Collision · Chaining · Linear Probing', height: 470, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    const BX = (i: number) => -6 + i * 2, BZ = 0;
    const MACH = V(0, 0, 3.2);
    let mode: 'chain' | 'probe' = 'chain';
    let next = 0;
    // 넣은 키: 버킷 → 키 목록(체이닝) / 칸 → 키(선형 조사)
    let chain: number[][] = [];
    let slot: (number | null)[] = [];
    const where = (key: number): [number, number] | null => {
      if (mode === 'chain') { for (let i = 0; i < N; i++) { const d = chain[i]!.indexOf(key); if (d >= 0) return [i, d]; } return null; }
      const i = slot.indexOf(key);
      return i >= 0 ? [i, 0] : null;
    };
    const posOf = (i: number, d: number) => V(BX(i), 0.12, BZ - 1.25 - d * 1.15);
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      for (let i = 0; i < N; i++) {
        out.push({ key: `bk:${i}`, kind: 'block', pos: V(BX(i), 0, BZ), size: [1.6, 0.35, 0.9], color: P.accent, text: `[${i}]`, textColor: '#ffffff', info: HI.bucket });
        if (mode === 'chain') chain[i]!.forEach((_key, d) => {
          const a = d === 0 ? V(BX(i), 0.3, BZ - 0.45) : posOf(i, d - 1).setY(0.3).add(V(0, 0, -0.42)), z = posOf(i, d).setY(0.3).add(V(0, 0, 0.42));
          out.push({ key: `ln:${i}:${d}`, kind: 'obj', pos: a.clone().add(z).multiplyScalar(0.5), sig: `${a.toArray()}|${z.toArray()}`, make: () => w.bar(a, z, 0x94a3b8, 0.05, 0.9) });
        });
      }
      KEYS.forEach((key, j) => {
        const at = where(key);
        const p = at ? posOf(at[0], at[1]) : j >= next ? V(-6 + (j - next) * 1.25, 0.12, 4.8) : null;
        if (!p) return;
        out.push({ key: `k:${key}`, kind: 'block', pos: p, size: [1.1, 0.45, 0.8], color: hsl(key * 23 + 180, 0.55, 0.5), text: String(key), textColor: '#ffffff', info: HI.key });
      });
      out.push({ key: 'fn', kind: 'block', pos: MACH, size: [3.2, 0.6, 1.0], color: 0x334155, text: 'h(k) = k mod 7', textColor: '#ffffff', info: HI.fn });
      out.push({ key: 'mode', kind: 'sign', pos: V(-7.8, 0.4, BZ), runs: [{ text: mode === 'chain' ? '체이닝' : '선형 조사', color: '#ffffff', weight: 800, size: 40 }], height: 0.42, bg: hex(mode === 'chain' ? P.good : P.warn) });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const mark = async (text: string, at: Vector3, color = w.pal.accent) => {
      const s = w.sign([{ text, color: '#ffffff', weight: 800, size: 40 }], 0.46, hex(color));
      s.position.copy(at);
      root.add(s);
      b.temp.add(s);
      await w.pop(s, 250);
      return s;
    };
    const unmark = (s: Object3D) => { b.temp.delete(s); void w.vanish(s, 'shrink', 250); };

    async function insert() {
      if (next >= KEYS.length) { l.say('모든 키를 넣었습니다. "찾기"를 눌러 보거나 방식을 바꿔 보세요.', 'info'); return false; }
      const key = KEYS[next]!;
      const h = key % N;
      const o = k.get(`k:${key}`)!;
      l.code(`h(${key}) = ${key} mod 7 = ${h}`);
      await w.move(o, MACH.clone().add(V(0, 0.9, 0)), 600, 0.8);
      void w.flash(k.get('fn')!, w.pal.accent, 500);
      const m = await mark(`${key} mod 7 = ${h}`, MACH.clone().add(V(0, 2.1, 0)));
      await w.move(o, V(BX(h), 1.1, BZ + 0.2), 650, 1);
      unmark(m);
      next++;
      if (mode === 'chain') {
        const coll = chain[h]!.length > 0;
        if (coll) await w.flash(k.get(`bk:${h}`)!, w.pal.bad, 500);
        chain[h]!.push(key);
        await draw({ ms: 600 });
        l.say(coll ? `${h}번 버킷에 이미 ${chain[h]!.slice(0, -1).join(', ')}이(가) 있어 충돌! 체이닝은 같은 버킷 뒤에 연결 리스트로 이어 붙입니다.` : `${h}번 버킷이 비어 있어 바로 들어갔습니다.`, coll ? 'bad' : 'ok');
      } else {
        let i = h, tries = 0;
        while (slot[i] !== null && tries < N) {
          await w.flash(k.get(`bk:${i}`)!, w.pal.bad, 350);
          i = (i + 1) % N; tries++;
          await w.move(o, V(BX(i), 1.1, BZ + 0.2), 380, 0.6);
        }
        slot[i] = key;
        await draw({ ms: 500 });
        l.say(tries ? `${h}번이 차 있어 다음 칸으로 ${tries}번 옮겨 ${i}번에 넣었습니다(선형 조사). 이렇게 한쪽에 몰리는 것을 군집화(Clustering)라 합니다.` : `${h}번 버킷이 비어 있어 바로 들어갔습니다.`, tries ? 'bad' : 'ok');
      }
      return true;
    }
    async function find(key: number) {
      if (!where(key)) { l.say(`${key}를 먼저 넣어 주세요(모두 넣기).`, 'info'); return; }
      const h = key % N;
      l.code(`찾기: h(${key}) = ${h}`);
      const pr = w.sphere(0.22, 0xfacc15, 0.9);
      pr.position.copy(MACH).add(V(0, 1.2, 0));
      root.add(pr);
      b.temp.add(pr);
      await w.move(pr, V(BX(h), 1.0, BZ), 600, 0.8);
      let n = 0;
      if (mode === 'chain') {
        for (let d = 0; d < chain[h]!.length; d++) {
          n++;
          const o = k.get(`k:${chain[h]![d]}`)!;
          await w.move(pr, o.position.clone().add(V(0, 0.9, 0)), 400);
          const hit = chain[h]![d] === key;
          await w.flash(o, hit ? w.pal.good : w.pal.bad, 380);
          if (hit) break;
        }
      } else {
        let i = h;
        while (true) {
          n++;
          const o = k.get(`k:${slot[i]}`)!;
          await w.move(pr, o.position.clone().add(V(0, 0.9, 0)), 400);
          const hit = slot[i] === key;
          await w.flash(o, hit ? w.pal.good : w.pal.bad, 380);
          if (hit) break;
          i = (i + 1) % N;
        }
      }
      b.temp.delete(pr);
      await w.vanish(pr, 'shrink', 250);
      l.say(`${key}: 해시로 ${h}번에 바로 간 뒤 ${n}번 비교해 찾았습니다. 충돌이 많을수록 비교가 늘어납니다.`, 'ok');
    }
    async function setMode(m: 'chain' | 'probe') {
      mode = m; next = 0;
      chain = Array.from({ length: N }, () => []);
      slot = Array(N).fill(null);
      l.code('');
      await draw({ exit: 'shrink', ms: 500 });
      w.fit(-8.6, 7.4, -6.2, 5.6);
    }
    void setMode('chain');
    return {
      hint: '"다음 키 넣기"를 누르면 키가 해시 함수를 거쳐 버킷으로 갑니다. 1번 버킷에 충돌이 몰리는 것을 보세요.',
      reset: () => setMode(mode),
      groups: [
        { name: '충돌 해결', en: 'Collision', hue: 150, cmds: [{ name: '체이닝', tip: 'Chaining', run: () => setMode('chain') }, { name: '선형 조사', tip: 'Linear Probing', run: () => setMode('probe') }] },
        { name: '넣기', en: 'Insert', hue: 210, cmds: [{ name: '다음 키 넣기', run: insert }, { name: '모두 넣기', run: async () => { while (await insert()) await sleep(350); } }] },
        { name: '찾기', en: 'Search', hue: 40, cmds: [29, 4, 11].map((x): Cmd => ({ name: `${x} 찾기`, run: () => find(x) })) },
      ],
    };
  } });
}

// ───────────────────────── 트리 공통 ─────────────────────────

function layout(root: TNode | null): Map<number, [number, number, number]> {
  const pos = new Map<number, [number, number, number]>();
  let idx = 0;
  const go = (n: TNode | null, d: number) => {
    if (!n) return;
    go(n.l, d + 1);
    pos.set(n.id, [idx++, d, 0]);
    go(n.r, d + 1);
  };
  go(root, 0);
  const cnt = idx;
  for (const [id, [i, d]] of pos) pos.set(id, [(i - (cnt - 1) / 2) * 1.55, 0, -2.6 + d * 1.75]);
  return pos;
}
function treeWants(w: import('./world').World, root: TNode | null, hi: Set<number>, cur: number | null, info: Info): Want[] {
  const out: Want[] = [];
  const pos = layout(root);
  const go = (n: TNode | null) => {
    if (!n) return;
    const [x, , z] = pos.get(n.id)!;
    const op = /^[-+*/^]$/.test(n.v);
    out.push({ key: `t:${n.id}`, kind: 'block', pos: V(x, 0, z), size: [1.05, 0.5, 1.05], color: n.id === cur ? w.pal.warn : hi.has(n.id) ? 0x64748b : op ? 0xa855f7 : w.pal.accent, text: n.v, textColor: '#ffffff', glow: n.id === cur ? 0.3 : 0, info });
    for (const c of [n.l, n.r]) {
      if (!c) continue;
      const [cx, , cz] = pos.get(c.id)!;
      const a = V(x, 0.25, z), q = V(cx, 0.25, cz);
      const dir = q.clone().sub(a).normalize();
      const p0 = a.clone().add(dir.clone().multiplyScalar(0.62)), p1 = q.clone().sub(dir.clone().multiplyScalar(0.62));
      out.push({ key: `e:${n.id}:${c.id}`, kind: 'obj', pos: p0.clone().add(p1).multiplyScalar(0.5), sig: `${p0.toArray()}|${p1.toArray()}`, make: () => w.bar(p0, p1, 0x94a3b8, 0.05, 0.9) });
      go(c);
    }
  };
  go(root);
  return out;
}

const TI: Info = { title: '이진 트리', sub: 'Binary Tree', body: '각 노드가 자식을 최대 둘(왼쪽·오른쪽) 가지는 트리입니다. 순회는 노드를 빠짐없이 한 번씩 방문하는 순서입니다.\n\n전위: 자신 → 왼쪽 → 오른쪽\n중위: 왼쪽 → 자신 → 오른쪽\n후위: 왼쪽 → 오른쪽 → 자신' };

export function treeLab(): Viz {
  return lab({ title: '이진 트리 순회 3D', en: 'Preorder · Inorder · Postorder', height: 460, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const root = fromLevel('A B C D E F G'.split(' '));
    let seen = new Set<number>(), cur: number | null = null, outSeq: TNode[] = [];
    function want(): Want[] {
      const P = w.pal;
      const out = treeWants(w, root, seen, cur, TI);
      outSeq.forEach((n, i) => out.push({ key: `o:${n.id}`, kind: 'block', pos: V(-4.2 + i * 1.4, 0.12, 3.4), size: [1.1, 0.4, 0.8], color: P.good, text: n.v, textColor: '#ffffff', info: TI }));
      out.push({ key: 'olab', kind: 'sign', pos: V(-6.1, 0.3, 3.4), runs: [{ text: '방문 순서', color: P.text, weight: 800, size: 36 }], height: 0.38, bg: hex(P.slab) });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    async function run(order: Order) {
      seen = new Set(); cur = null; outSeq = [];
      await draw({ ms: 300 });
      const rule = { pre: '자신 → 왼쪽 → 오른쪽', in: '왼쪽 → 자신 → 오른쪽', post: '왼쪽 → 오른쪽 → 자신' }[order];
      l.code(`${{ pre: '전위', in: '중위', post: '후위' }[order]} 순회: ${rule}`);
      for (const st of traverse(root, order)) {
        cur = st.node.id;
        await draw({ ms: 300 });
        await hopAll(w, [k.get(`t:${st.node.id}`)], 0.4, 350);
        const from = k.get(`t:${st.node.id}`)!.position.clone();
        seen.add(st.node.id);
        outSeq.push(st.node);
        await draw({ ms: 600, arc: 1.2, spawn: (key) => (key === `o:${st.node.id}` ? from : undefined) });
        l.say(`${st.seq.join(' ')} — ${st.note}`, 'info');
        await sleep(350);
      }
      cur = null;
      await draw({ ms: 300 });
      l.say(`${{ pre: '전위', in: '중위', post: '후위' }[order]} 순회 결과: ${outSeq.map((n) => n.v).join(' ')}. 규칙: ${rule} (재귀적으로 적용)`, 'ok');
    }
    async function reset() { seen = new Set(); cur = null; outSeq = []; await draw({ exit: 'shrink' }); w.fit(-6.4, 6.4, -3.6, 4.2); }
    void reset();
    return {
      hint: '순회 단추를 누르면 노드를 방문하는 순서대로 앞쪽 줄에 쌓입니다. "자신"을 언제 방문하느냐(앞·가운데·뒤)만 다릅니다.',
      reset,
      groups: [{ name: '순회', en: 'Traversal', hue: 200, cmds: [{ name: '전위 (Preorder)', run: () => run('pre') }, { name: '중위 (Inorder)', run: () => run('in') }, { name: '후위 (Postorder)', run: () => run('post') }] }],
    };
  } });
}

// ───────────────────────── 수식 표기 변환 ─────────────────────────

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
const NI: Record<string, Info> = {
  stack: { title: '연산자 스택', sub: 'Stack (LIFO)', body: '연산자를 잠시 쌓아 두는 곳입니다. 새 연산자보다 우선순위가 같거나 높은 연산자가 위에 있으면 먼저 꺼내 출력합니다. ( 는 ) 를 만날 때까지 바닥 역할을 합니다.' },
  out: { title: '출력', sub: '후위식(Postfix)', body: '피연산자는 바로 출력하고, 연산자는 스택에서 꺼낼 때 출력합니다. 후위식은 괄호 없이도 계산 순서가 정해집니다.' },
  in: { title: '중위식', sub: 'Infix', body: '우리가 평소 쓰는 표기(A + B)입니다. 왼쪽부터 한 토큰씩 읽습니다.' },
};

export function notationLab(): Viz {
  return lab({ title: '수식 표기 변환 3D', en: 'Infix → Postfix (Stack) · Prefix (Expression Tree)', height: 470, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    let expr = '(A+B)*C-D/E';
    let toks: string[] = [];
    // 토큰 위치: in(입력 줄) · st(스택 높이) · out(출력 칸) · gone
    let loc: { at: 'in' | 'st' | 'out' | 'gone'; i: number }[] = [];
    let tree: TNode | null = null;
    let tseen = new Set<number>(), tcur: number | null = null, tout: TNode[] = [];
    const IX = (i: number) => -5 + i * 1.05;
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      if (tree) {
        out.push(...treeWants(w, tree, tseen, tcur, { title: '수식 트리', sub: 'Expression Tree', body: '연산자가 부모, 피연산자가 잎(리프)입니다. 전위 순회하면 전위식, 중위 순회하면 중위식, 후위 순회하면 후위식이 됩니다.' }));
        tout.forEach((n, i) => out.push({ key: `po:${n.id}`, kind: 'block', pos: V(-4.6 + i * 1.05, 0.12, 3.6), size: [0.9, 0.4, 0.8], color: P.good, text: n.v, textColor: '#ffffff', info: NI.out }));
        return out;
      }
      toks.forEach((t, i) => {
        const L = loc[i]!;
        if (L.at === 'gone') return;
        const op = /^[-+*/()]$/.test(t);
        const p = L.at === 'in' ? V(IX(i), 0.12, 3.6) : L.at === 'st' ? V(-6.8, 0.12 + L.i * 0.55, -0.4) : V(-3.6 + L.i * 1.05, 0.12, -0.4);
        out.push({ key: `x:${i}`, kind: 'block', pos: p, size: [0.9, 0.48, 0.85], color: op ? 0xa855f7 : P.accent, text: t, textColor: '#ffffff', info: L.at === 'st' ? NI.stack : L.at === 'out' ? NI.out : NI.in });
      });
      // 스택 통(투명 벽)
      for (const [kk, x, z, sx, sz] of [['l', -7.35, -0.4, 0.06, 1.1], ['r', -6.25, -0.4, 0.06, 1.1], ['b', -6.8, -0.95, 1.16, 0.06]] as [string, number, number, number, number][])
        out.push({ key: `sw:${kk}`, kind: 'block', pos: V(x, 0, z), size: [sx, 2.6, sz], color: P.ghost, opacity: 0.35, info: NI.stack });
      out.push({ key: 'slab', kind: 'sign', pos: V(-6.8, 0.25, 0.75), runs: [{ text: '스택', color: P.text, weight: 800, size: 36 }], height: 0.36, bg: hex(P.slab), info: NI.stack });
      out.push({ key: 'olab', kind: 'sign', pos: V(-3.6, 0.25, 0.75), runs: [{ text: '출력(후위식) →', color: P.text, weight: 800, size: 36 }], height: 0.36, bg: hex(P.slab), info: NI.out });
      out.push({ key: 'ilab', kind: 'sign', pos: V(IX(0) - 1.4, 0.3, 3.6), runs: [{ text: '중위식', color: P.text, weight: 800, size: 36 }], height: 0.36, bg: hex(P.slab), info: NI.in });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    async function load(e: string) {
      expr = e; tree = null; tout = []; tcur = null; tseen = new Set();
      toks = e.match(/[A-Za-z]|\d+|[-+*/()]/g) ?? [];
      loc = toks.map((_t, i) => ({ at: 'in', i }));
      await draw({ exit: 'shrink', ms: 500 });
      w.fit(-8, 7, -2.6, 4.6);
    }
    async function toPost() {
      await load(expr);
      l.code(`${expr}  →  후위식`);
      const st: number[] = [];
      let outN = 0;
      const emit = async (i: number) => { loc[i] = { at: 'out', i: outN++ }; await draw({ ms: 450, arc: 0.8 }); };
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i]!;
        await hopAll(w, [k.get(`x:${i}`)], 0.4, 300);
        if (/^[A-Za-z\d]/.test(t)) { await emit(i); l.say(`피연산자 ${t}는 바로 출력합니다.`, 'info'); }
        else if (t === '(') { loc[i] = { at: 'st', i: st.length }; st.push(i); await draw({ ms: 450, arc: 0.8 }); l.say('( 는 스택에 넣습니다.', 'info'); }
        else if (t === ')') {
          const popped: string[] = [];
          while (st.length && toks[st.at(-1)!] !== '(') { const j = st.pop()!; popped.push(toks[j]!); await emit(j); }
          const lp = st.pop();
          if (lp !== undefined) loc[lp] = { at: 'gone', i: 0 };
          loc[i] = { at: 'gone', i: 0 };
          await draw({ ms: 400, exit: 'fly' });
          l.say(`) 를 만나면 ( 까지 꺼내 출력${popped.length ? `(${popped.join(' ')})` : ''}하고, 괄호 둘은 버립니다.`, 'info');
        } else {
          const popped: string[] = [];
          while (st.length && toks[st.at(-1)!] !== '(' && PREC[toks[st.at(-1)!]!]! >= PREC[t]!) { const j = st.pop()!; popped.push(toks[j]!); await emit(j); }
          loc[i] = { at: 'st', i: st.length };
          st.push(i);
          await draw({ ms: 450, arc: 0.8 });
          l.say(popped.length ? `${t}보다 우선순위가 같거나 높은 ${popped.join(' ')}를 먼저 꺼내 출력하고 ${t}를 넣습니다.` : `연산자 ${t}를 스택에 넣습니다 (* / 가 + - 보다 우선).`, 'info');
        }
        await sleep(400);
      }
      while (st.length) { await emit(st.pop()!); await sleep(150); }
      const post = toks.map((t, i) => [t, loc[i]!] as const).filter(([, L]) => L.at === 'out').sort((a, z) => a[1].i - z[1].i).map(([t]) => t);
      l.say(`끝까지 읽은 뒤 스택에 남은 연산자를 모두 꺼냅니다. 후위식: ${post.join(' ')}`, 'ok');
      return post;
    }
    async function viaTree(order: Order) {
      // 후위식 → 수식 트리 → 순회
      const toksE = expr.match(/[A-Za-z]|\d+|[-+*/()]/g) ?? [];
      const st: string[] = [], post: string[] = [];
      for (const t of toksE) {
        if (/^[A-Za-z\d]/.test(t)) post.push(t);
        else if (t === '(') st.push(t);
        else if (t === ')') { while (st.length && st.at(-1) !== '(') post.push(st.pop()!); st.pop(); }
        else { while (st.length && st.at(-1) !== '(' && PREC[st.at(-1)!]! >= PREC[t]!) post.push(st.pop()!); st.push(t); }
      }
      while (st.length) post.push(st.pop()!);
      tree = exprTree(post);
      tout = []; tseen = new Set(); tcur = null;
      l.code(`${expr}\n수식 트리를 ${{ pre: '전위', in: '중위', post: '후위' }[order]} 순회 → ${{ pre: '전위식', in: '중위식', post: '후위식' }[order]}`);
      await draw({ exit: 'shrink', ms: 600 });
      w.fit(-6, 6, -3.6, 4.6);
      for (const s of traverse(tree, order)) {
        tcur = s.node.id;
        await draw({ ms: 250 });
        const from = k.get(`t:${s.node.id}`)!.position.clone();
        tseen.add(s.node.id);
        tout.push(s.node);
        await draw({ ms: 550, arc: 1.1, spawn: (key) => (key === `po:${s.node.id}` ? from : undefined) });
        await sleep(250);
      }
      tcur = null;
      await draw({ ms: 300 });
      l.say(`${{ pre: '전위식', in: '중위식', post: '후위식' }[order]}: ${tout.map((n) => n.v).join(' ')}. 연산자가 부모, 피연산자가 잎인 트리를 ${{ pre: '전위', in: '중위', post: '후위' }[order]} 순회하면 됩니다.`, 'ok');
    }
    void load(expr);
    return {
      hint: '"후위식 (스택)"을 누르면 중위식 토큰이 한 개씩 출력·스택으로 이동합니다. 전위식은 수식 트리를 전위 순회해서 구합니다.',
      reset: () => load(expr),
      groups: [
        { name: '수식', en: 'Expression', hue: 280, cmds: ['(A+B)*C-D/E', 'A*(B-C)+D/E', 'A+B*C'].map((e): Cmd => ({ name: e, run: async () => { await load(e); l.say(`수식 ${e}를 불러왔습니다.`, 'info'); } })) },
        { name: '변환', en: 'Convert', hue: 200, cmds: [
          { name: '후위식 (스택)', run: toPost },
          { name: '전위식 (수식 트리)', run: () => viaTree('pre') },
          { name: '후위식 (수식 트리)', run: () => viaTree('post') },
        ] },
      ],
    };
  } });
}


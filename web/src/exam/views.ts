// 이론 문제 시뮬레이터 화면. 단계마다 앞뒤로 움직이고, ▶ 재생으로 자동으로 넘길 수 있다.
import { el } from '../view/stage';
import { PAGE_ALGO_NAME, simulatePaging, type PageAlgo } from './sims/paging';
import { SCHED_ALGO_NAME, simulateSched, type Proc, type SchedAlgo } from './sims/sched';
import { ORDER_NAME, exprTree, fromLevel, toPostfix, traverse, type Order, type TNode } from './sims/tree';
import { bits, divide, maskOf, subnetInfo, toIp } from './sims/subnet';
import { preorder } from './answer';

export interface Sim {
  el: HTMLElement;
  dispose(): void;
}

// ── 단계 이동 막대 ─────────────────────────────────────

function stepper(count: number, render: (i: number) => void, label = '단계'): Sim {
  const bar = el('div', 'sim-bar');
  const btn = (text: string, title: string) => {
    const b = el('button', '', text);
    b.title = title;
    b.type = 'button';
    return b;
  };
  const first = btn('⏮', '처음');
  const prev = btn('◀', '이전 단계');
  const play = btn('▶ 재생', '자동으로 넘기기');
  play.classList.add('play');
  const next = btn('▶', '다음 단계');
  const last = btn('⏭', '끝');
  const pos = el('span', 'pos');
  bar.append(first, prev, play, next, last, pos);
  let i = 0;
  let timer = 0;
  const stop = () => {
    clearInterval(timer);
    timer = 0;
    play.textContent = '▶ 재생';
    play.classList.remove('on');
  };
  const go = (n: number) => {
    i = Math.max(0, Math.min(count - 1, n));
    pos.textContent = `${label} ${i + 1} / ${count}`;
    first.disabled = prev.disabled = i === 0;
    next.disabled = last.disabled = i === count - 1;
    render(i);
  };
  first.onclick = () => { stop(); go(0); };
  prev.onclick = () => { stop(); go(i - 1); };
  next.onclick = () => { stop(); go(i + 1); };
  last.onclick = () => { stop(); go(count - 1); };
  play.onclick = () => {
    if (timer) { stop(); return; }
    if (i >= count - 1) go(0);
    play.textContent = '⏸ 멈춤';
    play.classList.add('on');
    timer = window.setInterval(() => {
      if (i >= count - 1) { stop(); return; }
      go(i + 1);
    }, 1000);
  };
  go(0);
  return { el: bar, dispose: stop };
}

function frame(title: string, ...children: HTMLElement[]): HTMLElement {
  const box = el('div', 'sim');
  box.append(el('h3', 'sim-title', title), ...children);
  return box;
}

// ── 페이지 교체 ────────────────────────────────────────

export function pagingSim(refs: number[], frames: number, algo: PageAlgo): Sim {
  const steps = simulatePaging(refs, frames, algo);
  const table = el('table', 'pg');
  const head = el('tr');
  head.append(el('th', '', '참조'));
  const heads = refs.map((r) => { const th = el('th', '', String(r)); head.append(th); return th; });
  table.append(head);
  const cells: HTMLTableCellElement[][] = [];
  for (let f = 0; f < frames; f++) {
    const tr = el('tr');
    tr.append(el('th', 'muted', `프레임 ${f + 1}`));
    cells.push(refs.map(() => { const td = el('td'); tr.append(td); return td; }));
    table.append(tr);
  }
  const foot = el('tr', 'pg-foot');
  foot.append(el('th', 'muted', '부재'));
  const marks = refs.map(() => { const td = el('td'); foot.append(td); return td; });
  table.append(foot);
  const scroll = el('div', 'scroll');
  scroll.append(table);
  const note = el('p', 'sim-note');
  const sum = el('p', 'sim-sum');

  const s = stepper(steps.length, (i) => {
    steps.forEach((st, c) => {
      const shown = c <= i;
      heads[c]!.className = c === i ? 'cur' : shown ? '' : 'later';
      for (let f = 0; f < frames; f++) {
        const td = cells[f]![c]!;
        const v = st.frames[f];
        td.textContent = shown && v !== null && v !== undefined ? String(v) : '';
        td.className = !shown ? 'later' : f === st.slot ? (st.hit ? 'hit' : 'load') : '';
        if (c === i && f === st.slot) td.classList.add('now');
      }
      marks[c]!.textContent = shown && !st.hit ? 'F' : shown ? '·' : '';
      marks[c]!.className = shown && !st.hit ? 'fault' : '';
    });
    const st = steps[i]!;
    note.textContent = st.note;
    const hits = steps.slice(0, i + 1).filter((x) => x.hit).length;
    sum.textContent = `지금까지 부재 ${st.faults}회 · 적중 ${hits}회${i === steps.length - 1 ? ` — 최종 부재 ${st.faults}회 (부재율 ${Math.round((st.faults / refs.length) * 100)}%)` : ''}`;
  }, '참조');
  return { el: frame(`${PAGE_ALGO_NAME[algo]} · 프레임 ${frames}개`, s.el, scroll, note, sum), dispose: s.dispose };
}

// ── CPU 스케줄링 ───────────────────────────────────────

export function procTable(procs: Proc[], withPriority: boolean): HTMLElement {
  const t = el('table', 'grid small-grid');
  const h = el('tr');
  for (const c of ['프로세스', '도착 시간', '실행 시간', ...(withPriority ? ['우선순위'] : [])]) h.append(el('th', '', c));
  t.append(h);
  for (const p of procs) {
    const tr = el('tr');
    for (const v of [p.name, p.arrival, p.burst, ...(withPriority ? [p.priority ?? ''] : [])]) tr.append(el('td', '', String(v)));
    t.append(tr);
  }
  return t;
}

const PROC_COLORS = 8;

export function schedSim(procs: Proc[], algo: SchedAlgo, quantum?: number): Sim {
  const r = simulateSched(procs, algo, quantum);
  const total = r.segs.at(-1)?.end ?? 1;
  const colorOf = new Map(procs.map((p, i) => [p.name, i % PROC_COLORS]));
  const gantt = el('div', 'gantt');
  const axis = el('div', 'gantt-axis');
  const segEls = r.segs.map((sg) => {
    const d = el('div', `seg ${sg.name ? `c${colorOf.get(sg.name)}` : 'idle'}`, sg.name ?? '');
    d.style.left = `${(sg.start / total) * 100}%`;
    d.style.width = `${((sg.end - sg.start) / total) * 100}%`;
    d.title = `${sg.name ?? '쉼'} ${sg.start}~${sg.end}`;
    gantt.append(d);
    return d;
  });
  const ticks = [...new Set(r.segs.flatMap((sg) => [sg.start, sg.end]))].map((t) => {
    const s = el('span', '', String(t));
    s.style.left = `${(t / total) * 100}%`;
    axis.append(s);
    return { t, s };
  });
  const note = el('p', 'sim-note');
  const queue = el('p', 'sim-queue');
  const result = el('div', 'sched-result');

  const s = stepper(r.segs.length, (i) => {
    const now = r.segs[i]!;
    segEls.forEach((d, k) => {
      d.classList.toggle('later', k > i);
      d.classList.toggle('now', k === i);
    });
    for (const { t, s: span } of ticks) span.classList.toggle('later', t > now.end);
    const ev = [...r.events].reverse().find((e) => e.time <= now.start);
    note.textContent = now.name === null ? `시간 ${now.start}~${now.end}: 도착한 프로세스가 없어 CPU가 쉰다` : ev?.note ?? '';
    queue.textContent = ev && now.name ? `대기열: ${ev.queue.join(' → ')}` : '';
    if (i === r.segs.length - 1) {
      const t = el('table', 'grid small-grid');
      const h = el('tr');
      for (const c of ['프로세스', '도착', '실행', '종료', '반환(종료-도착)', '대기(반환-실행)']) h.append(el('th', '', c));
      t.append(h);
      for (const row of r.rows) {
        const tr = el('tr');
        for (const v of [row.name, row.arrival, row.burst, row.finish, row.turnaround, row.waiting]) tr.append(el('td', '', String(v)));
        t.append(tr);
      }
      const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
      result.replaceChildren(t, el('p', 'sim-sum',
        `평균 반환 시간 ${fmt(r.avgTurn)} · 평균 대기 시간 ${fmt(r.avgWait)}  (합 ÷ ${r.rows.length})`));
    } else result.replaceChildren();
  }, '구간');
  const title = `${SCHED_ALGO_NAME[algo]}${algo === 'RR' ? ` · 시간 할당량 ${quantum ?? 2}` : ''}`;
  const g = el('div', 'gantt-wrap');
  g.append(gantt, axis);
  return { el: frame(title, s.el, g, note, queue, result), dispose: s.dispose };
}

// ── 트리 ───────────────────────────────────────────────

const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

/** 트리 그림. 돌려준 map으로 노드 원을 찾아 색을 바꾼다 */
export function treeSvg(root: TNode | null): { el: SVGSVGElement; nodes: Map<number, SVGGElement> } {
  const pos = new Map<number, { x: number; y: number }>();
  let col = 0;
  let depth = 0;
  const lay = (n: TNode | null, d: number) => {
    if (!n) return;
    lay(n.l, d + 1);
    pos.set(n.id, { x: col++, y: d });
    depth = Math.max(depth, d);
    lay(n.r, d + 1);
  };
  lay(root, 0);
  const W = 56;
  const H = 64;
  const s = svg('svg', { viewBox: `0 0 ${Math.max(1, col) * W} ${(depth + 1) * H}`, class: 'tree-svg', role: 'img' });
  const nodes = new Map<number, SVGGElement>();
  const xy = (id: number) => ({ x: pos.get(id)!.x * W + W / 2, y: pos.get(id)!.y * H + H / 2 });
  const edges = (n: TNode | null) => {
    if (!n) return;
    for (const c of [n.l, n.r]) {
      if (!c) continue;
      const a = xy(n.id);
      const b = xy(c.id);
      s.append(svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'tree-edge' }));
      edges(c);
    }
  };
  edges(root);
  const draw = (n: TNode | null) => {
    if (!n) return;
    const { x, y } = xy(n.id);
    const g = svg('g', { class: 'tree-node', transform: `translate(${x} ${y})` });
    g.append(svg('circle', { r: 19 }));
    const t = svg('text', { 'text-anchor': 'middle', dy: '0.35em' });
    t.textContent = n.v;
    g.append(t);
    const badge = svg('text', { class: 'tree-badge', x: 15, y: -15, 'text-anchor': 'middle' });
    g.append(badge);
    s.append(g);
    nodes.set(n.id, g);
    draw(n.l);
    draw(n.r);
  };
  draw(root);
  return { el: s, nodes };
}

export function traverseSim(level: string, order: Order): Sim {
  const root = fromLevel(level.split(/\s+/));
  const steps = traverse(root, order);
  const { el: pic, nodes } = treeSvg(root);
  const seq = el('div', 'seq');
  const note = el('p', 'sim-note');
  const s = stepper(steps.length, (i) => {
    const done = new Map(steps.slice(0, i + 1).map((st, k) => [st.node.id, k + 1]));
    for (const [id, g] of nodes) {
      g.classList.toggle('done', done.has(id));
      g.classList.toggle('now', steps[i]!.node.id === id);
      (g.querySelector('.tree-badge') as SVGTextElement).textContent = done.has(id) ? String(done.get(id)) : '';
    }
    seq.replaceChildren(...steps[i]!.seq.map((v, k) => el('span', k === i ? 'chip now' : 'chip', v)));
    note.textContent = steps[i]!.note;
  }, '방문');
  const wrap = el('div', 'tree-wrap');
  wrap.append(pic);
  return { el: frame(`${ORDER_NAME[order]} 순회`, s.el, wrap, el('h3', 'sim-sub', '방문 순서'), seq, note), dispose: s.dispose };
}

export function notationSim(infix: string, to: 'post' | 'pre'): Sim {
  const steps = toPostfix(infix);
  const tokens = steps.map((st) => st.token);
  const tokRow = el('div', 'seq');
  const stack = el('div', 'stack-col');
  const out = el('div', 'seq');
  const note = el('p', 'sim-note');
  const finalBox = el('div', 'notation-final');
  const s = stepper(steps.length, (i) => {
    const st = steps[i]!;
    tokRow.replaceChildren(...tokens.map((t, k) => el('span', k === i ? 'chip now' : k < i ? 'chip done' : 'chip', t)));
    stack.replaceChildren(...(st.stack.length ? st.stack.map((t) => el('div', 'stack-cell', t)).reverse() : [el('div', 'stack-empty muted', '(비어 있음)')]));
    out.replaceChildren(...st.output.map((t) => el('span', 'chip', t)));
    note.textContent = st.note;
    finalBox.replaceChildren();
    if (i === steps.length - 1) {
      const tree = exprTree(st.output);
      const { el: pic } = treeSvg(tree);
      const wrap = el('div', 'tree-wrap');
      wrap.append(pic);
      finalBox.append(
        el('p', 'sim-sum', `후위식: ${st.output.join(' ')}`),
        el('p', 'sim-sum', `전위식: ${preorder(tree).join(' ')}  (수식 트리를 전위 순회)`),
        el('h3', 'sim-sub', '수식 트리'), wrap,
      );
    }
  }, '토큰');
  const cols = el('div', 'notation-cols');
  const left = el('div');
  left.append(el('h3', 'sim-sub', '읽는 중'), tokRow, el('h3', 'sim-sub', '출력 (후위식)'), out);
  const right = el('div');
  right.append(el('h3', 'sim-sub', '연산자 스택 (위가 top)'), stack);
  cols.append(left, right);
  return { el: frame(`중위 → ${to === 'post' ? '후위' : '전위'} 변환 (스택 사용)`, s.el, cols, note, finalBox), dispose: s.dispose };
}

// ── 서브넷 ─────────────────────────────────────────────

function bitRow(label: string, n: number, prefix: number, cls: string, hostAs?: '0' | '1'): HTMLElement {
  const row = el('div', `bit-row ${cls}`);
  row.append(el('span', 'bit-label', label));
  const b = bits(n);
  const box = el('span', 'bits');
  for (let k = 0; k < 32; k++) {
    if (k > 0 && k % 8 === 0) box.append(el('span', 'bit-dot', '.'));
    const host = k >= prefix;
    const ch = host && hostAs ? hostAs : b[k]!;
    box.append(el('span', `bit ${host ? 'host' : 'net'}`, ch));
  }
  row.append(box, el('span', 'bit-ip', toIp(hostAs ? (hostAs === '0' ? n - (n % 2 ** (32 - prefix)) : n - (n % 2 ** (32 - prefix)) + 2 ** (32 - prefix) - 1) : n)));
  return row;
}

export function subnetSim(ip: string, prefix: number): Sim {
  const info = subnetInfo(ip, prefix);
  const rows = [
    () => bitRow('IP 주소', info.ip, prefix, 'r-ip'),
    () => bitRow(`마스크 /${prefix}`, maskOf(prefix), prefix, 'r-mask'),
    () => bitRow('AND → 네트워크', info.ip, prefix, 'r-net', '0'),
    () => bitRow('호스트 비트 1 → 브로드캐스트', info.ip, prefix, 'r-bc', '1'),
  ];
  const notes = [
    `IP 주소를 2진수로 쓴다. 앞의 ${prefix}비트(파랑)가 네트워크 부분, 뒤의 ${32 - prefix}비트(주황)가 호스트 부분이다.`,
    `서브넷 마스크 /${prefix}는 앞의 ${prefix}비트가 1이다 = ${toIp(maskOf(prefix))}`,
    `IP와 마스크를 비트 AND 하면 호스트 부분이 모두 0이 된다 → 네트워크 주소 ${toIp(info.network)}`,
    `호스트 부분을 모두 1로 채우면 브로드캐스트 주소 ${toIp(info.broadcast)}`,
    `사용 가능한 호스트: 2^${32 - prefix} - 2 = ${info.hosts}개 (${toIp(info.first)} ~ ${toIp(info.last)}). 네트워크·브로드캐스트 주소는 호스트에 줄 수 없다.`,
  ];
  const area = el('div', 'bit-area');
  const note = el('p', 'sim-note');
  const s = stepper(notes.length, (i) => {
    area.replaceChildren(...rows.slice(0, Math.min(i + 1, rows.length)).map((f) => f()));
    note.textContent = notes[i]!;
  });
  const scroll = el('div', 'scroll');
  scroll.append(area);
  return { el: frame(`${ip}/${prefix} 계산`, s.el, scroll, note), dispose: s.dispose };
}

export function subnetDivSim(base: string, prefix: number, count: number, nth: number): Sim {
  const subs = divide(base, prefix, count);
  const extra = Math.log2(subs.length);
  const np = prefix + extra;
  const table = el('table', 'grid small-grid');
  const h = el('tr');
  for (const c of ['번호', '네트워크 주소', '첫 호스트', '마지막 호스트', '브로드캐스트']) h.append(el('th', '', c));
  table.append(h);
  const trs = subs.map((sb, k) => {
    const tr = el('tr');
    for (const v of [`${k + 1}`, `${toIp(sb.network)}/${np}`, toIp(sb.first), toIp(sb.last), toIp(sb.broadcast)]) tr.append(el('td', '', v));
    table.append(tr);
    return tr;
  });
  const note = el('p', 'sim-note');
  const size = 2 ** (32 - np);
  const s = stepper(subs.length + 1, (i) => {
    trs.forEach((tr, k) => {
      tr.hidden = k >= i;
      tr.classList.toggle('current', k === nth - 1 && i === subs.length);
    });
    note.textContent = i === 0
      ? `${count}개 이상으로 나누려면 서브넷 비트 ${extra}개가 필요하다 (2^${extra} = ${subs.length}개). /${prefix} → /${np}, 서브넷마다 주소 2^${32 - np} = ${size}개`
      : i < subs.length ? `${i}번째 서브넷: ${toIp(subs[i - 1]!.network)} ~ ${toIp(subs[i - 1]!.broadcast)} (${size}개씩 차례로)`
        : `모든 서브넷. 문제의 ${nth}번째 서브넷은 ${toIp(subs[nth - 1]!.network)}/${np} (브로드캐스트 ${toIp(subs[nth - 1]!.broadcast)})`;
  });
  const scroll = el('div', 'scroll');
  scroll.append(table);
  return { el: frame(`${base}/${prefix}를 ${count}개로 나누기 (FLSM)`, s.el, note, scroll), dispose: s.dispose };
}


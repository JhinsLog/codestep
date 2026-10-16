// 주고받기 순서도: 3-way handshake, ARP 요청·응답, ARQ 재전송, 공격 흐름(스머프, SYN 플러딩, 중간자) …
// 화살표가 하나씩 그려지며 점(패킷)이 날아간다. 시나리오가 여럿이면 탭으로 고른다.
import { el } from '../../view/stage';
import { detailBox, frame, lerp, nameHits, player, svg, tween, type Viz } from '../core';

export interface SeqStep {
  from: number; to: number; label: string; note?: string;
  kind?: 'ok' | 'bad' | 'reply' | 'lost' | 'info';
  many?: number;   // 같은 화살표를 여러 번 (폭주)
}
export interface SeqScenario { name: string; desc?: string; steps: SeqStep[] }
export interface SeqSpec { title: string; en?: string; actors: { name: string; sub?: string; bad?: boolean }[]; scenarios: SeqScenario[] }

const AW = 150, ROW = 46, TOP = 64;

function scene(spec: SeqSpec, sc: SeqScenario): Viz {
  const n = spec.actors.length;
  const W = Math.max(560, n * AW + 40);
  const H = TOP + sc.steps.length * ROW + 30;
  const xOf = (i: number) => 20 + AW / 2 + i * ((W - 40 - AW) / Math.max(1, n - 1));
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'seq-svg' });
  const defs = svg('defs');
  for (const k of ['ok', 'bad', 'reply', 'lost', 'info']) {
    const m = svg('marker', { id: `ah-${k}-${uid}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    m.append(svg('path', { d: 'M0 0 L10 5 L0 10 z', class: `seq-head ${k}` }));
    defs.append(m);
  }
  s.append(defs);
  spec.actors.forEach((a, i) => {
    const x = xOf(i);
    s.append(svg('line', { x1: x, y1: 48, x2: x, y2: H - 10, class: 'seq-life' }));
    const g = svg('g', { class: `seq-actor${a.bad ? ' bad' : ''}` });
    g.append(svg('rect', { x: x - AW / 2 + 8, y: 6, width: AW - 16, height: 40, rx: 9 }),
      svg('text', { x, y: a.sub ? 24 : 31, 'text-anchor': 'middle', class: 'seq-name' }, a.name));
    if (a.sub) g.append(svg('text', { x, y: 39, 'text-anchor': 'middle', class: 'seq-sub' }, a.sub));
    s.append(g);
  });
  const layer = svg('g');
  s.append(layer);
  const detail = detailBox(sc.desc ?? '▶ 재생을 누르면 순서대로 주고받는 모습을 봅니다.');
  const myId = uid++;
  const draw = async (k: number, instant: boolean) => {
    const st = sc.steps[k]!;
    const y = TOP + k * ROW + 18;
    const kind = st.kind ?? 'ok';
    const g = svg('g', { class: `seq-msg ${kind}` });
    layer.append(g);
    const x1 = xOf(st.from), x2 = xOf(st.to);
    if (st.from === st.to) {
      g.append(svg('rect', { x: x1 - 60, y: y - 14, width: 120, height: 26, rx: 6, class: 'seq-self' }),
        svg('text', { x: x1, y: y + 4, 'text-anchor': 'middle' }, st.label));
      if (st.note && !instant) detail.show(st.label, st.note);
      return;
    }
    const end = kind === 'lost' ? lerp(x1, x2, 0.55) : x2;
    const count = st.many ?? 1;
    const lines: SVGLineElement[] = [];
    for (let c = 0; c < count; c++) {
      const dy = count > 1 ? (c - (count - 1) / 2) * 4 : 0;
      const ln = svg('line', { x1, y1: y + dy, x2: x1, y2: y + dy, 'marker-end': kind === 'lost' ? '' : `url(#ah-${kind}-${myId - 0})` });
      lines.push(ln);
      g.append(ln);
    }
    const dot = svg('circle', { r: 5, cx: x1, cy: y, class: 'seq-dot' });
    g.append(dot);
    const label = svg('text', { x: (x1 + x2) / 2, y: y - 7, 'text-anchor': 'middle', class: 'seq-label' }, count > 1 ? `${st.label} × 다수` : st.label);
    g.append(label);
    if (st.note && !instant) detail.show(st.label, st.note);
    await tween(instant ? 0 : 650, (t) => {
      const x = lerp(x1, end, t);
      for (const ln of lines) ln.setAttribute('x2', String(x));
      dot.setAttribute('cx', String(x));
    }).done;
    dot.remove();
    if (kind === 'lost') g.append(svg('text', { x: end + 4, y: y + 6, class: 'seq-x' }, '✕'));
  };
  // 화살표 머리 id가 그림마다 달라야 해서 defs를 다시 단다
  defs.querySelectorAll('marker').forEach((m) => m.setAttribute('id', m.id.replace(/-\d+$/, `-${myId}`)));
  const pl = player({
    steps: sc.steps.length,
    go: (k, instant) => draw(k, instant),
    reset: () => { layer.replaceChildren(); detail.reset(); },
    label: (k) => sc.steps[k]!.label,
    delay: 800,
  });
  const root = el('div', 'seq');
  const sc2 = el('div', 'viz-scroll');
  sc2.append(s);
  root.append(pl.el, sc2, detail.el);
  return {
    el: root,
    focus: (names) => s.querySelectorAll('.seq-actor').forEach((g, i) => g.classList.toggle('focus', nameHits([spec.actors[i]!.name], names))),
    dispose: () => pl.dispose(),
  };
}
let uid = 1;

export function seq(spec: SeqSpec): () => Viz {
  return () => {
    const { root, body } = frame(spec.title, spec.en);
    let cur: Viz | null = null;
    let names: string[] = [];
    const host = el('div');
    const desc = el('p', 'viz-desc');
    const open = (k: number) => {
      cur?.dispose();
      cur = scene(spec, spec.scenarios[k]!);
      host.replaceChildren(cur.el);
      desc.textContent = spec.scenarios[k]!.desc ?? '';
      desc.hidden = !spec.scenarios[k]!.desc;
      head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
      if (names.length) cur.focus?.(names);
    };
    const head = el('div', 'seg viz-tabhead');
    if (spec.scenarios.length > 1) {
      spec.scenarios.forEach((sc, k) => {
        const b = el('button', '', sc.name);
        b.addEventListener('click', () => open(k));
        head.append(b);
      });
      body.append(head);
    }
    body.append(desc, host);
    open(0);
    return {
      el: root,
      focus: (n) => {
        names = n;
        cur?.focus?.(n);
        // 정답이 시나리오 이름이면 그 탭을 연다
        const k = spec.scenarios.findIndex((sc) => nameHits([sc.name], n));
        if (k > 0) open(k);
        head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('focus', nameHits([spec.scenarios[j]!.name], n)));
      },
      dispose: () => cur?.dispose(),
    };
  };
}

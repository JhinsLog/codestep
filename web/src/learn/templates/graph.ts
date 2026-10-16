// 점과 선으로 된 그림: 상태 전이도(프로세스 상태), 연결도(라우팅, EAI, MVC), 팬인·팬아웃.
// 시나리오를 고르면 토큰(패킷)이 경로를 따라 움직이고, 노드를 누르면 설명·들어오고 나가는 선을 보여 준다.
import { el } from '../../view/stage';
import { detailBox, frame, lerp, nameHits, player, svg, tween, type Viz } from '../core';

export interface GNode { id: string; name: string; en?: string; x: number; y: number; desc?: string; kind?: 'state' | 'box' | 'bad' | 'cloud' }
export interface GEdge { a: string; b: string; label?: string; dir?: boolean; curve?: number; cost?: number }
export interface GScenario {
  name: string;
  desc?: string;
  edges?: GEdge[];                  // 이 시나리오에서만 보이는 선 (없으면 공통 선)
  path?: string[][];                // 움직일 토큰들의 경로 (노드 id 목록)
  notes?: string[];                 // 경로 한 칸마다의 설명 (path가 하나일 때)
  hl?: string[];                    // 강조할 노드
}
export interface GraphSpec {
  title: string; en?: string;
  w: number; h: number;
  nodes: GNode[];
  edges: GEdge[];
  scenarios?: GScenario[];
  degree?: boolean;    // 노드를 누르면 팬인·팬아웃(들어오고 나가는 선 수)을 보여 준다
  note?: string;
}

export function graph(spec: GraphSpec): () => Viz {
  return () => {
    const { root, body } = frame(spec.title, spec.en);
    const detail = detailBox(spec.degree ? '모듈을 누르면 팬인(들어오는 호출)과 팬아웃(나가는 호출)을 셉니다.' : '점을 누르면 설명이 나옵니다.');
    const s = svg('svg', { viewBox: `0 0 ${spec.w} ${spec.h}`, class: 'graph-svg' });
    const id = Math.random().toString(36).slice(2, 8);
    const defs = svg('defs');
    const m = svg('marker', { id: `g-${id}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    m.append(svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'graph-ah' }));
    defs.append(m);
    s.append(defs);
    const edgeLayer = svg('g');
    const nodeLayer = svg('g');
    const tokLayer = svg('g');
    s.append(edgeLayer, nodeLayer, tokLayer);
    const byId = new Map(spec.nodes.map((n) => [n.id, n]));
    const R = 30;

    // 선 그리기: 노드 테두리에서 멈추게 줄인다
    const geom = (e: GEdge) => {
      const a = byId.get(e.a)!, b = byId.get(e.b)!;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const pad = (n: GNode) => (n.kind === 'state' ? R : 36);
      const x1 = a.x + ux * pad(a), y1 = a.y + uy * pad(a), x2 = b.x - ux * pad(b), y2 = b.y - uy * pad(b);
      const c = e.curve ?? 0;
      const mx = (x1 + x2) / 2 - uy * c, my = (y1 + y2) / 2 + ux * c;
      return { d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, mx, my };
    };
    let edgeEls: { e: GEdge; p: SVGPathElement }[] = [];
    const drawEdges = (edges: GEdge[]) => {
      edgeLayer.replaceChildren();
      edgeEls = edges.map((e) => {
        const g = geom(e);
        const p = svg('path', { d: g.d, class: 'graph-edge', ...(e.dir !== false ? { 'marker-end': `url(#g-${id})` } : {}) });
        edgeLayer.append(p);
        if (e.label || e.cost !== undefined) {
          const t = svg('text', { x: g.mx, y: g.my - 5, 'text-anchor': 'middle', class: 'graph-elabel' }, e.label ?? String(e.cost));
          edgeLayer.append(t);
        }
        return { e, p };
      });
    };
    const nodeEls = new Map<string, SVGGElement>();
    for (const n of spec.nodes) {
      const g = svg('g', { class: `graph-node ${n.kind ?? 'box'}`, tabindex: 0, role: 'button' });
      if (n.kind === 'state') g.append(svg('circle', { cx: n.x, cy: n.y, r: R }));
      else g.append(svg('rect', { x: n.x - 52, y: n.y - 22, width: 104, height: 44, rx: n.kind === 'cloud' ? 22 : 9 }));
      g.append(svg('text', { x: n.x, y: n.en ? n.y - 1 : n.y + 5, 'text-anchor': 'middle', class: 'graph-name' }, n.name));
      if (n.en) g.append(svg('text', { x: n.x, y: n.y + 14, 'text-anchor': 'middle', class: 'graph-en' }, n.en));
      g.addEventListener('click', () => pickNode(n));
      nodeLayer.append(g);
      nodeEls.set(n.id, g);
    }
    const pickNode = (n: GNode) => {
      nodeEls.forEach((g, k) => g.classList.toggle('picked', k === n.id));
      if (spec.degree) {
        const ins = edgeEls.filter((x) => x.e.b === n.id);
        const outs = edgeEls.filter((x) => x.e.a === n.id);
        edgeEls.forEach((x) => { x.p.classList.toggle('in', ins.includes(x)); x.p.classList.toggle('out', outs.includes(x)); });
        detail.show(`${n.name}: 팬인 ${ins.length} · 팬아웃 ${outs.length}`,
          `들어오는 호출(팬인): ${ins.map((x) => byId.get(x.e.a)!.name).join(', ') || '없음'} / 나가는 호출(팬아웃): ${outs.map((x) => byId.get(x.e.b)!.name).join(', ') || '없음'}`);
      } else detail.show(n.name, n.desc ?? '', n.en);
    };

    // 토큰을 경로 따라 움직이기
    const center = (nid: string) => byId.get(nid)!;
    const runPath = async (path: string[], k: number, instant: boolean, cls = '') => {
      const dot = svg('g', { class: `graph-tok ${cls}` });
      dot.append(svg('circle', { r: 8 }), svg('text', { y: 4, 'text-anchor': 'middle' }, String(k + 1)));
      tokLayer.append(dot);
      for (let j = 0; j + 1 < path.length; j++) {
        const a = center(path[j]!), b = center(path[j + 1]!);
        nodeEls.get(b.id)?.classList.add('hit');
        await tween(instant ? 0 : 520, (t) => dot.setAttribute('transform', `translate(${lerp(a.x, b.x, t)} ${lerp(a.y, b.y, t)})`)).done;
      }
    };

    const scenarios = spec.scenarios ?? [];
    let cur = 0;
    const head = el('div', 'seg viz-tabhead');
    const desc = el('p', 'viz-desc');
    let pl: ReturnType<typeof player> | null = null;
    const plHost = el('div');
    const open = (k: number) => {
      cur = k;
      const sc = scenarios[k];
      drawEdges(sc?.edges ?? spec.edges);
      tokLayer.replaceChildren();
      nodeEls.forEach((g, nid) => { g.classList.remove('hit', 'picked'); g.classList.toggle('hl', !!sc?.hl?.includes(nid)); });
      desc.textContent = sc?.desc ?? '';
      desc.hidden = !sc?.desc;
      head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
      pl?.dispose();
      plHost.replaceChildren();
      if (sc?.path?.length) {
        const single = sc.path.length === 1;
        const nSteps = single ? sc.path[0]!.length - 1 : sc.path.length;
        pl = player({
          steps: nSteps,
          go: async (i, instant) => {
            if (single) {
              const p = sc.path![0]!;
              if (i === 0) { tokLayer.replaceChildren(); }
              const a = p[i]!, b = p[i + 1]!;
              if (sc.notes?.[i] && !instant) detail.show(`${byId.get(a)!.name} → ${byId.get(b)!.name}`, sc.notes[i]!);
              let tok = tokLayer.querySelector<SVGGElement>('.graph-tok');
              if (!tok) {
                tok = svg('g', { class: 'graph-tok' });
                tok.append(svg('circle', { r: 8 }));
                tokLayer.append(tok);
                tok.setAttribute('transform', `translate(${center(a).x} ${center(a).y})`);
              }
              nodeEls.get(b)?.classList.add('hit');
              const A = center(a), B = center(b), T = tok;
              await tween(instant ? 0 : 600, (t) => T.setAttribute('transform', `translate(${lerp(A.x, B.x, t)} ${lerp(A.y, B.y, t)})`)).done;
            } else {
              if (sc.notes?.[i] && !instant) detail.show(`${i + 1}번째`, sc.notes[i]!);
              await runPath(sc.path![i]!, i, instant);
            }
          },
          reset: () => { tokLayer.replaceChildren(); nodeEls.forEach((g) => g.classList.remove('hit')); detail.reset(); },
          delay: single ? 300 : 200,
        });
        plHost.append(pl.el);
      }
    };
    if (scenarios.length > 1) {
      scenarios.forEach((sc, k) => {
        const b = el('button', '', sc.name);
        b.addEventListener('click', () => open(k));
        head.append(b);
      });
      body.append(head);
    }
    const wrap = el('div', 'viz-scroll');
    wrap.append(s);
    body.append(desc, plHost, wrap);
    if (spec.note) body.append(el('p', 'muted small', spec.note));
    body.append(detail.el);
    open(0);
    return {
      el: root,
      focus: (names) => {
        for (const n of spec.nodes) nodeEls.get(n.id)!.classList.toggle('focus', nameHits([n.name, n.en], names));
        const k = scenarios.findIndex((sc) => nameHits([sc.name], names));
        if (k >= 0 && k !== cur) open(k);
        head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('focus', nameHits([scenarios[j]!.name], names)));
      },
      dispose: () => pl?.dispose(),
    };
  };
}

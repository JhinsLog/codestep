// 흐름 실습판: 장비·사람·서버 같은 노드를 바닥에 세우고, 시나리오 단추를 누르면 패킷(데이터 조각)이
// 노드 사이를 날아다니며 도착·유실·차단된다. 네트워크·보안·개발 과정처럼 "주고받는" 개념을 데이터로만 정의한다.
import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import type { Want } from './keyed';
import { base } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info, type World } from './world';

export type Shape = 'box' | 'pc' | 'server' | 'router' | 'switch' | 'db' | 'person' | 'cloud' | 'disk' | 'wall' | 'doc' | 'chip' | 'hub' | 'phone';
export type Tone = 'good' | 'bad' | 'warn' | 'accent' | 'ghost' | 'key' | 'muted' | number;

export interface FNode {
  id: string;
  name: string;
  sub?: string;
  at: [number, number];
  shape?: Shape;
  color?: Tone;
  hidden?: boolean;
  /** 크기 배율 */
  scale?: number;
  info?: Info;
}
export interface FSend {
  from: string;
  to: string | string[];
  label?: string;
  color?: Tone;
  /** ok: 도착, lost: 도중에 사라짐, blocked: 막힘, stay: 도착해서 남음 */
  fate?: 'ok' | 'lost' | 'blocked' | 'stay';
  ms?: number;
  arc?: number;
  /** 같은 패킷을 여러 개 (폭주) */
  many?: number;
}
/** 선: [a, b, 색, 이름표, 방향 화살표] */
export type FLink = [string, string, Tone?, string?, boolean?];
export interface FStep {
  say?: string;
  tone?: 'ok' | 'bad' | 'info';
  code?: string;
  send?: FSend | FSend[];
  flash?: [string[], Tone];
  set?: Record<string, Partial<Omit<FNode, 'id'>>>;
  link?: FLink[];
  unlink?: [string, string][];
  /** 남아 있는 패킷(stay)을 치운다 */
  clear?: boolean;
  wait?: number;
  /** 노드 위에 잠깐 뜨는 말풍선 */
  mark?: { at: string; label: string; color?: Tone }[];
  /** 패킷 하나가 경로를 따라 여러 노드를 거친다 */
  travel?: { path: string[]; label?: string; color?: Tone; notes?: string[] };
  /** 위쪽 기록 띠에 한 줄 덧붙인다 */
  log?: string;
}
export interface FScenario { name: string; tip?: string; code?: string; steps: FStep[]; set?: FStep['set']; keep?: boolean; links?: FLink[] }
export interface FlowSpec {
  title: string;
  en?: string;
  height?: number;
  hint: string;
  nodes: FNode[];
  links?: FLink[];
  groups: { name: string; en?: string; hue: number; items: FScenario[] }[];
  /** 카메라 범위 [x0, x1, z0, z1] — 없으면 노드로 계산 */
  view?: [number, number, number, number];
}

const NAME_Y: Record<Shape, number> = { box: 1.25, pc: 1.55, server: 2.05, router: 0.95, switch: 0.8, db: 1.45, person: 2.0, cloud: 1.7, disk: 0.75, wall: 1.95, doc: 1.6, chip: 0.8, hub: 0.8, phone: 1.4 };

export function tone(w: World, t: Tone | undefined, fallback: number): number {
  if (t === undefined) return fallback;
  if (typeof t === 'number') return t;
  const p = w.pal;
  return { good: p.good, bad: p.bad, warn: p.warn, accent: p.accent, ghost: p.ghost, key: p.key, muted: 0x94a3b8 }[t];
}

function cyl(r: number, h: number, color: number, seg = 28): Mesh {
  const m = new Mesh(new CylinderGeometry(r, r, h, seg), new MeshStandardMaterial({ color, roughness: 0.55 }));
  m.position.y = h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 노드 모양 (바닥 y=0) */
export function shapeOf(w: World, shape: Shape, color: number): Group {
  const g = new Group();
  const B = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c = color) => { const b = w.block(sx, sy, sz, c); b.position.set(x, y, z); g.add(b); return b; };
  switch (shape) {
    case 'pc': B(0, 0, 0, 1.0, 0.08, 0.6, 0x64748b); B(0, 0.08, 0, 0.14, 0.35, 0.14, 0x64748b); B(0, 0.43, 0, 1.5, 0.95, 0.12); B(0, 0.5, 0.07, 1.32, 0.8, 0.02, 0x0f172a); break;
    case 'server': B(0, 0, 0, 1.1, 1.75, 1.0); for (let i = 0; i < 3; i++) B(0, 0.3 + i * 0.45, 0.5, 0.9, 0.08, 0.04, 0x0f172a); break;
    case 'router': { const c = cyl(0.75, 0.45, color); g.add(c); B(-0.3, 0.45, 0, 0.12, 0.3, 0.12, 0x334155); B(0.3, 0.45, 0, 0.12, 0.3, 0.12, 0x334155); break; }
    case 'switch': B(0, 0, 0, 2.0, 0.35, 0.95); for (let i = 0; i < 6; i++) B(-0.75 + i * 0.3, 0.12, 0.48, 0.18, 0.12, 0.03, 0x0f172a); break;
    case 'hub': B(0, 0, 0, 1.5, 0.35, 0.9); for (let i = 0; i < 4; i++) B(-0.5 + i * 0.33, 0.12, 0.46, 0.18, 0.12, 0.03, 0x0f172a); break;
    case 'db': { g.add(cyl(0.65, 1.1, color)); const r1 = cyl(0.67, 0.05, 0xffffff); r1.position.y = 0.4; g.add(r1); const r2 = cyl(0.67, 0.05, 0xffffff); r2.position.y = 0.75; g.add(r2); break; }
    case 'disk': g.add(cyl(0.7, 0.3, color)); break;
    case 'person': { const body = B(0, 0, 0, 0.75, 1.0, 0.45); void body; const head = w.sphere(0.3, color, 0.05); head.position.y = 1.33; g.add(head); break; }
    case 'cloud': for (const [x, y, z, r] of [[0, 0.75, 0, 0.75], [-0.75, 0.5, 0, 0.55], [0.75, 0.5, 0, 0.55], [0.35, 1.1, 0, 0.5]] as number[][]) { const s = w.sphere(r!, color, 0.05); s.position.set(x!, y!, z!); g.add(s); } break;
    case 'wall': for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) B(-0.0, r * 0.42, -0.62 + c * 0.62 + (r % 2 ? 0.2 : 0), 0.4, 0.38, 0.58, color); break;
    case 'doc': B(0, 0, 0, 1.0, 1.3, 0.12, 0xf8fafc); for (let i = 0; i < 4; i++) B(0, 0.3 + i * 0.22, 0.07, 0.7, 0.05, 0.02, color); break;
    case 'chip': B(0, 0, 0, 1.2, 0.3, 1.2); B(0, 0.3, 0, 0.7, 0.1, 0.7, 0x0f172a); break;
    case 'phone': B(0, 0, 0, 0.7, 1.15, 0.12); B(0, 0.12, 0.07, 0.58, 0.9, 0.02, 0x0f172a); break;
    default: B(0, 0, 0, 1.4, 0.8, 1.0);
  }
  g.traverse((o) => { if ((o as Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const first = g.children[0]!;
  g.userData.body = first.userData.body ?? first;
  return g;
}

/** 패킷: 작은 상자 + 위에 뜨는 이름표 */
export function packet(w: World, label: string, color: number): Group {
  const g = new Group();
  const cube = w.block(0.5, 0.32, 0.5, color);
  g.add(cube);
  g.userData.body = cube.userData.body;
  if (label) {
    const s = w.sign([{ text: label, color: '#ffffff', weight: 800, size: 40 }], 0.42, hex(color));
    s.position.y = 0.75;
    g.add(s);
  }
  return g;
}

export function flowLab(spec: FlowSpec): () => Viz {
  return () => lab({ title: spec.title, en: spec.en, height: spec.height ?? 460, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let nodes = new Map<string, FNode>();
    let links: FLink[] = [];
    let lines: string[] = [];
    let marks: Object3D[] = [];
    const stays = new Set<Object3D>();

    const at = (id: string) => { const n = nodes.get(id)!; return new Vector3(n.at[0], 0, n.at[1]); };
    /** 패킷이 노드 위를 지나는 높이 */
    const lift = (id: string) => V(0, NAME_Y[nodes.get(id)?.shape ?? 'box'] * (nodes.get(id)?.scale ?? 1) + 0.25, 0);
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      for (const n of nodes.values()) {
        if (n.hidden) continue;
        const shape = n.shape ?? 'box';
        const color = tone(w, n.color, P.accent);
        const s = n.scale ?? 1;
        out.push({ key: `n:${n.id}`, kind: 'obj', pos: V(n.at[0], 0, n.at[1]), sig: `${shape}|${color}|${s}`, make: () => { const g = shapeOf(w, shape, color); g.scale.setScalar(s); return g; }, info: n.info ?? { title: n.name, sub: n.sub, body: n.sub ?? '' } });
        // 이름표는 노드 앞 바닥 쪽에 둔다(위쪽은 패킷이 지나가는 자리)
        out.push({ key: `nm:${n.id}`, kind: 'sign', pos: V(n.at[0], 0.3, n.at[1] + 1.05 * s), runs: [{ text: n.name, color: P.text, weight: 800, size: 42 }], height: 0.46, bg: hex(P.slab), info: n.info });
        if (n.sub) out.push({ key: `sb:${n.id}`, kind: 'sign', pos: V(n.at[0], 0.12, n.at[1] + 1.05 * s + 0.6), runs: [{ text: n.sub, color: P.muted, size: 36 }], height: 0.32, info: n.info });
      }
      links.forEach(([a, z, t, label, dir]) => {
        const A = nodes.get(a), Z = nodes.get(z);
        if (!A || !Z || A.hidden || Z.hidden) return;
        const p = V(A.at[0], 0.06, A.at[1]), q = V(Z.at[0], 0.06, Z.at[1]);
        const c = tone(w, t, 0x94a3b8);
        const mid = p.clone().add(q).multiplyScalar(0.5);
        out.push({ key: `ln:${a}-${z}`, kind: 'obj', pos: mid, sig: `${p.toArray()}|${q.toArray()}|${c}|${dir ? 1 : 0}`, make: () => {
          const g = new Group();
          const bar = w.bar(p, q, c, 0.05, 0.75);
          bar.position.sub(mid);
          g.add(bar);
          if (dir) {
            const d = q.clone().sub(p).normalize();
            const cone = new Mesh(new CylinderGeometry(0, 0.2, 0.45, 12), new MeshStandardMaterial({ color: c }));
            cone.position.copy(q.clone().sub(d.clone().multiplyScalar(1.15)).sub(mid)).setY(0.12);
            cone.quaternion.setFromUnitVectors(V(0, 1, 0), d);
            g.add(cone);
          }
          return g;
        } });
        if (label) out.push({ key: `lb:${a}-${z}`, kind: 'sign', pos: mid.clone().setY(0.35), runs: [{ text: label, color: P.text, weight: 700, size: 36 }], height: 0.36, bg: hex(P.bg) });
      });
      return out;
    }
    const draw = (o = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const fit = () => {
      if (spec.view) { const [a, z, c, d] = spec.view; w.fit(a, z, c, d); return; }
      const vis = [...nodes.values()].filter((n) => !n.hidden);
      const xs = vis.map((n) => n.at[0]), zs = vis.map((n) => n.at[1]);
      if (!vis.length) return;
      w.fit(Math.min(...xs) - 1.8, Math.max(...xs) + 1.8, Math.min(...zs) - 2.2, Math.max(...zs) + 2.4);
    };

    async function send(s: FSend) {
      const tos0 = Array.isArray(s.to) ? s.to : [s.to];
      const tos = Array.from({ length: s.many ?? 1 }, () => tos0).flat();
      await Promise.all(tos.map(async (to, i) => {
        if (s.many) await sleep((i % (s.many ?? 1)) * 160);
        const color = tone(w, s.color, w.pal.accent);
        const p = packet(w, s.label ?? '', color);
        const from = at(s.from).add(lift(s.from)), dest = at(to).add(lift(to));
        p.position.copy(from);
        root.add(p);
        b.temp.add(p);
        void w.pop(p, 250);
        const ms = s.ms ?? 1100;
        const arc = s.arc ?? 0.8;
        if (s.fate === 'lost') {
          await w.move(p, from.clone().lerp(dest, 0.5), ms * 0.5, arc * 0.5);
          await w.flash(p, w.pal.bad, 300);
          b.temp.delete(p);
          await w.vanish(p, 'fall', 600);
          return;
        }
        if (s.fate === 'blocked') {
          await w.move(p, from.clone().lerp(dest, 0.72), ms * 0.72, arc * 0.6);
          await Promise.all([w.flash(p, w.pal.bad, 500), w.hop(p, 0.4, 400)]);
          b.temp.delete(p);
          await w.vanish(p, 'fall', 600);
          return;
        }
        await w.move(p, dest, ms, arc);
        const n = k.get(`n:${to}`);
        if (n) void w.flash(n, color, 500);
        if (s.fate === 'stay') { stays.add(p); p.position.y = 1.6 + stays.size * 0.0; return; }
        b.temp.delete(p);
        await w.vanish(p, 'shrink', 250);
      }));
    }

    async function runStep(st: FStep) {
      for (const m of marks) { b.temp.delete(m); void w.vanish(m, 'shrink', 250); }
      marks = [];
      if (st.code !== undefined) l.code(st.code);
      if (st.log) { lines = [...lines, st.log].slice(-6); l.code(lines.join('\n')); }
      if (st.set) { for (const [id, v] of Object.entries(st.set)) { const n = nodes.get(id); if (n) Object.assign(n, v); } }
      if (st.link) for (const ln of st.link) { links = links.filter(([a, z]) => !(a === ln[0] && z === ln[1])); links.push(ln); }
      if (st.unlink) links = links.filter(([a, z]) => !st.unlink!.some(([x, y]) => (x === a && y === z) || (x === z && y === a)));
      if (st.set || st.link || st.unlink) await draw({ ms: 450 });
      if (st.clear) { for (const p of stays) { b.temp.delete(p); void w.vanish(p, 'shrink', 300); } stays.clear(); }
      if (st.say) l.say(st.say, st.tone ?? 'info');
      const jobs: Promise<unknown>[] = [];
      if (st.send) for (const s of [st.send].flat()) jobs.push(send(s));
      if (st.mark) for (const m of st.mark) {
        const n = nodes.get(m.at);
        if (!n) continue;
        const c = tone(w, m.color, w.pal.accent);
        const sgn = w.sign([{ text: m.label, color: '#ffffff', weight: 800, size: 40 }], 0.44, hex(c));
        sgn.position.set(n.at[0], NAME_Y[n.shape ?? 'box'] * (n.scale ?? 1) + 1.25, n.at[1]);
        root.add(sgn);
        b.temp.add(sgn);
        marks.push(sgn);
        jobs.push(w.pop(sgn, 300));
        const o = k.get(`n:${m.at}`);
        if (o) jobs.push(w.flash(o, c, 700));
      }
      if (st.travel) jobs.push((async () => {
        const tr = st.travel!;
        const c = tone(w, tr.color, w.pal.accent);
        const pk = packet(w, tr.label ?? '', c);
        pk.position.copy(at(tr.path[0]!).add(lift(tr.path[0]!)));
        root.add(pk);
        b.temp.add(pk);
        await w.pop(pk, 250);
        for (let i = 1; i < tr.path.length; i++) {
          if (tr.notes?.[i - 1]) l.say(tr.notes[i - 1]!, st.tone ?? 'info');
          await w.move(pk, at(tr.path[i]!).add(lift(tr.path[i]!)), 900, 0.6);
          const o = k.get(`n:${tr.path[i]}`);
          if (o) await w.flash(o, c, 450);
        }
        if (tr.notes && tr.notes.length >= tr.path.length) l.say(tr.notes[tr.path.length - 1]!, st.tone ?? 'info');
        b.temp.delete(pk);
        await w.vanish(pk, 'shrink', 300);
      })());
      if (st.flash) jobs.push(Promise.all(st.flash[0].map((id) => { const o = k.get(`n:${id}`); return o ? w.flash(o, tone(w, st.flash![1], w.pal.warn), 800) : null; })));
      await Promise.all(jobs);
      await sleep(st.wait ?? 450);
    }

    async function restore(set?: FStep['set'], lk?: FLink[]) {
      for (const p of stays) w.remove(p);
      stays.clear();
      for (const o of b.temp) w.remove(o);
      b.temp.clear();
      nodes = new Map(spec.nodes.map((n) => [n.id, { ...n }]));
      links = [...(lk ?? spec.links ?? [])];
      if (set) for (const [id, v] of Object.entries(set)) { const n = nodes.get(id); if (n) Object.assign(n, v); }
      await draw({ ms: 450 });
    }

    async function play(sc: FScenario) {
      lines = [];
      marks = [];
      l.code('');
      if (!sc.keep) { await restore(sc.set, sc.links); if (!spec.view) fit(); }
      else for (const o of [...b.temp].filter((x) => !stays.has(x))) { b.temp.delete(o); w.remove(o); }
      if (sc.code !== undefined) l.code(sc.code);
      for (const st of sc.steps) await runStep(st);
    }

    async function reset() { l.code(''); await restore(); fit(); }
    void reset();

    return {
      hint: spec.hint,
      reset,
      groups: spec.groups.map((g) => ({ name: g.name, en: g.en, hue: g.hue, cmds: g.items.map((sc): Cmd => ({ name: sc.name, tip: sc.tip, run: () => play(sc) })) })),
    };
  } });
}

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

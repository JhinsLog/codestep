// 설명용 짧은 장면의 3D판: 2D 장면(scene.ts)과 같은 API를 받아, 등장인물을 3D 장비·사람으로 세우고
// 패킷·말풍선·표시를 3D 무대에서 움직인다. 장면 정의(scenes/*.ts, osiScenes.ts)는 그대로 쓴다.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { el } from '../../view/stage';
import { reduced, svg } from '../core';
import type { Actor, SceneApi, SceneSpec, Token } from '../scene';
import { NAME_Y, packet, shapeOf, type Shape } from './flow';
import { hex, World } from './world';

export type { Actor, SceneApi, SceneSpec, Token };

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** 아이콘(이모지)으로 장비 모양을 고른다 */
function shapeFor(a: Actor): Shape {
  const i = a.icon;
  if (/💻|🤖|📊|⌨️/.test(i)) return 'pc';
  if (/🖥|🏦|🗄|📦/.test(i)) return /🗄/.test(i) ? 'db' : 'server';
  if (/🕵|😈|🧑|🙂|😨|👤|🪖|💰|👻|✍/.test(i)) return 'person';
  if (/📄|📕|📘|📜|📁|✉|💼/.test(i)) return 'doc';
  if (/🔀/.test(i)) return 'router';
  if (/🔌/.test(i)) return 'switch';
  if (/🔁/.test(i)) return 'hub';
  if (/🌐/.test(i)) return 'cloud';
  if (/🚪|🛡/.test(i)) return 'wall';
  if (/🧩/.test(i)) return 'chip';
  if (/📞/.test(i)) return 'phone';
  return 'box';
}

export function scene(spec: SceneSpec): HTMLElement {
  const W = spec.w ?? 560, H = spec.h ?? 190;
  const S = 1 / 38;
  const X = (x: number) => (x - W / 2) * S, Z = (y: number) => (y - H / 2) * S * 1.35;
  const box = el('div', 'scene scene3d');
  const world = new World(320, { autoDispose: true });
  const cap = el('p', 'scene-cap');
  const again = el('button', 'scene-again', '↻ 다시 보기');
  const foot = el('div', 'scene-foot');
  // raw()로 받은 SVG(파형 길이 계산 등)를 붙여 둘 숨은 그림
  const hidden = svg('svg', { width: 0, height: 0 });
  // style 속성 문자열은 CSP가 막으므로 CSSOM으로 지정한다
  hidden.style.position = 'absolute';
  hidden.style.visibility = 'hidden';
  foot.append(cap, again);
  box.append(world.el, foot, hidden);
  const byId = new Map(spec.actors.map((a) => [a.id, a]));
  const P = () => world.pal;
  const root = new Group();
  world.scene.add(root);
  let run = 0;
  class Stop extends Error {}

  const actorColor = (a: Actor) => (a.kind === 'bad' ? P().bad : a.kind === 'good' ? P().good : a.kind === 'dim' ? 0x94a3b8 : P().accent);
  const tokColor = (cls: string) => (/broken|ack/.test(cls) ? P().bad : /locked/.test(cls) ? P().good : /plain/.test(cls) ? P().warn : P().accent);
  const markStyle = (cls: string): { color: string; bg?: number; size: number } =>
    /x|bolt/.test(cls) ? { color: '#ffffff', bg: P().bad, size: 0.55 } : /flag/.test(cls) ? { color: '#ffffff', bg: P().warn, size: 0.38 }
      : /got/.test(cls) ? { color: '#ffffff', bg: P().good, size: 0.38 } : /b1/.test(cls) ? { color: '#ffffff', bg: P().warn, size: 0.42 }
        : /b0/.test(cls) ? { color: '#ffffff', bg: P().accent, size: 0.42 } : { color: P().muted, size: 0.34 };

  const start = async () => {
    const my = ++run;
    const alive = () => { if (my !== run || !box.isConnected) throw new Stop(); };
    for (const c of [...root.children]) world.remove(c);
    hidden.replaceChildren();
    const actorObj = new Map<string, Group>();
    const topY = (id: string) => { const a = byId.get(id)!; return NAME_Y[shapeFor(a)] + 0.15; };
    const T = (ms: number) => (reduced() ? 0 : ms);
    const link = (a: string, b: string, cls = '') => {
      const A = byId.get(a)!, B = byId.get(b)!;
      root.add(world.bar(V(X(A.x), 0.06, Z(A.y)), V(X(B.x), 0.06, Z(B.y)), /dash/.test(cls) ? P().ghost : 0x94a3b8, 0.045, 0.8));
      return svg('line');
    };
    for (const [a, b, c] of spec.links ?? []) link(a, b, c);
    for (const a of spec.actors) {
      const g = shapeOf(world, shapeFor(a), actorColor(a));
      g.position.set(X(a.x), 0, Z(a.y));
      g.userData.info = { title: a.label, body: `${a.icon} ${a.label}` };
      root.add(g);
      actorObj.set(a.id, g);
      const nm = world.sign([{ text: `${a.icon} ${a.label}`, color: P().text, weight: 800, size: 40 }], 0.52, hex(P().slab));
      nm.position.set(X(a.x), 0.28, Z(a.y) + 1.0);
      root.add(nm);
    }
    // 등장인물 자리에 닿는 토큰은 그 위에 띄운다
    const lift = (x: number, y: number) => {
      const hit = spec.actors.find((a) => Math.abs(a.x - x) < 40 && Math.abs(a.y - y) < 24);
      return hit ? V(X(hit.x), topY(hit.id) + 0.35, Z(hit.y)) : V(X(x), 0.9, Z(y));
    };
    cap.textContent = '';

    const api: SceneApi = {
      pos: (id) => { const a = byId.get(id)!; return { x: a.x, y: a.y }; },
      token(text, x, y, cls = '') {
        let cx = x, cy = y, c = cls;
        let g = packet(world, text, tokColor(c));
        g.position.copy(lift(x, y));
        root.add(g);
        void world.pop(g, 200);
        const rebuild = (t: string) => {
          const at = g.position.clone();
          world.remove(g);
          g = packet(world, t, tokColor(c));
          g.position.copy(at);
          root.add(g);
        };
        let cur = text;
        const label = (t: string) => { cur = t; rebuild(t); };
        const tok: Token = {
          g: svg('g'),
          async move(nx, ny, ms = 900) {
            alive();
            await world.move(g, lift(nx, ny), T(ms), 0.5);
            cx = nx; cy = ny;
            alive();
          },
          label,
          cls: (k, on = true) => { c = on ? `${c} ${k}` : c.replace(k, ''); rebuild(cur); },
          async fade(ms = 500) { alive(); await world.vanish(g, 'shrink', T(ms)); },
          remove: () => world.remove(g),
          at: () => ({ x: cx, y: cy }),
        };
        return tok;
      },
      async say(id, text, cls = '', ms = 1700) {
        alive();
        const a = byId.get(id)!;
        const bg = /bad/.test(cls) ? P().bad : /good/.test(cls) ? P().good : 0x334155;
        const sg = world.sign([{ text, color: '#ffffff', weight: 800, size: 40 }], 0.56, hex(bg));
        sg.position.set(X(a.x), topY(id) + 1.05, Z(a.y));
        root.add(sg);
        await world.pop(sg, T(250));
        await new Promise((r) => setTimeout(r, T(ms)));
        alive();
        world.remove(sg);
      },
      caption: (text) => { cap.textContent = text; cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop'); },
      link,
      mark(x, y, text, cls = '') {
        const st = markStyle(cls);
        const sg = world.sign([{ text, color: st.color, weight: 800, size: 40 }], st.size, st.bg !== undefined ? hex(st.bg) : undefined);
        sg.position.set(X(x), /axis/.test(cls) ? 0.2 : 1.1, Z(y));
        root.add(sg);
        void world.pop(sg, 200);
        return svg('text');
      },
      raw(node) {
        hidden.append(node);
        const tag = node.tagName.toLowerCase();
        if (tag === 'rect') {
          // 모듈 경계 같은 상자 → 바닥에 반투명 판
          const n = (k: string) => Number(node.getAttribute(k) ?? 0);
          const plate = world.block(n('width') * S, 0.06, n('height') * S * 1.35, P().ghost, undefined, { opacity: 0.25 });
          plate.position.set(X(n('x') + n('width') / 2), 0, Z(n('y') + n('height') / 2));
          root.add(plate);
        } else if (tag === 'path') {
          // 전압 파형: M/V/H 경로를 막대로 잇고, stroke-dashoffset이 줄어드는 만큼 보여 준다
          const pts: [number, number][] = [];
          let px = 0, py = 0;
          for (const m of (node.getAttribute('d') ?? '').matchAll(/([MVH])\s*([\d.]+)(?:\s+([\d.]+))?/g)) {
            if (m[1] === 'M') { px = +m[2]!; py = +m[3]!; } else if (m[1] === 'V') py = +m[2]!; else px = +m[2]!;
            pts.push([px, py]);
          }
          const wave = new Group();
          const segs: Mesh[] = [];
          for (let i = 1; i < pts.length; i++) {
            const a = V(X(pts[i - 1]![0]), 0.3 + (H - pts[i - 1]![1]) * S * 1.2, 0), b = V(X(pts[i]![0]), 0.3 + (H - pts[i]![1]) * S * 1.2, 0);
            const len = Math.max(0.02, a.distanceTo(b));
            const m = new Mesh(new BoxGeometry(0.07, 0.07, len), new MeshBasicMaterial({ color: P().warn }));
            m.position.copy(a).add(b).multiplyScalar(0.5);
            m.lookAt(b);
            m.visible = false;
            segs.push(m);
            wave.add(m);
          }
          root.add(wave);
          const show = () => {
            const total = Number(node.getAttribute('stroke-dasharray') ?? 0) || 1;
            const off = Number(node.getAttribute('stroke-dashoffset') ?? 0);
            const frac = 1 - off / total;
            segs.forEach((m, i) => { m.visible = (i + 1) / segs.length <= frac + 1e-6; });
          };
          new MutationObserver(show).observe(node, { attributes: true });
        }
        return node;
      },
      flash(id, cls = 'flash') { const o = actorObj.get(id); if (o) void world.flash(o, /bad/.test(cls) ? P().bad : P().warn, 800); },
      async wait(ms) { alive(); await new Promise((r) => setTimeout(r, T(ms))); alive(); },
    };
    const xs = spec.actors.map((a) => X(a.x)), zs = spec.actors.map((a) => Z(a.y));
    world.fit(Math.min(...xs) - 1.6, Math.max(...xs) + 1.6, Math.min(...zs) - 2.4, Math.max(...zs) + 1.8, 0);
    try {
      await spec.play(api);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
  };
  world.onPick = () => {};
  again.addEventListener('click', () => void start());
  requestAnimationFrame(() => void start());
  return box;
}


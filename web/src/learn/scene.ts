// 설명용 짧은 장면 애니메이션: 컴퓨터·서버·공격자 같은 등장인물 사이로 패킷이 오가고, 말풍선과 자막으로 상황을 보여 준다.
// 글 설명 대신 "무슨 일이 일어나는지"를 눈으로 보게 하는 것이 목적이다.
//
//   const el = scene({ actors: [...], play: async (s) => { const t = s.token('DATA', ...); await t.move(...); ... } })
import { el } from '../view/stage';
import { lerp, reduced, svg, tween } from './core';

export interface Actor { id: string; x: number; y: number; icon: string; label: string; kind?: 'bad' | 'good' | 'dim' }
export interface Token {
  g: SVGGElement;
  move(x: number, y: number, ms?: number): Promise<void>;
  label(text: string): void;
  cls(c: string, on?: boolean): void;
  fade(ms?: number): Promise<void>;
  remove(): void;
  at(): { x: number; y: number };
}
export interface SceneApi {
  /** 등장인물 위치 */
  pos(id: string): { x: number; y: number };
  token(text: string, x: number, y: number, cls?: string): Token;
  /** 등장인물 위에 말풍선 */
  say(id: string, text: string, cls?: string, ms?: number): Promise<void>;
  /** 아래 자막 */
  caption(text: string): void;
  /** 등장인물 사이 연결선 */
  link(a: string, b: string, cls?: string): SVGLineElement;
  /** 아무 곳에 글자 (✕, ⚡ 같은 표시) */
  mark(x: number, y: number, text: string, cls?: string): SVGTextElement;
  /** 그 밖의 SVG 요소를 그대로 그린다 (파형 등) */
  raw<E extends SVGElement>(node: E): E;
  /** 등장인물을 잠깐 빛나게 */
  flash(id: string, cls?: string): void;
  wait(ms: number): Promise<void>;
}
export interface SceneSpec { w?: number; h?: number; actors: Actor[]; links?: [string, string, string?][]; play: (s: SceneApi) => Promise<void> }

class Stop extends Error {}

const textW = (t: string) => [...t].reduce((a, c) => a + (c.charCodeAt(0) < 128 ? 6.6 : 11.5), 0);

export function scene(spec: SceneSpec): HTMLElement {
  const W = spec.w ?? 560, H = spec.h ?? 170;
  const box = el('div', 'scene');
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scene-svg' });
  const cap = el('p', 'scene-cap');
  const again = el('button', 'scene-again', '↻ 다시 보기');
  const foot = el('div', 'scene-foot');
  foot.append(cap, again);
  box.append(s, foot);
  const byId = new Map(spec.actors.map((a) => [a.id, a]));
  let run = 0;

  const start = async () => {
    const my = ++run;
    const alive = () => { if (my !== run || !box.isConnected) throw new Stop(); };
    s.replaceChildren();
    const linkLayer = svg('g');
    const actorLayer = svg('g');
    const top = svg('g');
    s.append(linkLayer, actorLayer, top);
    const actorEl = new Map<string, SVGGElement>();
    const link = (a: string, b: string, cls = '') => {
      const A = byId.get(a)!, B = byId.get(b)!;
      const ln = svg('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: `scene-link ${cls}` });
      linkLayer.append(ln);
      return ln;
    };
    for (const [a, b, c] of spec.links ?? []) link(a, b, c);
    for (const a of spec.actors) {
      const g = svg('g', { class: `scene-actor ${a.kind ?? ''}` });
      const w = Math.max(64, textW(a.label) + 16);
      g.append(svg('rect', { x: a.x - w / 2, y: a.y - 22, width: w, height: 44, rx: 10 }),
        svg('text', { x: a.x, y: a.y - 2, 'text-anchor': 'middle', class: 'scene-icon' }, a.icon),
        svg('text', { x: a.x, y: a.y + 15, 'text-anchor': 'middle', class: 'scene-label' }, a.label));
      actorLayer.append(g);
      actorEl.set(a.id, g);
    }
    cap.textContent = '';
    const T = (ms: number) => (reduced() ? 0 : ms);
    const api: SceneApi = {
      pos: (id) => { const a = byId.get(id)!; return { x: a.x, y: a.y }; },
      token(text, x, y, cls = '') {
        const g = svg('g', { class: `scene-tok ${cls}` });
        const r = svg('rect', { y: -11, height: 22, rx: 6 });
        const t = svg('text', { y: 4, 'text-anchor': 'middle' });
        g.append(r, t);
        top.append(g);
        let cx = x, cy = y;
        const label = (v: string) => { t.textContent = v; const w = textW(v) + 14; r.setAttribute('x', String(-w / 2)); r.setAttribute('width', String(w)); };
        label(text);
        const put = () => g.setAttribute('transform', `translate(${cx} ${cy})`);
        put();
        return {
          g,
          async move(nx, ny, ms = 900) {
            alive();
            const fx = cx, fy = cy;
            await tween(T(ms), (k) => { cx = lerp(fx, nx, k); cy = lerp(fy, ny, k); put(); }).done;
            alive();
          },
          label,
          cls: (c, on = true) => g.classList.toggle(c, on),
          async fade(ms = 500) { alive(); await tween(T(ms), (k) => g.setAttribute('opacity', String(1 - k))).done; g.remove(); },
          remove: () => g.remove(),
          at: () => ({ x: cx, y: cy }),
        };
      },
      async say(id, text, cls = '', ms = 1700) {
        alive();
        const a = byId.get(id)!;
        const w = textW(text) + 18;
        // 위에 자리가 없으면 아래에 단다
        const below = a.y - 56 < 2;
        const by = below ? a.y + 58 : a.y - 34;
        const g = svg('g', { class: `scene-say ${cls}` });
        g.append(svg('rect', { x: a.x - w / 2, y: by - 22, width: w, height: 24, rx: 8 }),
          svg('path', { d: below ? `M${a.x - 5} ${by - 22} L${a.x} ${by - 29} L${a.x + 5} ${by - 22} z` : `M${a.x - 5} ${by + 2} L${a.x} ${by + 9} L${a.x + 5} ${by + 2} z` }),
          svg('text', { x: a.x, y: by - 6, 'text-anchor': 'middle' }, text));
        top.append(g);
        await tween(T(200), (k) => g.setAttribute('opacity', String(k))).done;
        await new Promise((r) => setTimeout(r, T(ms)));
        alive();
        g.remove();
      },
      caption: (text) => { cap.textContent = text; cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop'); },
      link,
      mark(x, y, text, cls = '') { const m = svg('text', { x, y, 'text-anchor': 'middle', class: `scene-mark ${cls}` }, text); top.append(m); return m; },
      raw(node) { top.append(node); return node; },
      flash(id, cls = 'flash') { const g = actorEl.get(id); if (!g) return; g.classList.remove(cls); void g.getBoundingClientRect(); g.classList.add(cls); },
      async wait(ms) { alive(); await new Promise((r) => setTimeout(r, T(ms))); alive(); },
    };
    try {
      await spec.play(api);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
  };
  again.addEventListener('click', () => void start());
  // 화면에 붙은 뒤 시작
  requestAnimationFrame(() => void start());
  return box;
}

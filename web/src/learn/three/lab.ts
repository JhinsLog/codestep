// 3D 실습판의 틀: 명령 단추(+하위 선택) → 명령문 표시 → 3D 무대에서 움직임 → 한 줄 해설.
// 과목마다 setup()에서 무대를 꾸미고 단추를 정해 준다. 무대의 블록을 누르면 설명 팝업이 뜬다.
import { el } from '../../view/stage';
import { nameHits, type Viz } from '../core';
import { openModal } from '../modal';
import { World } from './world';

export interface Cmd {
  name: string;
  /** 단추에 올렸을 때 보이는 짧은 설명 */
  tip?: string;
  run?: () => unknown;
  /** 누르면 아래 줄에 펼쳐지는 하위 선택 (예: CREATE → TABLE · VIEW …) */
  sub?: Cmd[] | (() => Cmd[]);
}
export interface CmdGroup { name: string; en?: string; hue: number; cmds: Cmd[] }

export interface Lab {
  world: World;
  /** 실행한 명령문(SQL·명령어)을 위쪽 띠에 보여 준다 */
  code(text: string): void;
  /** 아래쪽 해설 한 줄. tone: ok(초록) · bad(빨강) · info */
  say(text: string, tone?: 'ok' | 'bad' | 'info'): void;
  /** 단추 줄 아래의 상태 표시 */
  status(...nodes: (Node | string)[]): void;
}

export interface LabSetup { groups: CmdGroup[]; reset(): unknown; hint: string }

/** 명령문 글자에 색을 입힌다: 대문자 키워드 · '문자열' · 숫자 · -- 주석 */
function paint(text: string): DocumentFragment {
  const f = document.createDocumentFragment();
  const re = /(--[^\n]*)|('[^']*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][A-Z_]+\b)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) f.append(text.slice(last, m.index));
    const cls = m[1] ? 'cm' : m[2] ? 'str' : m[3] ? 'num' : 'kw';
    f.append(el('span', `lab-${cls}`, m[0]));
    last = m.index! + m[0].length;
  }
  f.append(text.slice(last));
  return f;
}

export function lab(o: { title: string; en?: string; height?: number; setup(l: Lab): LabSetup }): Viz {
  const root = el('div', 'viz lab');
  const head = el('div', 'viz-title');
  head.append(el('b', '', o.title));
  if (o.en) head.append(el('span', 'viz-en', o.en));
  const bar = el('div', 'lab-bar');
  const subRow = el('div', 'lab-sub');
  subRow.hidden = true;
  const world = new World(o.height ?? 440);
  const codeEl = el('pre', 'lab-code');
  codeEl.hidden = true;
  const sayEl = el('div', 'lab-say');
  world.el.append(codeEl);
  const foot = el('div', 'lab-foot');
  const statusEl = el('div', 'lab-status');
  const resetBtn = el('button', 'lab-reset', '↺ 처음부터');
  foot.append(statusEl, resetBtn);
  root.append(head, bar, subRow, world.el, sayEl, foot);

  const api: Lab = {
    world,
    code(text) {
      codeEl.hidden = !text;
      codeEl.replaceChildren(paint(text));
      codeEl.classList.remove('lab-new');
      void codeEl.offsetWidth;
      codeEl.classList.add('lab-new');
    },
    say(text, tone = 'info') {
      sayEl.textContent = text;
      sayEl.className = `lab-say ${tone}`;
    },
    status(...nodes) { statusEl.replaceChildren(...nodes); },
  };
  world.onPick = (info) => openModal(info.title, info.body.split('\n\n'), info.sub);

  const setup = o.setup(api);
  let busy = false;
  const buttons: { b: HTMLButtonElement; names: string[] }[] = [];
  const lock = (on: boolean) => {
    busy = on;
    root.classList.toggle('busy', on);
  };
  const exec = async (c: Cmd) => {
    if (busy || !c.run) return;
    lock(true);
    try { await c.run(); } catch (e) { api.say(String(e), 'bad'); } finally { lock(false); }
  };
  let openParent: HTMLButtonElement | null = null;
  const openSub = (c: Cmd, b: HTMLButtonElement, hue: number) => {
    if (openParent === b) { subRow.hidden = true; b.classList.remove('open'); openParent = null; return; }
    openParent?.classList.remove('open');
    openParent = b;
    b.classList.add('open');
    const list = typeof c.sub === 'function' ? c.sub() : c.sub!;
    subRow.style.setProperty('--h', String(hue));
    subRow.replaceChildren(el('span', 'lab-sublabel', `${c.name} ▸`));
    for (const s of list) {
      const sb = el('button', 'lab-btn', s.name);
      if (s.tip) sb.title = s.tip;
      sb.addEventListener('click', () => void exec(s));
      subRow.append(sb);
    }
    if (!list.length) subRow.append(el('span', 'lab-subnone', '지금은 고를 수 있는 것이 없습니다'));
    subRow.hidden = false;
  };
  for (const g of setup.groups) {
    const box = el('div', 'lab-group');
    box.style.setProperty('--h', String(g.hue));
    const gl = el('div', 'lab-glabel');
    gl.append(el('b', '', g.name));
    if (g.en) gl.append(el('span', '', g.en));
    const row = el('div', 'lab-row');
    for (const c of g.cmds) {
      const b = el('button', 'lab-btn', c.sub ? `${c.name} ▾` : c.name);
      if (c.tip) b.title = c.tip;
      b.addEventListener('click', () => {
        if (busy) return;
        if (c.sub) openSub(c, b, g.hue);
        else {
          openParent?.classList.remove('open');
          openParent = null;
          subRow.hidden = true;
          void exec(c);
        }
      });
      row.append(b);
      buttons.push({ b, names: [c.name] });
    }
    box.append(gl, row);
    bar.append(box);
  }
  resetBtn.addEventListener('click', async () => {
    if (busy) return;
    lock(true);
    try { api.code(''); await setup.reset(); api.say(setup.hint); } finally { lock(false); }
  });
  api.say(setup.hint);

  return {
    el: root,
    focus(names) {
      for (const { b, names: n } of buttons) b.classList.toggle('focus', nameHits(n, names));
    },
    dispose() { world.dispose(); },
  };
}

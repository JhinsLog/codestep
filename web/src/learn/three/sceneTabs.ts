// 장면 고르기: 단추를 누르면 그 장면(3D)이 팝업이 아니라 이 자리에서 바로 재생된다.
import { el } from '../../view/stage';
import { nameHits, type Viz } from '../core';

export interface SceneItem { name: string; en?: string; desc: string; scene: () => HTMLElement }

export function sceneTabs(title: string, en: string, items: SceneItem[]): Viz {
  const root = el('div', 'viz lab');
  const head = el('div', 'viz-title');
  head.append(el('b', '', title), el('span', 'viz-en', en));
  const bar = el('div', 'lab-row scene-tabs');
  const host = el('div', 'scene-host');
  const desc = el('div', 'lab-say ok');
  const btns = items.map((it, k) => {
    const b = el('button', 'lab-btn', it.name);
    if (it.en) b.title = it.en;
    b.addEventListener('click', () => open(k));
    bar.append(b);
    return b;
  });
  function open(k: number) {
    const it = items[k]!;
    btns.forEach((b, j) => b.classList.toggle('open', j === k));
    host.replaceChildren(it.scene());
    desc.textContent = `${it.name}${it.en ? ` (${it.en})` : ''} — ${it.desc}`;
  }
  root.append(head, bar, host, desc);
  open(0);
  return {
    el: root,
    focus: (names) => {
      const k = items.findIndex((it) => nameHits([it.name, it.en], names));
      btns.forEach((b, j) => b.classList.toggle('focus', j === k));
      if (k >= 0) open(k);
    },
    dispose: () => host.replaceChildren(),
  };
}

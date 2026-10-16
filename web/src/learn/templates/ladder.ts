// 순서·강도가 있는 개념: 결합도·응집도 사다리, 커버리지 강도, 정규화 계단, 스키마 3단계 …
// 막대가 차례로 올라오고, ▶ 재생으로 위에서부터 하나씩 짚으며 설명한다.
import { el } from '../../view/stage';
import { detailBox, frame, nameHits, player, tween, type Viz } from '../core';
import { openModal } from '../modal';

export interface LadderItem { name: string; en?: string; desc: string; tag?: string; scene?: () => HTMLElement }
export interface LadderSpec {
  title: string;
  en?: string;
  top: string;        // 맨 위의 뜻 (예: '약함 · 좋음')
  bottom: string;     // 맨 아래의 뜻
  items: LadderItem[];  // 위에서 아래 순서
  mnemonic?: string;
  shape?: 'bars' | 'stairs' | 'stack';  // bars: 넓이가 줄어듦, stairs: 계단, stack: 같은 넓이로 쌓기
  hue?: [number, number];   // 위·아래 색상(HSL hue)
  note?: string;
}

export function ladder(spec: LadderSpec): () => Viz {
  return () => {
    const { root, body } = frame(spec.title, spec.en);
    const detail = detailBox(spec.items.some((i) => i.scene) ? '막대를 누르면 예시 애니메이션과 설명이 나옵니다. ▶ 재생을 누르면 순서대로 짚어 줍니다.' : '막대를 누르면 설명이 나옵니다. ▶ 재생을 누르면 순서대로 짚어 줍니다.');
    const wrap = el('div', `ladder ${spec.shape ?? 'bars'}`);
    const col = el('div', 'ladder-col');
    const n = spec.items.length;
    const [h1, h2] = spec.hue ?? [140, 0];
    const bars = spec.items.map((it, k) => {
      const b = el('button', 'ladder-bar');
      const t = n > 1 ? k / (n - 1) : 0;
      b.style.setProperty('--h', String(Math.round(h1 + (h2 - h1) * t)));
      if (spec.shape === 'stairs') b.style.marginLeft = `${n > 1 ? (k * 40) / (n - 1) : 0}%`;
      else if (spec.shape !== 'stack') b.style.width = `${100 - k * (45 / Math.max(1, n - 1))}%`;
      b.append(el('span', 'ladder-rank', String(k + 1)), el('b', '', it.name));
      if (it.en) b.append(el('span', 'ladder-en', it.en));
      if (it.tag) b.append(el('span', 'ladder-tag', it.tag));
      b.addEventListener('click', () => pick(k, true));
      col.append(b);
      return b;
    });
    wrap.append(el('div', 'ladder-end top', `▲ ${spec.top}`), col, el('div', 'ladder-end bottom', `▼ ${spec.bottom}`));
    /** withScene: 눌러서 고르면 예시 장면까지, 재생 중에는 글만 */
    const pick = (k: number, withScene = false) => {
      bars.forEach((b, j) => b.classList.toggle('picked', j === k));
      const it = spec.items[k]!;
      if (!it.scene) { detail.show(`${k + 1}. ${it.name}`, it.desc, it.en); return; }
      const popup = () => openModal(`${k + 1}. ${it.name}`, [it.scene!(), it.desc], it.en);
      if (withScene) { popup(); detail.show(`${k + 1}. ${it.name}`, it.desc, it.en); return; }
      // 재생 중에는 글만 보여 주고, 단추로 장면 팝업을 연다
      const box = el('div');
      const open = el('button', 'scene-open', '🎬 예시 애니메이션으로 보기');
      open.addEventListener('click', popup);
      box.append(el('p', '', it.desc), open);
      detail.show(`${k + 1}. ${it.name}`, box, it.en);
    };
    // 처음 열 때 막대가 차례로 올라온다
    const anims = bars.map((b, k) => {
      b.style.opacity = '0';
      return setTimeout(() => {
        tween(380, (t) => { b.style.opacity = String(t); b.style.transform = `translateX(${(1 - t) * -24}px)`; });
      }, 70 * k);
    });
    const pl = player({
      steps: n,
      go: (k) => pick(k),
      reset: () => { bars.forEach((b) => b.classList.remove('picked')); detail.reset(); },
      label: (k) => spec.items[k]!.name,
      delay: 1500,
    });
    body.append(pl.el, wrap);
    if (spec.mnemonic) body.append(el('p', 'viz-mnemonic', spec.mnemonic));
    if (spec.note) body.append(el('p', 'muted small', spec.note));
    body.append(detail.el);
    return {
      el: root,
      focus: (names) => bars.forEach((b, k) => b.classList.toggle('focus', nameHits([spec.items[k]!.name, spec.items[k]!.en], names))),
      dispose: () => { pl.dispose(); anims.forEach(clearTimeout); },
    };
  };
}

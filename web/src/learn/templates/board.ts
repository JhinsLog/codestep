// 분류가 있는 개념: 디자인 패턴(생성·구조·행위), UML 다이어그램, 암호 알고리즘, 악성코드 …
// 무리별 카드에 항목이 날아 들어가고, "분류 연습"으로 직접 나눠 볼 수 있다.
import { el } from '../../view/stage';
import { detailBox, frame, nameHits, tween, type Viz } from '../core';
import { openModal } from '../modal';

export interface BoardItem { name: string; en?: string; desc?: string; scene?: () => HTMLElement }
export interface BoardGroup { name: string; en?: string; desc?: string; hue?: number; items: BoardItem[]; scene?: () => HTMLElement }
export interface BoardSpec { title: string; en?: string; groups: BoardGroup[]; note?: string; quiz?: boolean }

export function board(spec: BoardSpec): () => Viz {
  return () => {
    const { root, body } = frame(spec.title, spec.en);
    const hasScene = spec.groups.some((g) => g.scene || g.items.some((i) => i.scene));
    const detail = detailBox(hasScene ? '항목(🎬 표시)을 누르면 예시 애니메이션과 설명이 나옵니다.' : '항목을 누르면 설명이 나옵니다.');
    const showWith = (title: string, text: string, sub: string | undefined, sc?: () => HTMLElement) => {
      detail.show(title, text, sub);
      if (sc) openModal(title, [sc(), text], sub);
    };
    const tools = el('div', 'viz-tools');
    const quizBtn = el('button', '', '🧩 분류 연습');
    if (spec.quiz !== false && spec.groups.length > 1) tools.append(quizBtn);
    const grid = el('div', 'board');
    const pool = el('div', 'board-pool');
    pool.hidden = true;
    const chips: { chip: HTMLButtonElement; g: number; it: BoardItem }[] = [];
    const cols = spec.groups.map((g, gi) => {
      const col = el('div', 'board-col');
      col.style.setProperty('--h', String(g.hue ?? (gi * 360) / spec.groups.length + 200));
      const head = el('button', 'board-head');
      head.append(el('b', '', g.scene ? `🎬 ${g.name}` : g.name));
      if (g.en) head.append(el('span', 'board-en', g.en));
      head.addEventListener('click', () => {
        if (selected) { drop(gi); return; }
        showWith(g.name, g.desc ?? `${g.items.map((i) => i.name).join(', ')}`, g.en, g.scene);
      });
      const list = el('div', 'board-items');
      col.append(head, list);
      for (const it of g.items) {
        const chip = el('button', `board-chip${it.scene ? ' has-scene' : ''}`);
        chip.append(el('span', '', it.scene ? `🎬 ${it.name}` : it.name));
        if (it.en) chip.append(el('span', 'board-en', it.en));
        chip.addEventListener('click', () => {
          if (!pool.hidden && chip.parentElement === pool) { select(chip); return; }
          showWith(it.name, it.desc ?? `${g.name}에 속한다.`, it.en, it.scene);
        });
        list.append(chip);
        chips.push({ chip, g: gi, it });
      }
      grid.append(col);
      return list;
    });
    // 처음 열 때 항목이 차례로 들어온다
    const timers = chips.map((c, k) => {
      c.chip.style.opacity = '0';
      return setTimeout(() => tween(300, (t) => { c.chip.style.opacity = String(t); c.chip.style.transform = `scale(${0.6 + 0.4 * t})`; }), 25 * k);
    });

    // ── 분류 연습: 섞인 항목을 눌러 고른 뒤 알맞은 무리의 제목을 누른다 ──
    let selected: HTMLButtonElement | null = null;
    let left = 0;
    const select = (chip: HTMLButtonElement) => {
      selected?.classList.remove('sel');
      selected = chip;
      chip.classList.add('sel');
    };
    const drop = (gi: number) => {
      const c = chips.find((x) => x.chip === selected)!;
      selected!.classList.remove('sel');
      if (c.g === gi) {
        cols[gi]!.append(c.chip);
        c.chip.classList.add('right');
        left--;
        detail.show(`✓ ${c.it.name}`, c.it.desc ?? `${spec.groups[gi]!.name}에 속한다.`, c.it.en);
        if (!left) { detail.show('🎉 모두 분류했습니다', '다시 해 보려면 "분류 연습"을 한 번 더 누르세요.'); pool.hidden = true; }
      } else {
        c.chip.classList.remove('shake'); void c.chip.offsetWidth; c.chip.classList.add('shake');
        detail.show(`✗ ${c.it.name}은(는) ${spec.groups[gi]!.name}이(가) 아닙니다`, '다른 무리에 넣어 보세요.');
      }
      selected = null;
    };
    quizBtn.addEventListener('click', () => {
      const shuffled = [...chips].sort(() => Math.random() - 0.5);
      pool.replaceChildren(el('span', 'muted small', '항목을 누르고 → 알맞은 무리의 제목을 누르세요'));
      for (const c of shuffled) { c.chip.classList.remove('right', 'focus'); pool.append(c.chip); }
      pool.hidden = false;
      left = chips.length;
      detail.reset();
    });

    body.append(tools, pool, grid);
    if (spec.note) body.append(el('p', 'muted small', spec.note));
    body.append(detail.el);
    return {
      el: root,
      focus: (names) => {
        chips.forEach((c) => c.chip.classList.toggle('focus', nameHits([c.it.name, c.it.en], names)));
        grid.querySelectorAll('.board-head').forEach((h, gi) => h.classList.toggle('focus', nameHits([spec.groups[gi]!.name, spec.groups[gi]!.en], names)));
      },
      dispose: () => timers.forEach(clearTimeout),
    };
  };
}

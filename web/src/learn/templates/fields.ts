// 칸으로 나뉜 구조: HDLC 프레임, URL, IPsec 전송·터널 모드, TCP 헤더 …
// 칸이 왼쪽부터 차례로 채워지고, 칸을 누르면 설명이 나온다. 여러 줄(행)을 위아래로 비교할 수 있다.
import { el } from '../../view/stage';
import { detailBox, frame, nameHits, tween, type Viz } from '../core';

export interface Field { name: string; en?: string; text?: string; desc: string; w?: number; hue?: number }
export interface FieldRow { label?: string; fields: Field[] }
export interface FieldsSpec { title: string; en?: string; rows: FieldRow[]; note?: string }

export function fields(spec: FieldsSpec): () => Viz {
  return () => {
    const { root, body } = frame(spec.title, spec.en);
    const detail = detailBox('칸을 누르면 그 부분이 무엇인지 설명합니다.');
    const all: { b: HTMLButtonElement; f: Field }[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const row of spec.rows) {
      const r = el('div', 'fields-row');
      if (row.label) r.append(el('span', 'fields-label', row.label));
      const bar = el('div', 'fields-bar');
      row.fields.forEach((f, k) => {
        const b = el('button', 'fields-cell');
        b.style.flexGrow = String(f.w ?? 1);
        b.style.setProperty('--h', String(f.hue ?? (k * 47 + 200) % 360));
        b.append(el('b', '', f.text ?? f.name));
        if (f.text) b.append(el('span', 'fields-name', f.name));
        b.addEventListener('click', () => {
          all.forEach((x) => x.b.classList.toggle('picked', x.b === b));
          detail.show(f.name, f.desc, f.en);
        });
        b.style.opacity = '0';
        timers.push(setTimeout(() => tween(320, (t) => { b.style.opacity = String(t); b.style.transform = `translateY(${(1 - t) * 10}px)`; }), 90 * all.length));
        bar.append(b);
        all.push({ b, f });
      });
      r.append(bar);
      body.append(r);
    }
    if (spec.note) body.append(el('p', 'muted small', spec.note));
    body.append(detail.el);
    return {
      el: root,
      focus: (names) => all.forEach((x) => x.b.classList.toggle('focus', nameHits([x.f.name, x.f.en], names))),
      dispose: () => timers.forEach(clearTimeout),
    };
  };
}

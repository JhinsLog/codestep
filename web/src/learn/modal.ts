// 개념 설명 팝업: 화면 가운데에 띄우고 ✕·Esc·바깥 클릭으로 닫는다. 한 번에 하나만 열린다.
import { el } from '../view/stage';

let current: HTMLDialogElement | null = null;

export function closeModal() {
  current?.close();
}

/** 제목·부제와 내용(장면, 설명 글 …)을 팝업으로 보여 준다 */
export function openModal(title: string, body: (Node | string)[], sub?: string) {
  closeModal();
  const d = el('dialog', 'modal');
  const head = el('div', 'modal-head');
  const h = el('div', 'modal-title');
  h.append(el('b', '', title));
  if (sub) h.append(el('span', 'modal-sub', sub));
  const x = el('button', 'modal-x', '✕');
  x.setAttribute('aria-label', '닫기');
  x.addEventListener('click', () => d.close());
  head.append(h, x);
  const content = el('div', 'modal-body');
  content.append(...body.map((b) => (typeof b === 'string' ? el('p', '', b) : b)));
  d.append(head, content);
  // 바깥(배경)을 누르면 닫는다
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => { d.remove(); if (current === d) current = null; });
  document.body.append(d);
  current = d;
  d.showModal();
  x.focus();
}

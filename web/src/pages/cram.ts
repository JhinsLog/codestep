// ⚡️벼락⚡️ — 시험 직전 페이지: 과목별 "외울 것" 요약 + 그 주제의 기출(회차 재현) 문제를 바로 풀기.
// 문제는 학습 화면(/learn/<id>#cram)에서 그림과 함께 풀고, 이전·다음은 이 페이지의 순서를 따른다.
import { roundById } from '../exam/data';
import * as store from '../exam/store';
import { conceptById } from '../learn/concepts';
import { CRAM, cramSequence, pickProblems, type CramTopic } from '../cram/plan';
import { el } from '../view/stage';
import { useAi } from '../view/ask';
import '../learn/learn.css';

function link(href: string, cls: string, text: string): HTMLAnchorElement {
  const a = el('a', cls, text);
  a.href = href;
  a.dataset.link = '';
  return a;
}

/** `코드`만 코드 글꼴로 */
function rich(text: string): Node[] {
  return text.split(/(`[^`]+`)/).filter(Boolean).map((t) => (t.startsWith('`') ? el('code', 'cram-code', t.slice(1, -1)) : document.createTextNode(t)));
}

const MARK = { ok: '✓', no: '✗', part: '△' } as const;

function topicCard(t: CramTopic, marks: Record<string, string>): HTMLElement {
  const card = el('section', 'cram-topic');
  const ps = pickProblems(t);
  const done = ps.filter((p) => marks[p.id] === 'ok').length;
  const head = el('div', 'cram-thead');
  head.append(el('span', `chip cat-${t.cat}`, t.name));
  if (t.goal) head.append(el('span', 'cram-goal', `목표 ${t.goal}`));
  head.append(el('span', 'grow'), el('span', `cram-prog${done === ps.length && ps.length ? ' all' : ''}`, `✓ ${done} / ${ps.length}`));
  card.append(head, el('p', 'cram-focus', t.focus));

  const ul = el('ul', 'cram-points');
  for (const pt of t.points) { const li = el('li'); li.append(...rich(pt)); ul.append(li); }
  card.append(el('h4', '', '외울 것'), ul);

  const cs = t.concepts.map(conceptById).filter((c) => !!c);
  if (cs.length) {
    const row = el('div', 'cram-concepts');
    row.append(el('span', 'muted small', '그림으로 보기'));
    for (const c of cs) row.append(link(`/learn/c/${c.id}`, 'cram-concept', c.name));
    card.append(row);
  }

  card.append(el('h4', '', '기출로 풀기'));
  const list = el('ul', 'exam-list cram-list');
  for (const p of ps) {
    const li = el('li');
    const a = link(`/learn/${p.id}#cram`, 'exam-item', `${roundById(p.round!)?.label ?? ''} ${p.no}번 · ${p.title}`);
    const m = marks[p.id] as keyof typeof MARK | undefined;
    a.prepend(el('span', `mark ${m ?? ''}`, m ? MARK[m] : '•'));
    if (p.trend) { const tr = el('span', 'chip trend', '경향'); tr.title = '그 회차의 개념을 확인하지 못해 같은 시기 출제 경향으로 채운 문항'; a.append(tr); }
    li.append(a);
    list.append(li);
  }
  card.append(list);
  return card;
}

export function mountCram(root: HTMLElement): () => void {
  root.innerHTML = '';
  const marks = store.marks();
  const seq = cramSequence();
  const tried = seq.filter((p) => marks[p.id]).length;
  const right = seq.filter((p) => marks[p.id] === 'ok').length;
  const next = seq.find((p) => !marks[p.id]) ?? seq.find((p) => marks[p.id] !== 'ok');

  const page = el('div', 'cram');
  const top = el('section', 'panel cram-top');
  top.append(el('h2', 'cram-title', '⚡️벼락⚡️'), el('p', 'cram-sub', CRAM.title), el('p', 'exam-lead', CRAM.target));
  const bar = el('div', 'cram-bar');
  const fill = el('span', 'cram-fill');
  fill.style.width = `${seq.length ? (right / seq.length) * 100 : 0}%`;
  bar.append(fill);
  const stat = el('div', 'cram-stat');
  stat.append(el('span', '', `맞힌 문제 ${right} / ${seq.length}`), el('span', 'muted', `· 풀어 본 문제 ${tried}`));
  if (next) stat.append(link(`/learn/${next.id}#cram`, 'button primary cram-go', tried ? '이어서 풀기 →' : '첫 문제부터 풀기 →'));
  else stat.append(el('span', 'cram-alldone', '🎉 모두 맞혔습니다'));
  top.append(bar, stat);
  page.append(top);

  for (const part of CRAM.parts) {
    const sec = el('section', 'cram-part');
    sec.append(el('h3', 'cram-ph', `${part.id === 'code' ? '💻' : '📘'} ${part.title} — 목표 ${part.goal}`));
    const grid = el('div', 'cram-grid');
    for (const t of part.topics) grid.append(topicCard(t, marks));
    sec.append(grid);
    page.append(sec);
  }
  page.append(el('p', 'muted small cram-note', '기출로 풀기의 문제는 기출 원문이 아니라, 그 회차에 나온 개념을 같은 형식으로 새로 쓴 회차 모의고사 문항입니다. 문제를 누르면 오른쪽(또는 아래)에서 그림으로 확인하며 풀 수 있고, 답은 이 브라우저에 저장됩니다.'));
  root.append(page);
  const unAi = useAi({
    context: () => `[화면] ⚡️벼락⚡️ — 시험 직전 요약과 기출(회차 재현) 문제 목록\n${page.innerText.trim().slice(0, 12000)}`,
    summary: () => '⚡️벼락⚡️',
    suggestions: () => ['코딩에서 가장 먼저 봐야 할 것은 무엇인가요?', '보안 외울 것을 표로 정리해 주세요', '응집도와 결합도 순서를 외우는 요령은?'],
  });
  return () => { unAi(); store.flush(); };
}

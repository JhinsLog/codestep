// 정보처리기사 학습 모드: 시험이 아니라 "이해"를 위한 화면.
//
//   /learn               개념 지도 + 유형별 문제 목록
//   /learn/c/<개념>       개념 그림 크게 보기 + 관련 문제
//   /learn/<문제 id>      문제를 풀면서 바로 옆에서
//                          · 코드 문제: 디버거로 한 줄씩 실행 (값이 바뀌는 모습)
//                          · 이론 문제: 알아야 할 기초 지식 그림 (애니메이션)
//                          · 계산 문제: 이 문제 그대로의 시뮬레이터
import { ALL, CATEGORIES, byId, listOf, roundById } from '../exam/data';
import type { Category, Problem } from '../exam/problems';
import { answerHint, answerOf, filledCode, score } from '../exam/answer';
import * as store from '../exam/store';
import { CAT_ORDER, CONCEPTS, conceptById, conceptsFor, problemsOf, type Concept } from '../learn/concepts';
import type { Viz } from '../learn/core';
import { el } from '../view/stage';
import '../learn/learn.css';
import { closeModal } from '../learn/modal';
import { answerForm, material, saveIndicator, simulator } from './exam';
import { mountJava } from './java';
import { mountPython } from './python';
import { mountC } from './c';
import { mountSql } from './sql';

const catName = (c: Category) => CATEGORIES.find((x) => x.id === c)?.name ?? c;

function link(href: string, cls: string, text: string): HTMLAnchorElement {
  const a = el('a', cls, text);
  a.href = href;
  a.dataset.link = '';
  return a;
}

export function mountLearn(root: HTMLElement, path: string): () => void {
  const [, , a, b] = path.split('/');
  const cleanup: (() => void)[] = [];
  const done = () => { closeModal(); for (const f of cleanup) f(); store.flush(); };
  root.innerHTML = '';
  if (a === 'c' && b) {
    const c = conceptById(decodeURIComponent(b));
    if (c) { renderConcept(root, c, cleanup); return done; }
  }
  const p = a ? byId(decodeURIComponent(a)) : undefined;
  if (p) { renderProblem(root, p, cleanup); return done; }
  renderHome(root);
  return done;
}

// ── 첫 화면: 개념 지도 ─────────────────────────────────

function renderHome(root: HTMLElement) {
  const page = el('section', 'panel learn-home');
  page.append(
    el('h2', 'exam-title', '정보처리기사 학습 — 보면서 이해하기'),
    el('p', 'exam-lead', '시험처럼 채점만 하는 곳이 아니라, 문제를 풀면서 바로 옆에서 그림으로 확인하는 곳입니다. 코드 문제는 한 줄씩 실행하며 값이 바뀌는 모습을 보고, 이론 문제는 알아야 할 기초 지식을 애니메이션으로 봅니다.'),
  );
  const rel = problemsOf(ALL);
  page.append(el('h3', 'exam-sec', '개념 지도'), el('p', 'muted small', '개념을 누르면 그림으로 크게 보고, 그 개념이 나오는 문제를 이어서 풀 수 있습니다.'));
  for (const cat of CAT_ORDER) {
    const cs = CONCEPTS.filter((c) => c.cat === cat);
    if (!cs.length) continue;
    const row = el('div', 'concept-row');
    row.append(el('span', `chip cat-${cat}`, catName(cat)));
    const grid = el('div', 'concept-grid');
    for (const c of cs) {
      const card = link(`/learn/c/${c.id}`, 'concept-card', '');
      card.append(el('b', '', c.name));
      if (c.en) card.append(el('span', 'concept-en', c.en));
      card.append(el('p', '', c.summary), el('span', 'muted small', `관련 문제 ${rel.get(c.id)!.length}개`));
      grid.append(card);
    }
    row.append(grid);
    page.append(row);
  }
  page.append(el('h3', 'exam-sec', '문제로 학습하기'), el('p', 'muted small', '유형을 고르면 첫 문제부터 그림과 함께 풀어 나갑니다. 회차 모의고사 문제도 모두 들어 있습니다.'));
  const grid = el('div', 'exam-cats');
  const marks = store.marks();
  for (const c of CATEGORIES) {
    const list = listOf(c.id);
    if (!list.length) continue;
    const first = list.find((p) => marks[p.id] !== 'ok') ?? list[0]!;
    const card = link(`/learn/${first.id}`, 'exam-card', '');
    card.append(el('b', '', c.name), el('span', 'muted', ` ${list.filter((p) => marks[p.id] === 'ok').length} / ${list.length}`), el('p', '', c.desc));
    grid.append(card);
  }
  page.append(grid, el('p', 'muted small exam-note', '시험처럼 풀어 보려면 상단의 "모의고사"로 가세요. 학습 화면에서 쓴 답도 이 브라우저에 임시 저장됩니다.'));
  root.append(page);
}

// ── 개념 페이지 ────────────────────────────────────────

function renderConcept(root: HTMLElement, c: Concept, cleanup: (() => void)[]) {
  const page = el('div', 'learn-concept');
  const head = el('div', 'panel learn-chead');
  head.append(link('/learn', 'exam-back', '← 개념 지도'), el('span', `chip cat-${c.cat}`, catName(c.cat)), el('h2', 'exam-title', c.name));
  if (c.en) head.append(el('span', 'concept-en', c.en));
  head.append(el('p', 'exam-lead', c.summary));
  const viz = c.make();
  cleanup.push(() => viz.dispose());
  const vbox = el('section', 'panel learn-vizbox');
  vbox.append(viz.el);
  const rel = problemsOf(ALL).get(c.id) ?? [];
  const side = el('section', 'panel learn-rel');
  side.append(el('h3', '', `이 개념이 나오는 문제 ${rel.length}개`));
  const ul = el('ul', 'exam-list');
  const marks = store.marks();
  for (const p of rel) {
    const li = el('li');
    const a = link(`/learn/${p.id}`, 'exam-item', p.round ? `${roundById(p.round)?.label} ${p.no}번 · ${p.title}` : p.title);
    const m = marks[p.id];
    a.prepend(el('span', `mark ${m ?? ''}`, m === 'ok' ? '✓' : m === 'no' ? '✗' : m === 'part' ? '△' : '•'));
    li.append(a);
    ul.append(li);
  }
  side.append(ul);
  page.append(head, vbox, side);
  root.append(page);
}

// ── 문제 학습 화면 ─────────────────────────────────────

const isCode = (p: Problem) => p.kind === 'code' || p.kind === 'code-blank';
const isSql = (p: Problem) => p.kind === 'sql' || p.kind === 'sql-write';

function renderProblem(root: HTMLElement, p: Problem, cleanup: (() => void)[]) {
  const list = listOf(p.cat);
  const idx = list.indexOf(p);
  const concepts = conceptsFor(p);

  // 문제 칸 (모든 유형 공통)
  const qbox = el('section', 'panel learn-q');
  const head = el('div', 'ex-head');
  head.append(link('/learn', 'exam-back', '← 학습'), el('span', `chip cat-${p.cat}`, catName(p.cat)));
  if (p.round) head.append(link(`/exam/round/${p.round}#q${p.no}`, 'chip round-chip', `${roundById(p.round)?.label} ${p.no}번`));
  head.append(el('span', 'muted small', `${idx + 1} / ${list.length}`));
  qbox.append(head, el('h2', 'exam-title', p.title), el('p', 'ex-q', p.question));
  // 코드·SQL 문제는 아래 디버거에 코드와 표가 나오므로 자료를 따로 그리지 않는다 (빈칸 문제는 빈칸 코드를 보여 준다)
  if (!(p.kind === 'code' || isSql(p))) qbox.append(material(p));

  const status = el('span', 'save-state muted small');
  const form = answerForm(p, store.draftOf(p.id), (vals) => store.setDraft(p.id, vals));
  const grade = el('button', 'primary', '확인하기');
  grade.type = 'submit';
  const peek = el('button', '', '정답 보기');
  peek.type = 'button';
  const row = el('div', 'ex-row');
  row.append(grade, peek, status);
  form.el.append(row, el('p', 'muted small', answerHint(p)));
  qbox.append(form.el);
  cleanup.push(saveIndicator(status, store.draftOf(p.id).length ? true : undefined));
  const result = el('div', 'ex-result');
  result.hidden = true;
  qbox.append(result);

  // 그림 칸
  const vizHost = el('section', 'panel learn-viz');
  let current: Viz | null = null;
  let focusNames: string[] = [];
  const panes: { name: string; make: () => Viz; href?: string }[] = [];
  const sim = simulator(p);
  if (sim) panes.push({ name: '▶ 이 문제 그대로 시뮬레이션', make: () => ({ el: sim.el, dispose: sim.dispose }) });
  for (const c of concepts) panes.push({ name: c.name, make: c.make, href: `/learn/c/${c.id}` });
  const tabsEl = el('div', 'seg learn-tabs');
  const paneHost = el('div', 'learn-pane');
  const more = el('div', 'learn-more');
  const open = (k: number) => {
    current?.dispose();
    const pane = panes[k]!;
    current = pane.make();
    paneHost.replaceChildren(current.el);
    if (focusNames.length) current.focus?.(focusNames);
    tabsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
    more.replaceChildren(...(pane.href ? [link(pane.href, 'muted small', '이 개념 크게 보기 →')] : []));
  };
  panes.forEach((pn, k) => {
    const b = el('button', '', pn.name);
    b.addEventListener('click', () => open(k));
    tabsEl.append(b);
  });
  cleanup.push(() => current?.dispose());

  const reveal = async (mine: string[] | null) => {
    let s = 0;
    if (mine) {
      grade.disabled = true;
      s = await score(p, mine);
      grade.disabled = false;
      store.setMark(p.id, s === 1 ? 'ok' : s > 0 ? 'part' : 'no');
    }
    result.hidden = false;
    result.className = `ex-result ${mine === null ? 'peek' : s === 1 ? 'ok' : s > 0 ? 'part' : 'no'}`;
    result.replaceChildren(el('h3', '', mine === null ? '정답' : s === 1 ? '✓ 정답입니다' : s > 0 ? `△ 부분 정답 (${Math.round(s * 100)}%)` : '✗ 다시 생각해 보세요'));
    if (mine !== null && s < 1) result.append(el('p', 'muted small', '정답'));
    result.append(el('pre', 'ex-ans', answerOf(p)), el('h3', 'ex-explain-h', '해설'), el('p', 'ex-explain', p.explain));
    // 그림에서 정답 위치를 빛나게
    if (p.kind === 'short') focusNames = p.blanks.flatMap((bl) => bl.accept);
    current?.focus?.(focusNames);
    if (focusNames.length && panes.length) result.append(el('p', 'muted small', '오른쪽 그림에서 정답 위치가 빛나고 있습니다.'));
  };
  form.el.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = form.values();
    if (vals.every((v) => !v.trim())) { form.focus(); return; }
    void reveal(vals);
  });
  peek.addEventListener('click', () => void reveal(null));

  const pager = el('nav', 'ex-pager');
  const prev = list[idx - 1];
  const next = list[idx + 1];
  pager.append(prev ? link(`/learn/${prev.id}`, 'button', `← ${prev.title}`) : el('span'),
    next ? link(`/learn/${next.id}`, 'button', `${next.title} →`) : link('/learn', 'button', '학습 처음으로'));

  if (isCode(p) || isSql(p)) {
    // 코드·SQL: 위에 문제, 아래에 디버거, 그 아래 관련 개념
    const page = el('div', 'learn-codepage');
    const ide = el('div', 'learn-ide');
    page.append(qbox, ide);
    if (panes.length) {
      vizHost.append(el('h3', 'learn-vh', '함께 알아 둘 개념'), tabsEl, paneHost, more);
      page.append(vizHost);
    }
    qbox.append(pager);
    root.append(page);
    cleanup.push(mountDebugger(ide, p, form.values));
  } else {
    // 이론·계산: 왼쪽 문제, 오른쪽 그림
    const page = el('div', 'learn-split');
    vizHost.append(el('h3', 'learn-vh', sim ? '그림으로 풀어 보기' : '이 문제를 풀려면 알아야 할 것'));
    if (panes.length) vizHost.append(tabsEl, paneHost, more);
    else vizHost.append(el('p', 'muted', '이 문제에 연결된 개념 그림이 아직 없습니다. 아래 해설을 참고하세요.'));
    qbox.append(pager);
    page.append(qbox, vizHost);
    root.append(page);
  }
  if (panes.length) open(0);
}

/** 문제 코드를 디버거로. 코드 빈칸 문제는 "내 답으로 실행"·"정답으로 실행"을 고른다 */
function mountDebugger(host: HTMLElement, p: Problem, mine: () => string[]): () => void {
  let un: (() => void) | null = null;
  const mount = (code: string, storeKey?: string) => {
    un?.();
    host.replaceChildren();
    const box = el('div');
    host.append(box);
    const preset = { code, storeKey };
    if (p.kind === 'code' || p.kind === 'code-blank') {
      un = p.lang === 'python' ? mountPython(box, preset) : p.lang === 'c' ? mountC(box, preset) : mountJava(box, preset);
    }
  };
  if (p.kind === 'code') {
    mount(p.code, `codestep.learn.code.${p.id}`);
  } else if (p.kind === 'code-blank') {
    const pick = el('div', 'panel learn-blankrun');
    const mineBtn = el('button', 'primary', '▶ 내 답을 빈칸에 넣어 실행');
    const ansBtn = el('button', '', '정답 코드로 실행');
    pick.append(el('p', '', '빈칸에 쓴 답을 코드에 넣어 실제로 실행해 볼 수 있습니다. 틀린 답이면 어떤 결과(또는 오류)가 나는지 확인해 보세요.'), mineBtn, ansBtn);
    host.append(pick);
    mineBtn.addEventListener('click', () => {
      const vals = mine();
      mount(filledCode(p, (b) => vals[p.blanks.indexOf(b)]?.trim() || b.label));
    });
    ansBtn.addEventListener('click', () => mount(filledCode(p)));
  } else if (p.kind === 'sql') {
    un = mountSql(host, { setup: p.before ? `${p.setup}\n${p.before}` : p.setup, query: p.query });
  } else if (p.kind === 'sql-write') {
    const table = /CREATE TABLE\s+([^\s(]+)/i.exec(p.setup)?.[1] ?? '';
    un = mountSql(host, { setup: p.setup, query: `SELECT * FROM ${table};` });
    const tip = el('p', 'muted small learn-tip', '"추적할 쿼리" 칸에 직접 SQL을 써서 실행해 보세요. 표가 어떻게 처리되는지 한 행씩 보여 줍니다.');
    host.prepend(tip);
  }
  return () => un?.();
}

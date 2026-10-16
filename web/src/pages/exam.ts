// 정보처리기사 모드: 회차별 모의고사와 유형별 연습. 채점한 뒤 그래픽으로 풀이를 본다.
//
//   /exam                 회차 목록·유형 목록·이어 풀기
//   /exam/round/<회차>     모의고사 20문항: 답은 쓰는 즉시 임시 저장, 제출하면 100점 만점 채점
//   /exam/<id>            한 문제씩: 문제 → 내 답 → 채점 → 해설·그래픽 풀이
//   /exam/<id>/solve      코드·SQL 문제를 디버거로 한 줄씩 따라가기
import { CATEGORIES, ROUNDS, byId, listOf, roundById } from '../exam/data';
import type { Category, Problem, Round, Table } from '../exam/problems';
import { answerHint, answerOf, fieldsOf, filledCode, score } from '../exam/answer';
import * as store from '../exam/store';
import { notationSim, pagingSim, procTable, schedSim, subnetDivSim, subnetSim, traverseSim, treeSvg, type Sim } from '../exam/views';
import { fromLevel } from '../exam/sims/tree';
import { el } from '../view/stage';
import { mountJava } from './java';
import { mountPython } from './python';
import { mountC } from './c';
import { mountSql } from './sql';
import { runSql } from '../sql/engine';
import { buildSteps, show } from '../sql/steps';

const catName = (c: Category) => CATEGORIES.find((x) => x.id === c)?.name ?? c;
const LANG_NAME = { c: 'C', java: 'Java', python: 'Python' } as const;
const LEVEL = ['', '쉬움', '보통', '다소 어려움', '어려움', '매우 어려움'];
const PASS = 60;
const PER = 5;   // 문항당 배점

/** 그래픽 풀이(디버거)를 쓸 수 있는 문제 */
const solvable = (p: Problem) => p.kind === 'sql' || p.kind === 'code' || p.kind === 'code-blank' || p.kind === 'sql-write';

/** 풀이 화면의 "돌아가기"가 갈 곳 (마지막으로 본 시험 화면) */
let backTo = '';

function link(href: string, cls: string, text: string): HTMLAnchorElement {
  const a = el('a', cls, text);
  a.href = href;
  a.dataset.link = '';
  return a;
}

const roundLabel = (id: string) => roundById(id)?.label ?? id;
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
};
const timeOf = (t: number) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function mountExam(root: HTMLElement, path: string): () => void {
  const [, , a, b] = path.split('/');
  const cleanup: (() => void)[] = [];
  const done = () => { for (const f of cleanup) f(); store.flush(); };

  if (a === 'round' && b) {
    const r = roundById(decodeURIComponent(b));
    if (r) {
      backTo = path;
      mountRound(root, r, cleanup);
      return done;
    }
  }
  const p = a ? byId(decodeURIComponent(a)) : undefined;
  if (p && b === 'solve' && solvable(p)) return mountSolve(root, p);

  root.innerHTML = '';
  if (!p) {
    const main = el('section', 'panel exam-home');
    root.append(main);
    renderHome(main);
    return done;
  }
  backTo = path;
  const page = el('div', 'exam');
  const side = el('aside', 'panel exam-side');
  const main = el('section', 'panel exam-main');
  page.append(side, main);
  root.append(page);
  renderSide(side, p);
  renderProblem(main, side, p, cleanup);
  return done;
}

// ── 첫 화면 ────────────────────────────────────────────

function renderHome(main: HTMLElement) {
  main.append(
    el('h2', 'exam-title', '정보처리기사 실기 — 그래픽으로 풀어 보기'),
    el('p', 'exam-lead', '2020년 개편 이후 모든 회차를 같은 개념·같은 함정·비슷한 난이도로 다시 만든 모의고사와, 유형별 연습 문제가 있습니다. 채점한 뒤에는 코드를 실제로 한 줄씩 실행하고, 운영체제·자료구조·네트워크 문제는 시뮬레이터로 따라갑니다.'),
    el('p', 'muted small', '쓴 답은 쓰는 즉시 이 브라우저에 임시 저장됩니다. 창을 닫았다가 다시 와도 이어서 풀 수 있습니다. (다른 기기·시크릿 창에서는 보이지 않습니다)'),
  );

  // 이어 풀기
  const states = store.allRounds();
  const going = ROUNDS.filter((r) => {
    const s = states[r.id];
    return s && !s.submitted && Object.keys(s.answers).length > 0;
  }).sort((x, y) => states[y.id]!.updated - states[x.id]!.updated);
  if (going.length) {
    const box = el('div', 'exam-continue');
    box.append(el('h3', '', '이어서 풀기'));
    for (const r of going) {
      const s = states[r.id]!;
      const a = link(`/exam/round/${r.id}`, 'exam-continue-item', '');
      a.append(el('b', '', `${r.label} 모의고사`),
        el('span', 'muted', ` · ${Object.keys(s.answers).length}/20 작성 · 푼 시간 ${clock(s.elapsed)} · ${ago(s.updated)} 저장`),
        el('span', 'go', '이어 풀기 →'));
      box.append(a);
    }
    main.append(box);
  }

  // 회차별 모의고사
  main.append(el('h3', 'exam-sec', '회차별 모의고사'),
    el('p', 'muted small', '20문항 · 문항당 5점 · 60점 이상 합격 · 시험 시간 2시간 30분 기준. 빈칸이 여럿인 문제는 칸마다 부분 점수를 줍니다.'));
  const years = [...new Set(ROUNDS.map((r) => r.id.split('-')[0]!))];
  for (const y of years) {
    const row = el('div', 'round-row');
    row.append(el('span', 'round-year', `${y}년`));
    const grid = el('div', 'round-grid');
    for (const r of ROUNDS.filter((x) => x.id.startsWith(`${y}-`))) {
      const s = states[r.id];
      const card = link(`/exam/round/${r.id}`, 'round-card', '');
      card.append(el('b', '', r.label.replace(`${y}년 `, '')));
      card.append(el('span', `lv lv${r.level}`, LEVEL[r.level]!));
      if (r.pass !== undefined) card.append(el('span', 'muted small', `합격률 ${r.pass}%`));
      const best = s?.history.length ? Math.max(...s.history.map((h) => h.score)) : null;
      if (s && !s.submitted && Object.keys(s.answers).length) card.append(el('span', 'state going', `푸는 중 ${Object.keys(s.answers).length}/20`));
      else if (best !== null) card.append(el('span', `state ${best >= PASS ? 'pass' : 'fail'}`, `최고 ${fmtScore(best)}점`));
      grid.append(card);
    }
    row.append(grid);
    main.append(row);
  }

  // 유형별 연습
  main.append(el('h3', 'exam-sec', '유형별 연습'),
    el('p', 'muted small', '한 문제씩 풀고 바로 채점합니다. 회차 문제도 유형별로 모여 있습니다.'));
  const marks = store.marks();
  const grid = el('div', 'exam-cats');
  for (const c of CATEGORIES) {
    const list = listOf(c.id);
    if (!list.length) continue;
    const ok = list.filter((p) => marks[p.id] === 'ok').length;
    const first = list.find((p) => marks[p.id] !== 'ok') ?? list[0]!;
    const card = link(`/exam/${first.id}`, 'exam-card', '');
    const bar = el('div', 'progress-bar');
    const fill = el('span');
    fill.style.width = `${(ok / list.length) * 100}%`;
    bar.append(fill);
    card.append(el('b', '', c.name), el('span', 'muted', ` ${ok} / ${list.length}`), el('p', '', c.desc), bar);
    grid.append(card);
  }
  main.append(grid);
  main.append(el('p', 'muted small exam-note',
    '※ 기출 원문은 싣지 않습니다. 실기 문제는 공개되지 않고 인터넷의 복원 문제는 각 출처의 저작물이라, 공개된 자료에서 "그 회차에 어떤 개념이 나왔는지"만 참고해 지문과 코드를 새로 썼습니다. 개념을 확인하지 못한 일부 문항(경향 표시)은 같은 시기 출제 경향으로 채웠습니다. 코드·SQL 문제의 정답은 모두 실제 실행으로 검증했습니다.'));
}

// ── 한 문제씩 (유형별 연습) ─────────────────────────────

function renderSide(side: HTMLElement, current: Problem) {
  side.replaceChildren();
  const list = listOf(current.cat);
  const marks = store.marks();
  const ok = list.filter((p) => marks[p.id] === 'ok').length;
  const head = el('div', 'exam-progress');
  head.append(el('b', '', catName(current.cat)), el('span', 'muted', ` 맞힌 문제 ${ok} / ${list.length}`));
  const bar = el('div', 'progress-bar');
  const fill = el('span');
  fill.style.width = `${(ok / list.length) * 100}%`;
  bar.append(fill);
  const top = el('div', 'side-head');
  top.append(link('/exam', 'exam-back', '← 정보처리기사 처음으로'), head, bar);
  side.append(top);

  // 연습 문제, 그리고 회차별로 묶는다
  const groups = new Map<string, Problem[]>();
  for (const p of list) {
    const g = p.round ? roundLabel(p.round) : '유형별 연습';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }
  const curGroup = current.round ? roundLabel(current.round) : '유형별 연습';
  for (const [g, ps] of groups) {
    const det = el('details', 'exam-group');
    det.open = g === curGroup;
    const done = ps.filter((p) => marks[p.id] === 'ok').length;
    const sum = el('summary', '', `${g} `);
    sum.append(el('span', 'muted small', `${done}/${ps.length}`));
    det.append(sum);
    const ul = el('ul', 'exam-list');
    for (const p of ps) {
      const li = el('li');
      const a = link(`/exam/${p.id}`, `exam-item${p.id === current.id ? ' current' : ''}`, p.no ? `${p.no}. ${p.title}` : p.title);
      const m = marks[p.id];
      a.prepend(el('span', `mark ${m ?? ''}`, m === 'ok' ? '✓' : m === 'no' ? '✗' : m === 'part' ? '△' : store.draftOf(p.id).length ? '✎' : '•'));
      li.append(a);
      ul.append(li);
    }
    det.append(ul);
    side.append(det);
  }
  const cur = side.querySelector<HTMLElement>('.exam-item.current');
  if (cur && cur.offsetTop > side.clientHeight - 40) side.scrollTop = cur.offsetTop - side.clientHeight / 2;
}

function renderProblem(main: HTMLElement, side: HTMLElement, p: Problem, cleanup: (() => void)[]) {
  const list = listOf(p.cat);
  const idx = list.indexOf(p);
  const head = el('div', 'ex-head');
  head.append(el('span', `chip cat-${p.cat}`, catName(p.cat)));
  if (p.round) {
    head.append(link(`/exam/round/${p.round}#q${p.no}`, 'chip round-chip', `${roundLabel(p.round)} ${p.no}번`));
    if (p.trend) head.append(el('span', 'chip trend', '경향'));
  }
  head.append(el('span', 'muted small', `${idx + 1} / ${list.length}`));
  main.append(head, el('h2', 'exam-title', p.title), el('p', 'ex-q', p.question));
  main.append(material(p));

  const status = el('span', 'save-state muted small');
  const form = answerForm(p, store.draftOf(p.id), (vals) => store.setDraft(p.id, vals));
  const grade = el('button', 'primary', '채점하기');
  grade.type = 'submit';
  const peek = el('button', '', '정답 보기');
  peek.type = 'button';
  const btns = el('div', 'ex-row');
  btns.append(grade, peek, status);
  form.el.append(btns, el('p', 'muted small', answerHint(p)));
  main.append(form.el);
  cleanup.push(saveIndicator(status, store.draftOf(p.id).length ? true : undefined));

  const result = el('div', 'ex-result');
  result.hidden = true;
  main.append(result);

  const reveal = async (mine: string[] | null) => {
    let s = 0;
    if (mine) {
      grade.disabled = true;
      s = await score(p, mine);
      grade.disabled = false;
      store.setMark(p.id, s === 1 ? 'ok' : s > 0 ? 'part' : 'no');
    }
    showResult(result, p, mine ? s : null, cleanup);
    renderSide(side, p);
  };
  form.el.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = form.values();
    if (vals.every((v) => !v.trim())) { form.focus(); return; }
    void reveal(vals);
  });
  peek.addEventListener('click', () => void reveal(null));

  // 이전·다음
  const pager = el('nav', 'ex-pager');
  const prev = list[idx - 1];
  const next = list[idx + 1];
  pager.append(prev ? link(`/exam/${prev.id}`, 'button', `← ${prev.title}`) : el('span'),
    next ? link(`/exam/${next.id}`, 'button', `${next.title} →`) : link('/exam', 'button', '목록으로'));
  main.append(pager);
}

/** 채점 결과·정답·해설·그래픽 풀이 */
function showResult(box: HTMLElement, p: Problem, s: number | null, cleanup: (() => void)[]) {
  box.hidden = false;
  box.className = `ex-result ${s === null ? 'peek' : s === 1 ? 'ok' : s > 0 ? 'part' : 'no'}`;
  const title = s === null ? '정답' : s === 1 ? '✓ 정답입니다' : s > 0 ? `△ 부분 정답 (${Math.round(s * 100)}%)` : '✗ 틀렸습니다';
  box.replaceChildren(el('h3', '', title));
  if (s !== null && s < 1) box.append(el('p', 'muted small', '정답'));
  box.append(el('pre', 'ex-ans', answerOf(p)));
  if ((p.kind === 'short' || p.kind === 'code-blank') && p.blanks.some((b) => b.accept.length > 1)) {
    const alt = p.blanks.map((b) => b.accept.slice(1).join(', ')).filter(Boolean);
    if (alt.length) box.append(el('p', 'muted small', `이렇게 써도 인정: ${alt.join(' / ')}`));
  }
  box.append(el('h3', 'ex-explain-h', '해설'), el('p', 'ex-explain', p.explain));
  if (solvable(p)) {
    box.append(link(`/exam/${p.id}/solve`, 'button primary', '▶ 그래픽으로 풀이 보기 (한 줄씩 실행)'));
  } else {
    const sim = simulator(p);
    if (sim) {
      cleanup.push(sim.dispose);
      const w = el('div', 'ex-sim');
      w.append(el('h3', 'ex-explain-h', '그래픽 풀이'), sim.el);
      box.append(w);
    }
  }
}

/** 답 칸들. 바뀔 때마다 onChange(칸별 값) */
function answerForm(p: Problem, initial: string[], onChange: (vals: string[]) => void) {
  const form = el('form', 'ex-answer');
  const inputs: (HTMLInputElement | HTMLTextAreaElement)[] = [];
  const fields = fieldsOf(p);
  const grid = el('div', fields.length > 1 ? 'ex-blanks' : 'ex-single');
  fields.forEach((f, i) => {
    const input = f.multiline ? el('textarea') : el('input');
    input.className = `ex-input${f.mono ? ' mono' : ''}`;
    input.setAttribute('aria-label', f.label ? `빈칸 ${f.label}` : '내 답');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    if (input instanceof HTMLTextAreaElement) {
      input.rows = p.kind === 'sql-write' ? 4 : Math.max(2, Math.min(6, answerOf(p).split('\n').length + 1));
    }
    input.placeholder = f.label ? '' : '내 답';
    input.value = initial[i] ?? '';
    input.addEventListener('input', () => onChange(inputs.map((x) => x.value)));
    if (input instanceof HTMLTextAreaElement) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
      });
    }
    inputs.push(input);
    if (f.label) {
      const row = el('label', 'ex-blank');
      row.append(el('span', 'ex-blank-label', f.label), input);
      grid.append(row);
    } else grid.append(input);
  });
  form.append(grid);
  return {
    el: form,
    values: () => inputs.map((x) => x.value),
    focus: () => inputs[0]?.focus(),
    disable: (on: boolean) => { for (const x of inputs) x.readOnly = on; },
    clear: () => { for (const x of inputs) x.value = ''; },
  };
}

/** "임시 저장됨 14:03:21" 표시. restored: 다시 열었을 때 불러온 저장 시각 */
function saveIndicator(node: HTMLElement, restored?: number | true): () => void {
  const paint = () => {
    const s = store.saveStatus();
    node.classList.toggle('error', s.failed);
    node.textContent = s.failed ? '⚠ 저장하지 못했습니다 (브라우저 저장소를 쓸 수 없음)'
      : s.pending ? '저장 중…'
        : s.at ? `✓ 임시 저장됨 ${timeOf(s.at)}`
          : restored === true ? '✓ 임시 저장된 답을 불러왔습니다'
            : restored ? `✓ 임시 저장된 답을 불러왔습니다 (${ago(restored)} 저장)` : '';
  };
  paint();
  return store.onSaved(paint);
}

// ── 회차 모의고사 ───────────────────────────────────────

function mountRound(root: HTMLElement, r: Round, cleanup: (() => void)[]) {
  root.innerHTML = '';
  const page = el('div', 'exam round');
  const side = el('aside', 'panel exam-side sheet');
  const main = el('section', 'panel exam-main paper');
  page.append(side, main);
  root.append(page);

  const answers = (): Record<string, string[]> => store.roundState(r.id)?.answers ?? {};
  const filled = (p: Problem) => (answers()[p.id] ?? []).some((v) => v.trim());

  // ── 답안지(왼쪽) ──
  const head = el('div', 'sheet-head');
  head.append(el('b', '', `${r.label} 모의고사`),
    el('span', 'muted small', [r.pass !== undefined ? `합격률 ${r.pass}%` : '', LEVEL[r.level]].filter(Boolean).join(' · ')));
  const timerEl = el('div', 'sheet-timer');
  const saveEl = el('div', 'save-state muted small');
  const omr = el('div', 'omr');
  const omrBtns = r.problems.map((p) => {
    const btn = el('a', 'omr-cell', String(p.no));
    btn.href = `#q${p.no}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(`q${p.no}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#q${p.no}`);
    });
    omr.append(btn);
    return btn;
  });
  const submitBox = el('div', 'sheet-submit');
  side.append(link('/exam', 'exam-back', '← 회차 목록'), head, timerEl, omr, saveEl, submitBox);
  const before = store.roundState(r.id);
  cleanup.push(saveIndicator(saveEl, before && Object.keys(before.answers).length ? before.updated : undefined));

  // ── 시험지(오른쪽) ──
  const title = el('div', 'paper-head');
  title.append(el('h2', 'exam-title', `${r.label} 정보처리기사 실기 모의고사`),
    el('p', 'muted small', '20문항 · 문항당 5점 · 60점 이상 합격. 쓴 답은 바로 임시 저장되어 창을 닫아도 남습니다.'),
    el('p', 'round-note', r.note));
  const banner = el('div', 'score-banner');
  banner.hidden = true;
  main.append(title, banner);

  type Card = { p: Problem; form: ReturnType<typeof answerForm>; result: HTMLElement; titleEl: HTMLElement };
  const cards: Card[] = [];
  for (const p of r.problems) {
    const card = el('article', 'q-card');
    card.id = `q${p.no}`;
    const qh = el('div', 'q-head');
    const titleEl = el('span', 'q-title', p.title);
    qh.append(el('span', 'q-no', `${p.no}`), el('span', `chip cat-${p.cat}`, catName(p.cat)), titleEl);
    if (p.trend) qh.append(el('span', 'chip trend', '경향'));
    qh.append(el('span', 'q-pt muted small', `${PER}점`));
    card.append(qh, el('p', 'ex-q', p.question), material(p));
    const form = answerForm(p, answers()[p.id] ?? [], (vals) => {
      store.setRoundAnswer(r.id, p.id, vals);
      omrBtns[p.no! - 1]!.classList.toggle('filled', vals.some((v) => v.trim()));
    });
    form.el.addEventListener('submit', (e) => e.preventDefault());
    form.el.append(el('p', 'muted small', answerHint(p)));
    const result = el('div', 'ex-result');
    result.hidden = true;
    card.append(form.el, result);
    main.append(card);
    cards.push({ p, form, result, titleEl });
  }
  const bottom = el('div', 'paper-bottom');
  main.append(bottom);

  // ── 시간: 화면을 보고 있고 제출 전일 때만 흐른다 ──
  let shown = store.roundState(r.id)?.elapsed ?? 0;
  let pending = 0;
  let lastTick = performance.now();
  const paintTimer = () => {
    timerEl.replaceChildren(el('span', 'muted small', '푼 시간 '), el('b', shown > 150 * 60_000 ? 'over' : '', clock(shown)),
      el('span', 'muted small', ' / 2:30:00'));
  };
  const commit = () => { if (pending) { store.addElapsed(r.id, pending); pending = 0; } };
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(now - lastTick, 5000);
    lastTick = now;
    if (document.visibilityState !== 'visible' || store.roundState(r.id)?.submitted) return;
    shown += dt;
    pending += dt;
    if (pending >= 10_000) commit();
    paintTimer();
  };
  const iv = window.setInterval(tick, 1000);
  const onVis = () => {
    lastTick = performance.now();
    if (document.visibilityState === 'hidden') { commit(); store.flush(); }
  };
  document.addEventListener('visibilitychange', onVis);
  addEventListener('pagehide', commit);
  cleanup.push(() => {
    clearInterval(iv);
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('pagehide', commit);
    if (!store.roundState(r.id)?.submitted) commit();
  });

  // ── 제출 전/후 화면 ──
  const paint = () => {
    const st = store.roundState(r.id);
    const sub = st?.submitted;
    for (const c of cards) {
      c.form.disable(!!sub);
      c.titleEl.hidden = !sub;   // 제목은 개념을 알려 주므로 채점 뒤에만
      const i = c.p.no! - 1;
      omrBtns[i]!.className = 'omr-cell';
      if (sub) {
        const s = sub.scores[c.p.id] ?? 0;
        omrBtns[i]!.classList.add(s === 1 ? 'ok' : s > 0 ? 'part' : 'no');
        showResult(c.result, c.p, s, cleanup);
        c.result.prepend(el('p', 'q-score', `${fmtScore(PER * s)} / ${PER}점`));
      } else {
        c.result.hidden = true;
        if (filled(c.p)) omrBtns[i]!.classList.add('filled');
      }
    }
    submitBox.replaceChildren();
    bottom.replaceChildren();
    if (sub && st) {
      const passed = sub.score >= PASS;
      banner.hidden = false;
      banner.className = `score-banner ${passed ? 'pass' : 'fail'}`;
      const right = Object.values(sub.scores).filter((s) => s === 1).length;
      banner.replaceChildren(el('b', 'big', `${fmtScore(sub.score)}점`), el('span', 'verdict', passed ? '합격' : '불합격'),
        el('span', 'muted small', `맞힌 문항 ${right}/20 · 푼 시간 ${clock(st.elapsed)} · ${new Date(sub.at).toLocaleString('ko-KR')}`));
      banner.append(areaBreakdown(r, sub.scores));
      if (st.history.length > 1) {
        banner.append(el('p', 'muted small', `지난 기록: ${st.history.slice(0, -1).map((h) => `${fmtScore(h.score)}점`).join(' → ')}`));
      }
      submitBox.append(el('div', `sheet-score ${passed ? 'pass' : 'fail'}`, `${fmtScore(sub.score)}점 · ${passed ? '합격' : '불합격'}`), resetButton());
      bottom.append(resetButton(), link('/exam', 'button', '회차 목록으로'));
    } else {
      banner.hidden = true;
      for (const host of [submitBox, bottom]) {
        const btn = el('button', 'primary', '제출하고 채점');
        btn.addEventListener('click', () => askSubmit(host));
        host.append(btn);
      }
    }
  };

  const askSubmit = (where: HTMLElement) => {
    const empty = r.problems.filter((p) => !filled(p)).map((p) => p.no);
    if (!empty.length) { void submit(); return; }
    where.replaceChildren();
    const ask = el('div', 'confirm');
    ask.append(el('p', '', `${empty.length}문항(${empty.slice(0, 8).join(', ')}${empty.length > 8 ? ' …' : ''}번)이 비어 있습니다. 그래도 제출할까요?`));
    const yes = el('button', 'primary', '제출');
    const no = el('button', '', '계속 풀기');
    yes.addEventListener('click', () => void submit());
    no.addEventListener('click', paint);
    ask.append(yes, no);
    where.append(ask);
  };

  const submit = async () => {
    submitBox.replaceChildren(el('span', 'muted', '채점하는 중…'));
    const ans = answers();
    const scores: Record<string, number> = {};
    for (const p of r.problems) scores[p.id] = await score(p, ans[p.id] ?? []);
    commit();
    const total = Math.round(r.problems.reduce((s, p) => s + PER * scores[p.id]!, 0) * 10) / 10;
    store.submitRound(r.id, scores, total);
    paint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetButton = () => {
    const b = el('button', '', '↺ 다시 풀기');
    b.addEventListener('click', () => {
      const host = b.parentElement!;
      const ask = el('div', 'confirm');
      ask.append(el('p', '', '쓴 답과 시간을 지우고 처음부터 풉니다. 점수 기록은 남습니다.'));
      const yes = el('button', 'primary', '다시 풀기');
      const no = el('button', '', '취소');
      yes.addEventListener('click', () => {
        store.resetRound(r.id);
        shown = 0;
        pending = 0;
        for (const c of cards) c.form.clear();
        paint();
        paintTimer();
        window.scrollTo({ top: 0 });
      });
      no.addEventListener('click', paint);
      ask.append(yes, no);
      host.replaceChildren(ask);
    });
    return b;
  };

  paint();
  paintTimer();
  // 주소에 #q7 같은 문항 표시가 있으면 그 문항으로
  const target = /^#q(\d+)$/.exec(location.hash);
  if (target) requestAnimationFrame(() => document.getElementById(`q${target[1]}`)?.scrollIntoView({ block: 'start' }));
}

/** 과목별 점수 */
function areaBreakdown(r: Round, scores: Record<string, number>): HTMLElement {
  const by = new Map<Category, { got: number; all: number }>();
  for (const p of r.problems) {
    const a = by.get(p.cat) ?? { got: 0, all: 0 };
    a.got += PER * (scores[p.id] ?? 0);
    a.all += PER;
    by.set(p.cat, a);
  }
  const box = el('div', 'area-bars');
  for (const c of CATEGORIES) {
    const a = by.get(c.id);
    if (!a) continue;
    const row = el('div', 'area-row');
    const bar = el('div', 'progress-bar');
    const fill = el('span');
    fill.style.width = `${(a.got / a.all) * 100}%`;
    bar.append(fill);
    row.append(el('span', '', c.name), bar, el('span', 'muted small', `${fmtScore(a.got)}/${a.all}`));
    box.append(row);
  }
  return box;
}

// ── 문제 자료 ───────────────────────────────────────────

function codeBlock(code: string, lang: string, marks: string[] = []): HTMLElement {
  const pre = el('pre', 'ex-code');
  pre.dataset.lang = lang;
  const re = marks.length ? new RegExp(`(${marks.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`) : null;
  code.trimEnd().split('\n').forEach((line, i) => {
    const ln = el('span', 'ln');
    ln.append(el('span', 'no', String(i + 1)));
    if (!re) ln.append(document.createTextNode(line || ' '));
    else {
      // 빈칸 표시(①, ② …)를 눈에 띄게
      for (const part of (line || ' ').split(re)) {
        ln.append(marks.includes(part) ? el('span', 'blank-mark', part) : document.createTextNode(part));
      }
    }
    pre.append(ln);
  });
  return pre;
}

function tableEl(t: Table): HTMLElement {
  const w = el('div', 'tablewrap');
  if (t.name) w.append(el('h3', '', `[${t.name}]`));
  const table = el('table', 'grid');
  const hr = el('tr');
  for (const c of t.cols) hr.append(el('th', '', c));
  table.append(hr);
  for (const r of t.rows) {
    const tr = el('tr');
    for (const v of r) tr.append(el('td', '', String(v)));
    table.append(tr);
  }
  const sc = el('div', 'scroll');
  sc.append(table);
  w.append(sc);
  return w;
}

/** setup SQL로 만든 표들을 보여 준다 */
function setupTables(setup: string): HTMLElement {
  const tables = el('div', 'ex-tables muted small', '표를 불러오는 중…');
  void runSql(setup, 'SELECT 1;').then((ev) => {
    const t = buildSteps(ev);
    tables.className = 'ex-tables';
    tables.replaceChildren(...t.tables.map((tb) => tableEl({
      name: tb.name, cols: tb.cols.slice(1),
      rows: tb.rows.map((r) => r.slice(1).map((v) => show(v).replace(/^'(.*)'$/, '$1'))),
    })));
  }).catch(() => { tables.textContent = '표를 불러오지 못했습니다.'; });
  return tables;
}

/** 문제에 딸린 자료: 코드, 표, 보기, 참조열, 트리 … */
function material(p: Problem): HTMLElement {
  const box = el('div', 'ex-material');
  switch (p.kind) {
    case 'code':
      box.append(codeBlock(p.code, LANG_NAME[p.lang]));
      break;
    case 'code-blank':
      box.append(codeBlock(p.code, LANG_NAME[p.lang], p.blanks.map((b) => b.label)));
      break;
    case 'sql': {
      box.append(setupTables(p.setup));
      const q = el('pre', 'ex-code');
      q.dataset.lang = 'SQL';
      q.textContent = p.before ? `${p.before.trim()}\n\n${p.query}` : p.query;
      box.append(q);
      break;
    }
    case 'sql-write':
      box.append(setupTables(p.setup));
      break;
    case 'short': {
      if (p.pre) {
        const pre = el('pre', 'ex-code plain');
        pre.textContent = p.pre;
        box.append(pre);
      }
      if (p.tables?.length) {
        const w = el('div', 'ex-tables');
        w.append(...p.tables.map(tableEl));
        box.append(w);
      }
      if (p.options?.length) {
        const ol = el('div', 'ex-options');
        ol.append(el('b', '', '〈보기〉'));
        const ul = el('ul');
        for (const o of p.options) ul.append(el('li', '', o));
        ol.append(ul);
        box.append(ol);
      }
      break;
    }
    case 'paging': {
      const refs = el('div', 'seq');
      refs.append(...p.refs.map((r) => el('span', 'chip', String(r))));
      box.append(el('p', 'muted small', `참조 순서 · 프레임 ${p.frames}개`), refs);
      break;
    }
    case 'sched':
      box.append(procTable(p.procs, p.algo === 'PRIORITY'));
      if (p.quantum) box.append(el('p', 'muted small', `시간 할당량(Time Quantum): ${p.quantum}`));
      break;
    case 'traverse': {
      const w = el('div', 'tree-wrap');
      w.append(treeSvg(fromLevel(p.level.split(/\s+/))).el);
      box.append(w);
      break;
    }
    case 'notation':
      box.append(el('p', 'ex-big', p.infix));
      break;
    case 'subnet':
      box.append(el('p', 'ex-big', `${p.ip}/${p.prefix}`));
      break;
    case 'subnet-div':
      box.append(el('p', 'ex-big', `${p.base}/${p.prefix} → ${p.count}개`));
      break;
  }
  return box;
}

function simulator(p: Problem): Sim | null {
  switch (p.kind) {
    case 'paging': return pagingSim(p.refs, p.frames, p.algo);
    case 'sched': return schedSim(p.procs, p.algo, p.quantum);
    case 'traverse': return traverseSim(p.level, p.order);
    case 'notation': return notationSim(p.infix, p.to);
    case 'subnet': return subnetSim(p.ip, p.prefix);
    case 'subnet-div': return subnetDivSim(p.base, p.prefix, p.count, p.nth);
    default: return null;
  }
}

// ── 코드·SQL 문제를 디버거로 ────────────────────────────

function mountSolve(root: HTMLElement, p: Problem): () => void {
  const fromRound = backTo.startsWith('/exam/round/');
  const bar = el('div', 'exam-bar');
  bar.append(
    link(fromRound ? `${backTo}#q${p.no}` : `/exam/${p.id}`, 'button', fromRound ? '← 모의고사로' : '← 문제로'),
    el('span', `chip cat-${p.cat}`, catName(p.cat)),
    el('b', '', p.round ? `${roundLabel(p.round)} ${p.no}번 · ${p.title}` : p.title),
    el('span', 'muted small', `정답: ${answerOf(p).replace(/\n/g, ' / ')}`),
  );
  root.classList.add('exam-solve');
  if (p.kind === 'sql') return mountSql(root, { setup: p.before ? `${p.setup}\n${p.before}` : p.setup, query: p.query, header: bar });
  if (p.kind === 'sql-write') {
    return p.check
      ? mountSql(root, { setup: `${p.setup}\n-- 모범 답안\n${p.answer}`, query: p.check, header: bar })
      : mountSql(root, { setup: p.setup, query: p.answer, header: bar });
  }
  if (p.kind !== 'code' && p.kind !== 'code-blank') return () => {};
  const code = p.kind === 'code' ? p.code : filledCode(p);
  const preset = { code, header: bar, storeKey: `codestep.exam.code.${p.id}` };
  if (p.lang === 'python') return mountPython(root, preset);
  if (p.lang === 'c') return mountC(root, preset);
  return mountJava(root, preset);
}

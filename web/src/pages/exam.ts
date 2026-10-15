// 정보처리기사 모드: 기출 유형 문제를 풀고, 채점한 뒤 그래픽으로 풀이를 본다.
//
//   /exam              문제 목록과 안내
//   /exam/<id>         문제 → 내 답 → 채점 → 해설·그래픽 풀이
//   /exam/<id>/solve   코드 문제를 디버거(Java·SQL 화면)로 한 줄씩 따라가기
import { CATEGORIES, PROBLEMS, byId, type Category, type Problem } from '../exam/problems';
import { answerHint, answerOf, isCorrect } from '../exam/answer';
import { notationSim, pagingSim, procTable, schedSim, subnetDivSim, subnetSim, traverseSim, treeSvg, type Sim } from '../exam/views';
import { fromLevel } from '../exam/sims/tree';
import { el } from '../view/stage';
import { mountJava } from './java';
import { mountPython } from './python';
import { mountC } from './c';
import { mountSql } from './sql';
import { runSql } from '../sql/engine';
import { buildSteps, show } from '../sql/steps';

const PROGRESS_KEY = 'codestep.exam';
type Mark = 'ok' | 'no';

function loadProgress(): Record<string, Mark> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, Mark>; } catch { return {}; }
}
function saveMark(id: string, m: Mark) {
  const p = loadProgress();
  p[id] = m;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* 무시 */ }
}

const catName = (c: Category) => CATEGORIES.find((x) => x.id === c)?.name ?? c;
const LANG_NAME = { c: 'C', java: 'Java', python: 'Python' } as const;
/** 그래픽 풀이(디버거)를 지금 쓸 수 있는 코드 문제 */
const solvable = (p: Problem) => p.kind === 'sql' || p.kind === 'code';

function link(href: string, cls: string, text: string): HTMLAnchorElement {
  const a = el('a', cls, text);
  a.href = href;
  a.dataset.link = '';
  return a;
}

export function mountExam(root: HTMLElement, path: string): () => void {
  const [, , id, sub] = path.split('/');
  const p = id ? byId(decodeURIComponent(id)) : undefined;
  if (p && sub === 'solve' && solvable(p)) return mountSolve(root, p);

  root.innerHTML = '';
  const page = el('div', 'exam');
  const side = el('aside', 'panel exam-side');
  const main = el('section', 'panel exam-main');
  page.append(side, main);
  root.append(page);
  renderSide(side, p?.id);
  const cleanup: (() => void)[] = [];
  if (p) renderProblem(main, p, cleanup);
  else renderIntro(main);
  return () => { for (const f of cleanup) f(); };
}

// ── 왼쪽 목록 ──────────────────────────────────────────

function renderSide(side: HTMLElement, current?: string) {
  const prog = loadProgress();
  const ok = PROBLEMS.filter((p) => prog[p.id] === 'ok').length;
  const head = el('div', 'exam-progress');
  head.append(el('b', '', '정보처리기사 실기'), el('span', 'muted', ` 맞힌 문제 ${ok} / ${PROBLEMS.length}`));
  const bar = el('div', 'progress-bar');
  const fill = el('span');
  fill.style.width = `${(ok / PROBLEMS.length) * 100}%`;
  bar.append(fill);
  side.append(head, bar);
  for (const c of CATEGORIES) {
    const list = PROBLEMS.filter((p) => p.cat === c.id);
    if (!list.length) continue;
    side.append(el('h3', 'exam-cat', `${c.name} (${list.length})`));
    const ul = el('ul', 'exam-list');
    for (const p of list) {
      const li = el('li');
      const a = link(`/exam/${p.id}`, `exam-item${p.id === current ? ' current' : ''}`, p.title);
      const mark = prog[p.id];
      a.prepend(el('span', `mark ${mark ?? ''}`, mark === 'ok' ? '✓' : mark === 'no' ? '✗' : '•'));
      li.append(a);
      ul.append(li);
    }
    side.append(ul);
  }
}

// ── 첫 화면 ────────────────────────────────────────────

function renderIntro(main: HTMLElement) {
  const first = PROBLEMS[0]!;
  main.append(
    el('h2', 'exam-title', '정보처리기사 실기 — 그래픽으로 풀어 보기'),
    el('p', 'exam-lead', '실기에 자주 나오는 유형의 문제를 풀고, 채점한 뒤 실행 과정을 그래픽으로 따라갑니다. 코드는 실제로 실행되고, 운영체제·자료구조·네트워크 문제는 시뮬레이터가 한 단계씩 보여 줍니다.'),
  );
  const grid = el('div', 'exam-cats');
  for (const c of CATEGORIES) {
    const list = PROBLEMS.filter((p) => p.cat === c.id);
    if (!list.length) continue;
    const card = link(`/exam/${list[0]!.id}`, 'exam-card', '');
    card.append(el('b', '', c.name), el('span', 'muted', `${list.length}문제`), el('p', '', c.desc));
    grid.append(card);
  }
  main.append(grid);
  const start = link(`/exam/${first.id}`, 'button primary exam-start', '처음부터 풀기 →');
  main.append(start);
  main.append(el('p', 'muted small exam-note',
    '※ 기출 원문은 싣지 않습니다. 실기 문제는 공개되지 않고 인터넷의 복원 문제는 각 출처의 저작물이라, 기출에서 반복되는 유형을 그대로 재현한 문제를 직접 만들었습니다. 정답은 모두 실제 실행·계산으로 검증했습니다.'));
}

// ── 문제 ───────────────────────────────────────────────

function renderProblem(main: HTMLElement, p: Problem, cleanup: (() => void)[]) {
  const idx = PROBLEMS.indexOf(p);
  const head = el('div', 'ex-head');
  head.append(el('span', `chip cat-${p.cat}`, catName(p.cat)), el('span', 'muted small', `${idx + 1} / ${PROBLEMS.length}`));
  main.append(head, el('h2', 'exam-title', p.title), el('p', 'ex-q', p.question));
  main.append(material(p));

  // 답 쓰기
  const form = el('form', 'ex-answer');
  const multi = p.kind === 'sql' || (p.kind === 'code' && p.answer.includes('\n'));
  const input = multi ? el('textarea') : el('input');
  input.className = 'ex-input';
  input.setAttribute('aria-label', '내 답');
  if (input instanceof HTMLTextAreaElement) input.rows = 4;
  input.placeholder = '내 답';
  const grade = el('button', 'primary', '채점하기');
  grade.type = 'submit';
  const peek = el('button', '', '정답 보기');
  peek.type = 'button';
  const row = el('div', 'ex-row');
  row.append(input, grade, peek);
  form.append(row, el('p', 'muted small', answerHint(p)));
  main.append(form);

  const result = el('div', 'ex-result');
  result.hidden = true;
  const simBox = el('div', 'ex-sim');
  main.append(result, simBox);

  const reveal = (mine: string | null) => {
    const want = answerOf(p);
    const ok = mine !== null && isCorrect(p, mine);
    if (mine !== null) saveMark(p.id, ok ? 'ok' : 'no');
    result.hidden = false;
    result.className = `ex-result ${mine === null ? 'peek' : ok ? 'ok' : 'no'}`;
    const title = mine === null ? '정답' : ok ? '✓ 정답입니다' : '✗ 틀렸습니다';
    const ans = el('pre', 'ex-ans', want);
    result.replaceChildren(el('h3', '', title), ...(mine !== null && !ok ? [el('p', 'muted small', '정답')] : []), ans,
      el('h3', 'ex-explain-h', '해설'), el('p', 'ex-explain', p.explain));
    // 그래픽 풀이
    if (p.kind === 'code' || p.kind === 'sql') {
      result.append(link(`/exam/${p.id}/solve`, 'button primary', '▶ 그래픽으로 풀이 보기 (한 줄씩 실행)'));
    } else if (!simBox.childElementCount) {
      const sim = simulator(p);
      if (sim) {
        cleanup.push(sim.dispose);
        simBox.append(el('h3', 'ex-explain-h', '그래픽 풀이'), sim.el);
      }
    }
    // 정답·오답 표시를 목록에 반영
    const side = main.parentElement?.querySelector('.exam-side');
    if (side instanceof HTMLElement) { side.replaceChildren(); renderSide(side, p.id); }
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim()) { input.focus(); return; }
    reveal(input.value);
  });
  peek.addEventListener('click', () => reveal(null));
  if (input instanceof HTMLTextAreaElement) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
    });
  }

  // 이전·다음
  const pager = el('nav', 'ex-pager');
  const prev = PROBLEMS[idx - 1];
  const next = PROBLEMS[idx + 1];
  pager.append(prev ? link(`/exam/${prev.id}`, 'button', `← ${prev.title}`) : el('span'),
    next ? link(`/exam/${next.id}`, 'button', `${next.title} →`) : link('/exam', 'button', '목록으로'));
  main.append(pager);
}

/** 문제에 딸린 자료: 코드, 표, 참조열, 트리 … */
function material(p: Problem): HTMLElement {
  const box = el('div', 'ex-material');
  switch (p.kind) {
    case 'code': {
      const pre = el('pre', 'ex-code');
      pre.dataset.lang = LANG_NAME[p.lang];
      p.code.trimEnd().split('\n').forEach((line, i) => {
        const ln = el('span', 'ln');
        ln.append(el('span', 'no', String(i + 1)), document.createTextNode(line || ' '));
        pre.append(ln);
      });
      box.append(pre);
      break;
    }
    case 'sql': {
      const tables = el('div', 'ex-tables muted small', '표를 불러오는 중…');
      box.append(tables);
      const q = el('pre', 'ex-code');
      q.dataset.lang = 'SQL';
      q.textContent = p.query;
      box.append(q);
      void runSql(p.setup, p.query).then((ev) => {
        const t = buildSteps(ev);
        tables.className = 'ex-tables';
        tables.replaceChildren(...t.tables.map((tb) => {
          const w = el('div', 'tablewrap');
          w.append(el('h3', '', `[${tb.name}]`));
          const table = el('table', 'grid');
          const cols = tb.cols.slice(1);
          const hr = el('tr');
          for (const c of cols) hr.append(el('th', '', c));
          table.append(hr);
          for (const r of tb.rows) {
            const tr = el('tr');
            for (const v of r.slice(1)) tr.append(el('td', '', show(v).replace(/^'(.*)'$/, '$1')));
            table.append(tr);
          }
          const sc = el('div', 'scroll');
          sc.append(table);
          w.append(sc);
          return w;
        }));
      }).catch(() => { tables.textContent = '표를 불러오지 못했습니다.'; });
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

// ── 코드 문제를 디버거로 ───────────────────────────────

function mountSolve(root: HTMLElement, p: Problem): () => void {
  const bar = el('div', 'exam-bar');
  bar.append(
    link(`/exam/${p.id}`, 'button', '← 문제로'),
    el('span', `chip cat-${p.cat}`, catName(p.cat)),
    el('b', '', p.title),
    el('span', 'muted small', `정답: ${answerOf(p).replace(/\n/g, ' / ')}`),
  );
  root.classList.add('exam-solve');
  if (p.kind === 'sql') return mountSql(root, { setup: p.setup, query: p.query, header: bar });
  if (p.kind === 'code' && p.lang === 'python') return mountPython(root, { code: p.code, header: bar });
  if (p.kind === 'code' && p.lang === 'c') return mountC(root, { code: p.code, header: bar });
  if (p.kind === 'code') return mountJava(root, { code: p.code, header: bar });
  return () => {};
}

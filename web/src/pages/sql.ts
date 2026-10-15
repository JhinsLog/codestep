// SQL 학습 화면: 계측한 SQLite로 쿼리를 실행하고 행 단위 처리 과정을 따라간다.
// SQL은 브라우저 안에서 실행되므로 서버를 거치지 않는다.
import { runSql } from '../sql/engine';
import { buildSteps, show, type SqlTrace, type Snapshot } from '../sql/steps';
import { SAMPLES } from '../sql/samples';
import { el } from '../view/stage';

const TEMPLATE = `
<div class="sqlide">
  <section class="panel editor">
    <label class="field">
      <span>예제</span>
      <select data-id="sample"></select>
    </label>
    <label class="field">
      <span>테이블 준비</span>
      <textarea data-id="setup" spellcheck="false" rows="9"></textarea>
    </label>
    <label class="field">
      <span>추적할 쿼리</span>
      <textarea data-id="query" spellcheck="false" rows="3"></textarea>
    </label>
    <button data-id="run" class="primary">실행하고 추적</button>
    <p data-id="status" class="status" role="status"></p>
  </section>

  <section class="panel debugger">
    <div class="controls">
      <button data-id="first" title="처음으로 (Home)">⏮</button>
      <button data-id="prev" title="이전 단계 (←)">◀</button>
      <span data-id="pos" class="pos">0 / 0</span>
      <button data-id="next" title="다음 단계 (→)">▶</button>
      <button data-id="last" title="끝으로 (End)">⏭</button>
    </div>
    <input data-id="slider" type="range" min="0" max="0" value="0" aria-label="단계 이동" />
    <ol data-id="steps" class="steps"></ol>
  </section>

  <section class="panel sqlstage">
    <div data-id="tables"></div>
    <h3>결과</h3>
    <div data-id="results"></div>
  </section>
</div>`;

export function mountSql(root: HTMLElement): () => void {
  root.innerHTML = TEMPLATE;
  const q = <T extends HTMLElement>(id: string) => root.querySelector(`[data-id="${id}"]`) as T;
  const ui = {
    sample: q<HTMLSelectElement>('sample'),
    setup: q<HTMLTextAreaElement>('setup'),
    query: q<HTMLTextAreaElement>('query'),
    run: q<HTMLButtonElement>('run'),
    status: q('status'),
    first: q<HTMLButtonElement>('first'),
    prev: q<HTMLButtonElement>('prev'),
    next: q<HTMLButtonElement>('next'),
    last: q<HTMLButtonElement>('last'),
    pos: q('pos'),
    slider: q<HTMLInputElement>('slider'),
    steps: q<HTMLOListElement>('steps'),
    tables: q('tables'),
    results: q('results'),
  };

  let trace: SqlTrace | null = null;
  let cur = 0;

  function go(i: number) {
    if (!trace || trace.steps.length === 0) return;
    cur = Math.max(0, Math.min(trace.steps.length - 1, i));
    render();
  }

  function render() {
    if (!trace) return;
    const n = trace.steps.length;
    ui.pos.textContent = n ? `${cur + 1} / ${n}${trace.cut ? '+' : ''}` : '0 / 0';
    ui.slider.max = String(Math.max(0, n - 1));
    ui.slider.value = String(cur);
    ui.first.disabled = ui.prev.disabled = cur <= 0;
    ui.next.disabled = ui.last.disabled = cur >= n - 1;
    for (const li of ui.steps.querySelectorAll('li.current')) li.classList.remove('current');
    const li = ui.steps.children[cur] as HTMLElement | undefined;
    if (li) {
      li.classList.add('current');
      li.scrollIntoView({ block: 'nearest' });
    }
    const step = trace.steps[cur];
    if (step) renderStage(trace, step.snap);
  }

  function renderStepList(t: SqlTrace) {
    ui.steps.replaceChildren(...t.steps.map((s, i) => {
      const item = el('li', `step ${s.kind}`, s.text);
      item.addEventListener('click', () => go(i));
      return item;
    }));
    if (t.cut) ui.steps.append(el('li', 'step error', `단계가 너무 많아 처음 ${t.steps.length}단계만 보여줍니다.`));
  }

  function renderStage(t: SqlTrace, s: Snapshot) {
    ui.tables.replaceChildren(...t.tables.map((tb) => {
      const wrap = el('div', 'tablewrap');
      wrap.append(el('h3', '', tb.name));
      const table = el('table', 'grid');
      const head = el('tr');
      for (const c of tb.cols) head.append(el('th', c === 'rowid' ? 'rowid' : '', c));
      table.append(head);
      for (const row of tb.rows) {
        const rowid = row[0] as number;
        const tr = el('tr');
        const v = s.verdict[tb.name]?.[rowid];
        if (v) tr.classList.add(v);
        if (s.current[tb.name] === rowid) tr.classList.add('current');
        row.forEach((val, i) => {
          const td = el('td', tb.cols[i] === 'rowid' ? 'rowid' : '', show(val));
          if (s.read && s.read.table === tb.name && s.read.rowid === rowid && s.read.col === tb.cols[i]) {
            td.classList.add('read');
          }
          tr.append(td);
        });
        table.append(tr);
      }
      const scroller = el('div', 'scroll');
      scroller.append(table);
      wrap.append(scroller);
      return wrap;
    }));

    if (s.results.length === 0) {
      ui.results.replaceChildren(el('p', 'muted', '아직 출력된 행이 없습니다.'));
      return;
    }
    const table = el('table', 'grid');
    for (const row of s.results) {
      const tr = el('tr');
      for (const v of row) tr.append(el('td', '', show(v)));
      table.append(tr);
    }
    const scroller = el('div', 'scroll');
    scroller.append(table);
    ui.results.replaceChildren(scroller);
  }

  async function run() {
    ui.run.disabled = true;
    ui.status.textContent = '실행 중…';
    ui.status.className = 'status';
    try {
      const events = await runSql(ui.setup.value, ui.query.value);
      trace = buildSteps(events);
      renderStepList(trace);
      if (trace.error) {
        ui.status.textContent = trace.error;
        ui.status.className = 'status error';
      } else {
        ui.status.textContent = `${trace.steps.length}단계 기록. 단계를 누르거나 ← → 키로 따라가세요.`;
      }
      go(0);
      if (trace.steps.length === 0) renderStage(trace, { current: {}, read: null, verdict: {}, results: [], buffered: 0 });
    } catch (err) {
      ui.status.textContent = `엔진을 불러오지 못했습니다: ${String(err)}`;
      ui.status.className = 'status error';
    } finally {
      ui.run.disabled = false;
    }
  }

  SAMPLES.forEach((s, i) => ui.sample.append(new Option(s.label, String(i))));
  function loadSample(i: number) {
    const s = SAMPLES[i];
    if (!s) return;
    ui.setup.value = s.setup;
    ui.query.value = s.query;
  }
  ui.sample.addEventListener('change', () => { loadSample(Number(ui.sample.value)); void run(); });
  ui.run.addEventListener('click', () => void run());
  ui.first.addEventListener('click', () => go(0));
  ui.prev.addEventListener('click', () => go(cur - 1));
  ui.next.addEventListener('click', () => go(cur + 1));
  ui.last.addEventListener('click', () => go(Infinity));
  ui.slider.addEventListener('input', () => go(Number(ui.slider.value)));

  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void run();
      return;
    }
    if (e.key === 'ArrowRight') go(cur + 1);
    else if (e.key === 'ArrowLeft') go(cur - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(Infinity);
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  loadSample(0);
  void run();
  return () => document.removeEventListener('keydown', onKey);
}

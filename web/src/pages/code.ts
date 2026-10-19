// 코드 학습 화면(Java·Python·C 공통): 편집기 + 디버거 + 무대 + 콘솔
// 언어마다 다른 것은 LangConfig(편집기 문법, 예제, 실행기)뿐이고, 화면은 Trace만 보고 그린다.
import type { Extension } from '@codemirror/state';
import { CodeEditor } from '../view/editor';
import { Stage, el, showValue, type StageView } from '../view/stage';
import { TERMS, narrate, narrationText, narrationView, type Spot, type Term } from '../view/narrate';
import { useAi } from '../view/ask';
import { Session } from '../trace/session';
import type { HeapObj, Trace } from '../trace/types';
import { runCode, LockedError, loginUrl } from '../api';
import type { Sample } from '../java/samples';

export interface LangConfig {
  id: 'java' | 'python' | 'c';
  name: string;
  samples: Sample[];
  language: () => Extension;
  wait: string;   // 실행 중 안내
}

const VIEW_KEY = 'codestep.view';

const EVENT_LABEL = { line: '실행 전', call: '호출', return: '반환', exception: '예외' } as const;

const TEMPLATE = `
<div class="ide">
  <section class="panel code">
    <div class="toolbar">
      <select data-id="sample" aria-label="예제"></select>
      <span class="grow"></span>
      <button data-id="edit" hidden title="디버그를 끝내고 코드를 고칩니다">✎ 코드 수정</button>
      <button data-id="run" class="primary" title="Ctrl+Enter">▶ 실행</button>
    </div>
    <div class="editor-host" data-id="editor"></div>
    <p class="status" data-id="status" role="status"></p>
    <div class="console">
      <h3>출력</h3>
      <pre data-id="console"></pre>
    </div>
  </section>
  <section class="panel debug">
    <div class="dbg-controls" role="toolbar" aria-label="디버거">
      <button data-id="play" class="play" title="한 단계씩 자동으로 진행 (Space)">▶ 재생</button>
      <select data-id="speed" aria-label="재생 속도" title="재생 속도">
        <option value="1500">느리게</option>
        <option value="850" selected>보통</option>
        <option value="400">빠르게</option>
      </select>
      <span class="sep"></span>
      <button data-cmd="first" title="처음으로 (Home)">⏮</button>
      <button data-cmd="back" title="한 단계 뒤로 (←)">↶</button>
      <button data-cmd="over" title="넘어가기: 함수 안으로 들어가지 않음 (F10, ↓)">⤼ 넘어가기</button>
      <button data-cmd="into" title="들어가기: 한 단계씩 (F11, →)">↘ 들어가기</button>
      <button data-cmd="out" title="나가기: 지금 함수가 끝날 때까지 (Shift+F11)">↗ 나가기</button>
      <button data-cmd="continue" title="다음 중단점까지 (F5)">⏭ 계속</button>
      <span class="grow"></span>
      <div class="seg" role="group" aria-label="보기 방식">
        <button data-view="3d" title="3D: 함수 호출(프레임)을 판으로 쌓고, 변수를 상자로, 객체를 힙 판 위의 블록으로 입체로 보여 줍니다. 값이 바뀌는 순간 블록이 움직입니다.">3D</button>
        <button data-view="2d" title="2D: 호출 스택과 힙을 표로 보여 줍니다. 한눈에 값을 읽기 좋습니다.">2D</button>
      </div>
    </div>
    <div class="dbg-pos">
      <input data-id="slider" type="range" min="0" max="0" value="0" aria-label="단계 이동" />
      <span data-id="pos" class="pos">-</span>
    </div>
    <p class="hint muted small" data-id="hint">실행한 뒤 코드의 줄을 누르면 그 줄이 실행된 직후로 이동합니다.
      반복문 안의 줄은 누를 때마다 다음 회차로 갑니다. 줄 번호 왼쪽을 누르면 중단점(●)이 생깁니다.</p>
    <div class="narr" data-id="narr" aria-live="polite"></div>
    <div class="stage" data-id="stage"></div>
    <div class="narr-legend" data-id="legend"></div>
  </section>
</div>`;

/** 정보처리기사 모드 등에서 문제 코드를 넣어 열 때: 예제 목록·저장 없이 바로 실행한다 */
export interface CodePreset {
  code: string;
  header?: HTMLElement;   // 화면 위에 붙일 머리 (문제 정보)
  storeKey?: string;      // 고친 코드를 임시 저장할 곳 (없으면 저장하지 않는다)
}

export function mountCode(root: HTMLElement, lang: LangConfig, preset?: CodePreset): () => void {
  const STORE_KEY = `codestep.${lang.id}.code`;
  const SAMPLES = lang.samples;
  root.innerHTML = TEMPLATE;
  if (preset?.header) root.prepend(preset.header);
  const q = <T extends HTMLElement>(id: string) => root.querySelector(`[data-id="${id}"]`) as T;
  const ui = {
    sample: q<HTMLSelectElement>('sample'),
    run: q<HTMLButtonElement>('run'),
    edit: q<HTMLButtonElement>('edit'),
    status: q('status'),
    console: q('console'),
    slider: q<HTMLInputElement>('slider'),
    pos: q('pos'),
    play: q<HTMLButtonElement>('play'),
    speed: q<HTMLSelectElement>('speed'),
  };
  // 문제 코드를 고쳐 보다가 원래대로 돌리는 버튼 (문제 풀이 화면)
  const reset = el('button', '', '↺ 문제 코드로');
  reset.title = '고친 코드를 버리고 문제의 원래 코드로 되돌립니다';
  reset.hidden = true;
  ui.sample.after(reset);
  const stageHost = q('stage');
  let stage: StageView = new Stage(stageHost);
  // ── 해설: 방금 일어난 일 + 그림 보는 법 ──
  const narrBox = q('narr');
  const legendBox = q('legend');
  const defBox = el('div', 'narr-def');
  defBox.hidden = true;
  const showTerm = (t: Term, sp?: Spot) => {
    const T = TERMS[t];
    defBox.hidden = false;
    defBox.replaceChildren(el('b', '', T.name), ` — ${T.text(lang.id)}`);
    if (sp?.kind === 'out') { ui.console.classList.remove('spot'); void ui.console.offsetWidth; ui.console.classList.add('spot'); ui.console.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else if (sp) stage.spot?.(sp);
  };
  {
    legendBox.append(el('span', 'muted small', '그림 보는 법 (누르면 그 자리가 빛납니다):'));
    for (const t of ['stack', 'frame', 'local', 'heap', lang.id === 'c' ? 'pointer' : 'ref', 'field', 'changed', 'ret', 'gc', 'out'] as Term[]) {
      const b = el('button', 'narr-term', TERMS[t].name);
      b.addEventListener('click', () => showTerm(t, TERMS[t].spot ? { kind: TERMS[t].spot! } : undefined));
      legendBox.append(b);
    }
    legendBox.append(defBox);
  }
  narrBox.append(el('p', 'muted small', '실행하면 단계마다 "방금 무슨 일이 일어났는지"를 여기서 풀어 줍니다.'));
  // ── AI 질문: 지금 화면을 글로 정리해 함께 보낸다 ──
  const screenContext = (): string => {
    const out: string[] = [];
    const sample = ui.sample.selectedOptions[0]?.textContent ?? '';
    const step = session?.step;
    const lines = (session && trace ? sourceLines : editor.doc.split('\n')).slice(0, 300);
    out.push(`[화면] ${lang.name} 코드 연습${sample ? ` · 예제 "${sample}"` : ''}${step && session ? ` · ${session.cur + 1}/${session.steps.length}단계 · ${step.line}줄 ${EVENT_LABEL[step.event]}` : ' · 아직 실행 전(코드 편집 중)'}`);
    out.push('[코드]');
    lines.forEach((ln, i) => out.push(`${String(i + 1).padStart(3)}: ${ln}${step && i + 1 === step.line ? '   ← 지금 위치' : ''}`));
    if (step && session && trace) {
      const heap = step.heap;
      out.push('[호출 스택] (아래가 바깥, 위가 지금 실행 중)');
      step.frames.slice().reverse().forEach((f) => out.push(`- ${f.cls ? `${f.cls}.` : ''}${f.fn}() ${f.line}줄: ${f.locals.map((v) => `${v.type} ${v.name} = ${showValue(v.value, heap)}`).join(', ') || '지역 변수 없음'}`));
      const objs = Object.entries(heap);
      out.push('[힙 객체]');
      if (!objs.length) out.push('- 없음');
      const desc = (o: HeapObj) => o.kind === 'object' ? `{ ${o.fields.map((f) => `${f.name} = ${showValue(f.value, heap)}`).join(', ')} }`
        : o.kind === 'map' ? `{ ${o.entries.map(([k, v]) => `${showValue(k, heap)}: ${showValue(v, heap)}`).join(', ')} }`
          : 'items' in o ? `[${o.items.map((v) => showValue(v, heap)).join(', ')}]${o.items.length < o.len ? ` …(${o.len}개)` : ''}` : '(내부 생략)';
      for (const [id, o] of objs.slice(0, 40)) out.push(`- #${id} ${o.type}: ${desc(o)}`);
      if (step.ret) out.push(`[반환값] ${showValue(step.ret, heap)}`);
      if (step.exception) out.push(`[예외] ${step.exception}`);
      const printed = trace.stdout.slice(0, step.out);
      out.push(`[지금까지 출력] ${printed ? JSON.stringify(printed.slice(-1500)) : '(없음)'}`);
      out.push(`[방금 단계 해설]\n${narrationText(narrate(step, session.steps[session.cur - 1], sourceLines, trace.stdout, lang.id))}`);
    }
    return out.join('\n');
  };
  stage.clear();
  let disposed = false;
  let sourceLines: string[] = [];

  let trace: Trace | null = null;
  let ranAt: { line: number; cur: number } | null = null;   // 줄을 눌러 온 단계
  let session: Session | null = null;
  let errorLines: number[] = [];

  // 고친 코드: 언어 화면은 언어마다, 문제 풀이 화면은 문제마다 따로 저장한다
  const storeKey = preset ? preset.storeKey : STORE_KEY;
  let saved: string | null = null;
  if (storeKey) {
    try { saved = localStorage.getItem(storeKey); } catch { /* 저장소를 못 쓰는 환경 */ }
  }

  const editor = new CodeEditor({
    parent: q('editor'),
    doc: saved ?? preset?.code ?? SAMPLES[0]!.code,
    language: lang.language(),
    onLineClick: (line) => {
      if (!session) return;
      setPlaying(false);
      if (!session.runLine(line)) {
        setStatus(`${line}줄은 실행되지 않았습니다.`);
        return;
      }
      ranAt = { line, cur: session.cur };
      render();
    },
    onBreakpoints: (lines) => {
      if (!session) return;
      session.breakpoints.clear();
      for (const l of lines) session.breakpoints.add(l);
    },
    onChange: (doc) => {
      if (preset) {
        if (!preset.storeKey) return;
        try {
          if (doc === preset.code) localStorage.removeItem(preset.storeKey);
          else localStorage.setItem(preset.storeKey, doc);
        } catch { /* 무시 */ }
        reset.hidden = doc === preset.code;
        return;
      }
      try { localStorage.setItem(STORE_KEY, doc); } catch { /* 무시 */ }
      // 불러온 예제를 고치면 더는 그 예제가 아니다 → 선택 표시를 지운다 (같은 예제를 다시 고를 수 있게)
      const cur = SAMPLES[Number(ui.sample.value)];
      if (ui.sample.value !== '' && cur && cur.code !== doc) ui.sample.value = '';
    },
  });

  // 예제 목록 (그룹별)
  const groups = new Map<string, HTMLOptGroupElement>();
  const placeholder = new Option('예제 불러오기…', '');
  placeholder.disabled = true;   // 목록에서는 고를 수 없고, 아무 예제도 아닐 때 표시만 된다
  ui.sample.append(placeholder);
  SAMPLES.forEach((s, i) => {
    let g = groups.get(s.group);
    if (!g) {
      g = document.createElement('optgroup');
      g.label = s.group;
      groups.set(s.group, g);
      ui.sample.append(g);
    }
    g.append(new Option(s.label, String(i)));
  });
  // 지금 편집기 내용이 예제 그대로면 그 예제 이름을 보여 준다
  ui.sample.value = String(SAMPLES.findIndex((x) => x.code === editor.doc));
  if (ui.sample.selectedIndex < 0) ui.sample.value = '';
  ui.sample.addEventListener('change', () => {
    if (ui.sample.value === '') return;
    const s = SAMPLES[Number(ui.sample.value)];
    if (!s) return;
    stopDebugging();
    editor.setDoc(s.code);
    setStatus(`예제 "${s.label}"를 불러왔습니다. ▶ 실행을 누르세요.`);
  });

  function setStatus(text: string, kind: '' | 'error' = '', link?: { href: string; label: string }) {
    ui.status.className = `status ${kind}`;
    ui.status.replaceChildren(text);
    if (link) {
      const a = el('a', 'login', link.label);
      a.href = link.href;
      ui.status.append(' ', a);
    }
  }

  // ── 보기 방식 (3D 기본, WebGL이 없으면 2D) ──
  let viewMode: '3d' | '2d' = '3d';
  try { if (localStorage.getItem(VIEW_KEY) === '2d') viewMode = '2d'; } catch { /* 무시 */ }

  async function setView(mode: '3d' | '2d') {
    viewMode = mode;
    try { localStorage.setItem(VIEW_KEY, mode); } catch { /* 무시 */ }
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      b.setAttribute('aria-pressed', String(b.dataset.view === mode));
    }
    let next: StageView;
    if (mode === '3d') {
      const m = await import('../view/stage3d');
      if (disposed || viewMode !== '3d') return;
      try {
        if (!m.webglAvailable()) throw new Error('no webgl');
        next = new m.Stage3D(stageHost);
      } catch {
        setStatus('이 브라우저에서는 3D(WebGL)를 쓸 수 없어 2D로 보여줍니다.', 'error');
        viewMode = '2d';
        for (const b of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
          b.setAttribute('aria-pressed', String(b.dataset.view === '2d'));
        }
        next = new Stage(stageHost);
      }
    } else next = new Stage(stageHost);
    stage.dispose();
    stage = next;
    stage.setTempo?.(tempo());
    if (session) render();
    else stage.clear();
  }

  // ── 자동 재생 ──
  let playing = false;
  let playTimer = 0;
  const tempo = () => Number(ui.speed.value) || 850;

  function setPlaying(on: boolean) {
    if (on && !session) return;
    playing = on;
    clearTimeout(playTimer);
    ui.play.textContent = on ? '⏸ 멈춤' : '▶ 재생';
    ui.play.classList.toggle('on', on);
    if (!on) return;
    if (session!.cur >= session!.last) { session!.go(0); render(); }
    playTimer = window.setTimeout(playTick, tempo());
  }

  function playTick() {
    if (!playing || !session) return;
    session.stepInto();
    render();
    const step = session.step;
    if (session.cur >= session.last || (step && session.breakpoints.has(step.line))) {
      setPlaying(false);
      if (step && session.breakpoints.has(step.line)) setStatus(`중단점(${step.line}줄)에서 멈췄습니다.`);
      return;
    }
    playTimer = window.setTimeout(playTick, tempo());
  }

  function stopDebugging() {
    setPlaying(false);
    trace = null;
    session = null;
    errorLines = [];
    editor.setDebugging(false);
    ui.edit.hidden = true;
    ui.run.hidden = false;
    ui.console.textContent = '';
    ui.slider.max = '0';
    ui.pos.textContent = '-';
    stage.clear();
    narrBox.replaceChildren(el('p', 'muted small', '실행하면 단계마다 "방금 무슨 일이 일어났는지"를 여기서 풀어 줍니다.'));
    updateButtons();
  }

  function updateButtons() {
    const has = !!session && session.steps.length > 0;
    const atStart = !has || session!.cur <= 0;
    const atEnd = !has || session!.cur >= session!.last;
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-cmd]')) {
      const cmd = b.dataset.cmd;
      b.disabled = !has || ((cmd === 'first' || cmd === 'back') ? atStart : atEnd);
    }
    ui.slider.disabled = !has;
    ui.play.disabled = !has;
  }

  function render() {
    if (!session || !trace) return;
    const step = session.step;
    if (!step) return;
    const prev = session.steps[session.cur - 1];
    const kind = step.event === 'exception' ? 'exception' : step.event === 'return' ? 'return' : 'line';
    // 줄을 눌러 온 그 단계에 머무는 동안만 누른 줄을 강조한다 (다른 단계로 가면 평소 표시)
    if (ranAt && ranAt.cur !== session.cur) ranAt = null;
    const ran = ranAt && ranAt.line !== step.line ? ranAt.line : null;
    editor.mark(step.line, errorLines, kind, ran);
    stage.render(step, prev, { index: session.cur, steps: session.steps, source: sourceLines, stdout: trace.stdout, lang: lang.id });
    narrBox.replaceChildren(...narrationView(narrate(step, prev, sourceLines, trace.stdout, lang.id), showTerm));
    ui.console.textContent = trace.stdout.slice(0, step.out);
    ui.slider.max = String(session.last);
    ui.slider.value = String(session.cur);
    const visits = session.visitsOf(step.line);
    ui.pos.textContent = `${session.cur + 1} / ${session.steps.length}${trace.cut ? '+' : ''} · `
      + (ran ? `${ran}줄 실행 직후 (다음 ${step.line}줄)` : `${step.line}줄 ${EVENT_LABEL[step.event]}${visits > 1 ? ` · ${visits}번째` : ''}`);
    updateButtons();
  }

  async function run() {
    stopDebugging();
    ui.run.disabled = true;
    setStatus(lang.wait);
    try {
      const t = await runCode(lang.id, editor.doc);
      if (t.error?.kind === 'compile') {
        errorLines = (t.error.diagnostics ?? []).map((d) => d.line).filter((l) => l > 0);
        editor.mark(null, errorLines, 'line');
        const lines = (t.error.diagnostics ?? []).map((d) => `${d.line}줄: ${d.message}`).join('\n');
        ui.console.textContent = lines || t.error.message;
        setStatus(t.error.message, 'error');
        return;
      }
      if (t.steps.length === 0) {
        ui.console.textContent = t.stdout;
        setStatus(t.error?.message ?? '기록된 단계가 없습니다.', 'error');
        return;
      }
      trace = t;
      sourceLines = editor.doc.split('\n');
      session = new Session(t);
      for (const l of editor.breakpointLines()) session.breakpoints.add(l);
      errorLines = t.error?.kind === 'runtime' && t.error.line ? [t.error.line] : [];
      editor.setDebugging(true);
      ui.edit.hidden = false;
      ui.run.hidden = true;
      let msg = `${t.steps.length}단계를 기록했습니다.`;
      if (t.cut) msg += ' 실행이 너무 길어 앞부분만 기록했습니다.';
      if (t.error?.kind === 'runtime') msg += ` 실행 중 예외로 멈췄습니다 (${t.error.line}줄).`;
      setStatus(msg, t.error ? 'error' : '');
      render();
    } catch (e) {
      if (e instanceof LockedError) setStatus(e.message, 'error', { href: loginUrl(), label: '관리자 로그인' });
      else setStatus(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      ui.run.disabled = false;
    }
  }

  function command(cmd: string) {
    if (!session) return;
    setPlaying(false);
    switch (cmd) {
      case 'first': session.go(0); break;
      case 'back': session.stepBack(); break;
      case 'over': session.stepOver(); break;
      case 'into': session.stepInto(); break;
      case 'out': session.stepOut(); break;
      case 'continue': session.continue(); break;
      case 'last': session.go(session.last); break;
    }
    render();
  }

  ui.run.addEventListener('click', () => void run());
  ui.edit.addEventListener('click', () => {
    stopDebugging();
    setStatus('코드를 고친 뒤 다시 ▶ 실행하세요.');
  });
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-cmd]')) {
    b.addEventListener('click', () => command(b.dataset.cmd!));
  }
  ui.play.addEventListener('click', () => setPlaying(!playing));
  ui.speed.addEventListener('change', () => stage.setTempo?.(tempo()));
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    b.addEventListener('click', () => { if (b.dataset.view !== viewMode) void setView(b.dataset.view as '3d' | '2d'); });
  }
  ui.slider.addEventListener('input', () => {
    setPlaying(false);
    session?.go(Number(ui.slider.value));
    render();
  });

  const onKey = (e: KeyboardEvent) => {
    const inEditor = (e.target as HTMLElement).closest('.cm-editor') && !session;
    const tag = (e.target as HTMLElement).tagName;
    // 학습 화면의 답 칸처럼 편집기 밖의 입력 칸에서 누른 키는 디버거가 가로채지 않는다
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); return; }
    if (!session || inEditor) return;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); setPlaying(!playing); return; }
    const map: Record<string, string> = {
      F10: 'over', ArrowDown: 'over', F11: e.shiftKey ? 'out' : 'into', ArrowRight: 'into',
      ArrowLeft: 'back', F5: 'continue', Home: 'first', End: 'last',
    };
    const cmd = map[e.key];
    if (!cmd) return;
    e.preventDefault();
    command(cmd);
  };
  document.addEventListener('keydown', onKey);

  updateButtons();
  void setView(viewMode);
  if (preset) {
    ui.sample.hidden = true;
    reset.hidden = editor.doc === preset.code;
    reset.addEventListener('click', () => {
      stopDebugging();
      editor.setDoc(preset.code);
      void run();
    });
    void run();
  }
  // AI 도우미: 화면 상태(session·editor)를 읽으므로 모두 만든 뒤에 붙인다
  const unAi = useAi({
    context: screenContext,
    summary: () => {
      const sample = ui.sample.selectedOptions[0]?.textContent ?? '';
      const step = session?.step;
      return [lang.name, sample, step && session ? `${session.cur + 1}/${session.steps.length}단계 · ${step.line}줄` : '실행 전'].filter(Boolean).join(' · ');
    },
    suggestions: () => {
      const step = session?.step;
      return step
        ? [`지금 ${step.line}줄은 무엇을 하나요?`, '방금 바뀐 값은 왜 그렇게 바뀌었나요?', '지금 스택과 힙에 무엇이 있는지 설명해 주세요']
        : ['이 코드는 전체적으로 무엇을 하나요?', '실행하면 어떤 순서로 실행되나요?'];
    },
    onLine: (n) => editor.flashLine(n),
  });
  return () => {
    disposed = true;
    unAi();
    setPlaying(false);
    document.removeEventListener('keydown', onKey);
    stage.dispose();
    editor.view.destroy();
  };
}

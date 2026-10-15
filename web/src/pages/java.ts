// Java 학습 화면: 편집기 + 디버거 + 무대 + 콘솔
import { java } from '@codemirror/lang-java';
import { CodeEditor } from '../view/editor';
import { Stage, el, type StageView } from '../view/stage';
import { Session } from '../trace/session';
import type { Trace } from '../trace/types';
import { runCode, LockedError, loginUrl } from '../api';
import { JAVA_SAMPLES } from '../java/samples';

const STORE_KEY = 'codestep.java.code';
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
        <button data-view="3d" title="입체로 보기">3D</button>
        <button data-view="2d" title="표로 보기">2D</button>
      </div>
    </div>
    <div class="dbg-pos">
      <input data-id="slider" type="range" min="0" max="0" value="0" aria-label="단계 이동" />
      <span data-id="pos" class="pos">-</span>
    </div>
    <p class="hint muted small" data-id="hint">실행한 뒤 코드의 줄을 누르면 그 줄이 실행된 직후로 이동합니다.
      반복문 안의 줄은 누를 때마다 다음 회차로 갑니다. 줄 번호 왼쪽을 누르면 중단점(●)이 생깁니다.</p>
    <div class="stage" data-id="stage"></div>
  </section>
</div>`;

/** 정보처리기사 모드 등에서 문제 코드를 넣어 열 때: 예제 목록·저장 없이 바로 실행한다 */
export interface JavaPreset {
  code: string;
  header?: HTMLElement;   // 화면 위에 붙일 머리 (문제 정보)
}

export function mountJava(root: HTMLElement, preset?: JavaPreset): () => void {
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
  const stageHost = q('stage');
  let stage: StageView = new Stage(stageHost);
  stage.clear();
  let disposed = false;
  let sourceLines: string[] = [];

  let trace: Trace | null = null;
  let session: Session | null = null;
  let errorLines: number[] = [];

  let saved: string | null = null;
  if (!preset) {
    try { saved = localStorage.getItem(STORE_KEY); } catch { /* 저장소를 못 쓰는 환경 */ }
  }

  const editor = new CodeEditor({
    parent: q('editor'),
    doc: preset?.code ?? saved ?? JAVA_SAMPLES[0]!.code,
    language: java(),
    onLineClick: (line) => {
      if (!session) return;
      setPlaying(false);
      if (!session.runLine(line)) {
        setStatus(`${line}줄은 실행되지 않았습니다.`);
        return;
      }
      render();
    },
    onBreakpoints: (lines) => {
      if (!session) return;
      session.breakpoints.clear();
      for (const l of lines) session.breakpoints.add(l);
    },
    onChange: (doc) => {
      if (preset) return;
      try { localStorage.setItem(STORE_KEY, doc); } catch { /* 무시 */ }
      // 불러온 예제를 고치면 더는 그 예제가 아니다 → 선택 표시를 지운다 (같은 예제를 다시 고를 수 있게)
      const cur = JAVA_SAMPLES[Number(ui.sample.value)];
      if (ui.sample.value !== '' && cur && cur.code !== doc) ui.sample.value = '';
    },
  });

  // 예제 목록 (그룹별)
  const groups = new Map<string, HTMLOptGroupElement>();
  const placeholder = new Option('예제 불러오기…', '');
  placeholder.disabled = true;   // 목록에서는 고를 수 없고, 아무 예제도 아닐 때 표시만 된다
  ui.sample.append(placeholder);
  JAVA_SAMPLES.forEach((s, i) => {
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
  ui.sample.value = String(JAVA_SAMPLES.findIndex((x) => x.code === editor.doc));
  if (ui.sample.selectedIndex < 0) ui.sample.value = '';
  ui.sample.addEventListener('change', () => {
    if (ui.sample.value === '') return;
    const s = JAVA_SAMPLES[Number(ui.sample.value)];
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
    editor.mark(step.line, errorLines, kind);
    stage.render(step, prev, { index: session.cur, steps: session.steps, source: sourceLines, stdout: trace.stdout });
    ui.console.textContent = trace.stdout.slice(0, step.out);
    ui.slider.max = String(session.last);
    ui.slider.value = String(session.cur);
    const visits = session.visitsOf(step.line);
    ui.pos.textContent = `${session.cur + 1} / ${session.steps.length}${trace.cut ? '+' : ''} · ${step.line}줄 ${EVENT_LABEL[step.event]}`
      + (visits > 1 ? ` · ${visits}번째` : '');
    updateButtons();
  }

  async function run() {
    stopDebugging();
    ui.run.disabled = true;
    setStatus('컴파일하고 실행하는 중… (보통 2~4초)');
    try {
      const t = await runCode('java', editor.doc);
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); return; }
    if (!session || inEditor) return;
    const tag = (e.target as HTMLElement).tagName;
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
    void run();
  }
  return () => {
    disposed = true;
    setPlaying(false);
    document.removeEventListener('keydown', onKey);
    stage.dispose();
    editor.view.destroy();
  };
}

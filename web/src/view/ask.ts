// AI 도우미 창: 화면 오른쪽에 붙는 대화 창. 질문할 때 지금 화면 정보(글)를 함께 홈서버로 보내고,
// AI 서버의 답을 흘려 받아 보여 준다.
//   - 넓은 화면에서는 본문을 옆으로 밀고 붙어서(도킹) 코드·그림을 보면서 답을 읽는다. 좁으면 위에 덮는다.
//   - 답은 글자로만 만든다(HTML로 해석하지 않음). 목록·굵게·코드·"N줄"만 골라 꾸미고, "N줄"을 누르면 그 줄이 빛난다.
//   - AI 서버가 꺼져 있으면 입력을 잠그고, 상태 점멸 표시로 알린다(꺼져 있으면 5초마다, 탭으로 돌아오면 바로 확인).
import { el } from './stage';

type Live = 'check' | 'on' | 'busy' | 'off' | 'disabled';
const LIVE_TEXT: Record<Live, string> = { check: '확인 중', on: '연결됨', busy: '답하는 중', off: '꺼짐', disabled: '사용 안 함' };
const OPEN_KEY = 'codestep.ai.open';
const DOCK_MIN = 1200;          // 이보다 넓으면 본문을 밀고 붙는다
const MAX_CONTEXT = 24_000;

export interface AiDockOptions {
  /** 질문 순간의 화면 정보를 글로 */
  context: () => string;
  /** 창 위에 보여 줄 한 줄 요약 (예: "Java · 은행 예제 · 7/21단계 · 18줄") */
  summary?: () => string;
  /** 빈 대화일 때 눌러 볼 질문 예 */
  suggestions?: () => string[];
  /** 답변의 "N줄"을 눌렀을 때 */
  onLine?: (line: number) => void;
}

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* 무시 */ } },
};

function icon(paths: string[], size = 18): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: String(size), height: String(size), fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
  for (const d of paths) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
const ICON = {
  enter: ['M9 10l-5 5 5 5', 'M20 4v7a4 4 0 0 1-4 4H4'],
  stop: ['M7 7h10v10H7z'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
};

// ── 답변 꾸미기 (글자만으로 DOM을 만든다) ──

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\d{1,4}\s*(?:번째\s*|번\s*)?줄)/g;

function inline(text: string, onLine?: (n: number) => void, bold = true): Node[] {
  const out: Node[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    if (m[1]) out.push(el('code', 'ai-code', m[1].slice(1, -1)));
    else if (m[2]) {
      if (bold) { const b = el('strong'); b.append(...inline(m[2].slice(2, -2), onLine, false)); out.push(b); }
      else out.push(document.createTextNode(m[2].slice(2, -2)));
    } else if (m[3] && onLine) {
      const n = Number(/\d+/.exec(m[3])![0]);
      const b = el('button', 'ai-line', m[3]);
      b.type = 'button';
      b.title = `코드의 ${n}번째 줄 보기`;
      b.addEventListener('click', () => onLine(n));
      out.push(b);
    } else out.push(document.createTextNode(m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

/** 마크다운 일부(문단·목록·제목·코드 블록·굵게·코드)만 해석한다 */
export function renderAnswer(text: string, onLine?: (n: number) => void): DocumentFragment {
  const frag = document.createDocumentFragment();
  const lines = text.replace(/\r/g, '').split('\n');
  let para: string[] = [];
  let list: HTMLElement | null = null;
  const flushPara = () => {
    if (!para.length) return;
    const p = el('p');
    para.forEach((ln, i) => { if (i) p.append(el('br')); p.append(...inline(ln, onLine)); });
    frag.append(p);
    para = [];
  };
  const endList = () => { list = null; };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]!;
    if (/^\s*```/.test(ln)) {
      flushPara(); endList();
      const code: string[] = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]!); i++) code.push(lines[i]!);
      const pre = el('pre', 'ai-pre');
      pre.append(el('code', '', code.join('\n')));
      frag.append(pre);
      continue;
    }
    if (!ln.trim()) { flushPara(); endList(); continue; }
    const h = /^\s*#{1,6}\s+(.*)$/.exec(ln);
    if (h) { flushPara(); endList(); const p = el('p', 'ai-h'); p.append(...inline(h[1]!.replace(/\*\*/g, ''), onLine)); frag.append(p); continue; }
    const ul = /^\s*[-*•]\s+(.*)$/.exec(ln);
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(ln);
    if (ul || ol) {
      flushPara();
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tagName.toLowerCase() !== tag) {
        list = el(tag);
        if (ol && ol[1] !== '1') list.setAttribute('start', ol[1]!);
        frag.append(list);
      }
      const li = el('li');
      li.append(...inline(ul ? ul[1]! : ol![2]!, onLine));
      list.append(li);
      continue;
    }
    if (list && /^\s{2,}\S/.test(ln)) { list.lastElementChild?.append(el('br'), ...inline(ln.trim(), onLine)); continue; }
    endList();
    para.push(ln);
  }
  flushPara();
  return frag;
}

// ── 창 ──

interface Turn { q: string; a: string; card: HTMLElement; body: HTMLElement; err?: boolean }

function aiDock(o: Required<Omit<AiDockOptions, 'onLine'>> & { onLine: () => ((n: number) => void) | undefined }) {
  // 여는 버튼 (오른쪽 아래)
  const fab = el('button', 'ai-fab');
  fab.type = 'button';
  fab.append(el('span', 'ai-fab-ico', '🤖'), el('span', 'ai-fab-text', 'AI에게 질문'), el('span', 'ask-dot'));

  // 창
  const box = el('aside', 'ai-drawer');
  box.setAttribute('aria-label', 'AI 도우미');
  box.hidden = true;
  const head = el('div', 'ai-head');
  const live = el('span', 'ask-live check');
  const liveText = el('span', 'ask-live-text', LIVE_TEXT.check);
  live.append(el('span', 'ask-dot'), liveText);
  const clearBtn = el('button', 'ai-ghost', '새 대화');
  clearBtn.type = 'button';
  clearBtn.title = '대화를 지웁니다';
  const closeBtn = el('button', 'ai-ghost ai-x');
  closeBtn.type = 'button';
  closeBtn.title = '닫기 (Esc)';
  closeBtn.setAttribute('aria-label', '닫기');
  closeBtn.append(icon(ICON.close));
  head.append(el('b', 'ai-title', '🤖 AI 도우미'), live, el('span', 'grow'), clearBtn, closeBtn);

  const ctx = el('div', 'ai-ctx');
  const ctxText = el('span', 'ai-ctx-text');
  ctx.append(el('span', 'ai-ctx-label', '보고 있는 화면'), ctxText);
  ctx.title = '질문할 때 이 화면의 코드·변수 값·출력이 함께 AI 서버로 전달됩니다. AI는 이 정보만 근거로 답합니다.';

  const log = el('div', 'ai-log');
  log.setAttribute('aria-live', 'polite');
  const empty = el('div', 'ai-empty');

  const foot = el('div', 'ai-foot');
  const q = el('textarea', 'ai-q');
  q.rows = 1;
  q.maxLength = 1000;
  q.setAttribute('aria-label', '질문');
  const send = el('button', 'ai-send primary');
  send.type = 'button';
  const row = el('div', 'ai-compose');
  row.append(q, send);
  const state = el('p', 'ai-state');
  foot.append(row, state);
  box.append(head, ctx, log, foot);
  document.body.append(fab, box);

  let enabled = true, online = false, polled = false, busy = false, queueLen = 0;
  const turns: Turn[] = [];
  let es: EventSource | null = null;
  let cur: Turn | null = null;

  // ── 상태 ──
  function paint() {
    const s: Live = !enabled ? 'disabled' : busy ? 'busy' : online ? 'on' : polled ? 'off' : 'check';
    live.className = `ask-live ${s}`;
    liveText.textContent = LIVE_TEXT[s];
    fab.dataset.live = s;
    fab.title = `이 화면에 대해 AI에게 질문하기 (AI 서버: ${LIVE_TEXT[s]})`;
    const usable = enabled && online;
    q.disabled = !usable && !busy;
    q.placeholder = busy ? '답을 받는 중입니다…' : usable ? '궁금한 점을 물어보세요' : !enabled ? 'AI 질문 기능이 꺼져 있습니다' : 'AI 서버가 꺼져 있어 지금은 질문할 수 없습니다';
    send.replaceChildren(icon(busy ? ICON.stop : ICON.enter));
    send.title = busy ? '답 받기 멈추기' : '보내기 (Enter)';
    send.setAttribute('aria-label', busy ? '멈추기' : '보내기');
    send.disabled = !busy && (!usable || !q.value.trim());
    if (!busy) state.textContent = !enabled ? 'AI 질문 기능이 아직 꺼져 있습니다.' : usable ? (queueLen ? `대기 중인 질문 ${queueLen}건 · ` : '') + 'Enter 보내기 · Shift+Enter 줄바꿈'
      : polled ? 'AI 서버가 지금 꺼져 있습니다. AI 서버가 켜지면 다시 질문해 주세요.' : 'AI 서버 상태를 확인하는 중…';
    clearBtn.hidden = !turns.length;
    paintEmpty();
  }
  async function status() {
    lastCheck = Date.now();
    try {
      const s = await (await fetch('/api/ask/status')).json() as { enabled: boolean; online: boolean; queue: number };
      enabled = s.enabled; online = s.enabled && s.online; queueLen = s.queue;
    } catch { online = false; }
    polled = true;
    paint();
    schedule();
  }
  // 꺼져 있을 때는 자주(5초), 연결된 뒤에는 드물게(창 열림 15초·닫힘 60초) 확인한다.
  // 다른 창(나히다 등)에서 돌아와 이 탭을 다시 보면 곧바로 확인한다 → 새로고침 없이 상태가 바뀐다.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  function schedule() {
    clearTimeout(timer);
    if (!active) return;
    const ms = !(enabled && online) ? 5_000 : box.hidden ? 60_000 : 15_000;
    timer = setTimeout(() => { if (document.hidden) schedule(); else void status(); }, ms);
  }
  let lastCheck = 0;
  const onBack = () => { if (active && !document.hidden && Date.now() - lastCheck > 1500) void status(); };
  document.addEventListener('visibilitychange', onBack);
  window.addEventListener('focus', onBack);

  // ── 빈 대화: 소개와 질문 예 ──
  function paintEmpty() {
    if (turns.length) { empty.remove(); return; }
    const sug = o.suggestions?.() ?? [];
    const chips = el('div', 'ai-sugs');
    for (const s of sug) {
      const b = el('button', 'ai-sug', s);
      b.type = 'button';
      b.disabled = !(enabled && online) || busy;
      b.addEventListener('click', () => { q.value = s; void ask(); });
      chips.append(b);
    }
    empty.replaceChildren(
      el('p', '', '지금 화면의 코드, 변수 값, 출력을 보고 답합니다. 이해가 안 되는 줄이나 값을 그대로 물어보세요.'),
      ...(sug.length ? [el('p', 'ai-sugs-label', '이렇게 물어볼 수 있어요'), chips] : []),
    );
    if (!empty.isConnected) log.append(empty);
  }

  // ── 열고 닫기 ──
  const docked = () => window.innerWidth >= DOCK_MIN;
  function layout() { document.body.classList.toggle('ai-docked', !box.hidden && docked()); }
  function open(focus = true) {
    box.hidden = false;
    fab.hidden = true;
    store.set(OPEN_KEY, '1');
    ctxText.textContent = o.summary();
    layout();
    paint();
    void status();
    if (focus && !q.disabled) q.focus();
  }
  function close() {
    box.hidden = true;
    fab.hidden = false;
    store.set(OPEN_KEY, null);
    layout();
    fab.focus();
  }
  fab.addEventListener('click', () => open());
  closeBtn.addEventListener('click', close);
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
  window.addEventListener('resize', layout);
  clearBtn.addEventListener('click', () => {
    if (busy) stop();
    turns.length = 0;
    log.replaceChildren();
    paint();
    q.focus();
  });

  // ── 입력 ──
  const grow = () => { q.style.height = 'auto'; q.style.height = `${Math.min(q.scrollHeight, 160)}px`; };
  q.addEventListener('input', () => { grow(); send.disabled = !busy && (q.disabled || !q.value.trim()); });
  // Enter = 보내기, Shift+Enter = 줄바꿈. 한글 조합 중의 Enter는 글자 확정이므로 보내지 않는다.
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); if (!busy) void ask(); }
  });
  send.addEventListener('click', () => { if (busy) stop(); else void ask(); });

  // ── 대화 ──
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const toBottom = () => { log.scrollTop = log.scrollHeight; };

  function addTurn(question: string): Turn {
    empty.remove();
    const qb = el('div', 'ai-msg ai-me');
    qb.textContent = question;
    const card = el('div', 'ai-msg ai-bot pending');
    const body = el('div', 'ai-body');
    const tools = el('div', 'ai-tools');
    const copy = el('button', 'ai-ghost ai-copy');
    copy.type = 'button';
    copy.title = '답 복사';
    const copyText = el('span', '', '복사');
    copy.append(icon(ICON.copy, 14), copyText);
    tools.append(copy);
    card.append(body, tools);
    const t: Turn = { q: question, a: '', card, body };
    copy.addEventListener('click', () => {
      void navigator.clipboard?.writeText(t.a).then(() => { copyText.textContent = '복사됨'; setTimeout(() => { copyText.textContent = '복사'; }, 1500); }).catch(() => {});
    });
    body.append(el('span', 'ai-typing', '답을 기다리는 중'));
    log.append(qb, card);
    toBottom();
    turns.push(t);
    return t;
  }
  let raf = 0;
  function renderTurn(t: Turn) {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const stick = nearBottom();
      t.body.replaceChildren(renderAnswer(t.a, o.onLine()));
      if (stick) toBottom();
    });
  }
  function finish(t: Turn, note?: string, err = false) {
    cancelAnimationFrame(raf); raf = 0;
    t.card.classList.remove('pending');
    if (err) { t.err = true; t.card.classList.add('err'); }
    if (t.a) t.body.replaceChildren(renderAnswer(t.a, o.onLine()));
    else t.body.replaceChildren();
    if (note) t.body.append(el('p', 'ai-note', note));
    t.card.classList.toggle('has-text', !!t.a && !err);
    es?.close(); es = null; cur = null;
    busy = false;
    paint();
    if (nearBottom()) toBottom();
    if (!q.disabled) q.focus();
  }
  function stop() { if (cur) finish(cur, '(멈췄습니다)'); }

  /** 이어지는 질문이 앞의 대화를 알 수 있게, 최근 두 번의 문답을 화면 정보 끝에 붙인다 */
  function history(): string {
    const prev = turns.filter((t) => t !== cur && t.a && !t.err).slice(-2);
    if (!prev.length) return '';
    return `\n[이전 대화] (최근 ${prev.length}개)\n${prev.map((t) => `질문: ${t.q}\n답: ${t.a.slice(0, 1500)}`).join('\n\n')}`;
  }

  async function ask() {
    const question = q.value.trim();
    if (!question || busy || !(enabled && online)) return;
    const hist = history();
    const t = addTurn(question);
    cur = t;
    busy = true;
    q.value = '';
    grow();
    ctxText.textContent = o.summary();
    paint();
    state.textContent = '질문을 보내는 중…';
    try {
      const context = o.context().slice(0, MAX_CONTEXT - hist.length) + hist;
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
      const j = await r.json() as { id?: string; message?: string };
      if (!r.ok || !j.id) throw new Error(j.message ?? `오류 ${r.status}`);
      if (cur !== t) return;
      state.textContent = '답을 기다리는 중…';
      es = new EventSource(`/api/ask/${j.id}/stream`);
      es.addEventListener('queue', (e) => {
        const p = (JSON.parse((e as MessageEvent).data) as { position: number }).position;
        const msg = p > 1 ? `앞에 질문 ${p - 1}개가 있어 기다리는 중` : p === 1 ? '곧 시작합니다' : 'AI가 답을 쓰는 중';
        state.textContent = `${msg}…`;
        if (!t.a) t.body.replaceChildren(el('span', 'ai-typing', msg));
      });
      es.addEventListener('delta', (e) => {
        t.a += (JSON.parse((e as MessageEvent).data) as { text: string }).text;
        state.textContent = 'AI가 답을 쓰는 중…';
        renderTurn(t);
      });
      es.addEventListener('done', () => finish(t));
      es.addEventListener('error', (e) => {
        const d = (e as MessageEvent).data;
        if (d) finish(t, (JSON.parse(d) as { message: string }).message, true);
        else finish(t, t.a ? '(연결이 끊겨 답이 중간에 멈췄습니다)' : '연결이 끊겼습니다. 다시 질문해 주세요.', !t.a);
        void status();
      });
    } catch (e) {
      if (cur === t) finish(t, (e as Error).message, true);
    }
  }

  function reset() {
    if (busy) stop();
    turns.length = 0;
    log.replaceChildren();
    paint();
  }
  /** 이 화면에 AI 도우미가 있는가. 없으면 버튼과 창을 숨긴다(열림 상태는 기억해 둔다) */
  function setActive(on: boolean) {
    if (on === active) return;
    active = on;
    if (on) {
      if (store.get(OPEN_KEY)) open(false);
      else { box.hidden = true; fab.hidden = false; layout(); }
      void status();
    } else {
      clearTimeout(timer);
      box.hidden = true;
      fab.hidden = true;
      layout();
    }
  }
  paint();
  fab.hidden = true;
  return { setActive, reset };
}

// ── 화면마다 정보를 등록한다 ──
// 창은 하나만 만들어 두고, 화면(코드 실습·SQL·학습 문제·개념·벼락)이 "지금 화면 정보"를 등록한다.
// 학습 문제 안에 디버거가 들어가는 것처럼 겹치면, 바깥(문제) 정보와 안쪽(디버거) 정보를 이어서 보낸다.

const sources: AiDockOptions[] = [];
let dock: ReturnType<typeof aiDock> | null = null;
let stale = false;   // 등록이 모두 풀렸다 = 다른 화면으로 옮겼다 → 다음 등록 때 대화를 지운다

function lastOf<T>(f: (s: AiDockOptions) => T | undefined): T | undefined {
  for (let i = sources.length - 1; i >= 0; i--) { const v = f(sources[i]!); if (v !== undefined) return v; }
  return undefined;
}

/** 이 화면을 AI 도우미에 등록한다. 돌려받은 함수로 등록을 푼다(화면을 떠날 때) */
export function useAi(src: AiDockOptions): () => void {
  dock ??= aiDock({
    context: () => sources.map((x) => x.context()).filter(Boolean).join('\n\n'),
    summary: () => sources.map((x) => x.summary?.()).filter(Boolean).join(' › '),
    suggestions: () => lastOf((x) => { const v = x.suggestions?.(); return v?.length ? v : undefined; }) ?? [],
    onLine: () => lastOf((x) => x.onLine),
  });
  if (stale && !sources.length) dock.reset();
  stale = false;
  sources.push(src);
  dock.setActive(true);
  return () => {
    const i = sources.indexOf(src);
    if (i >= 0) sources.splice(i, 1);
    if (!sources.length) { stale = true; dock?.setActive(false); }
  };
}

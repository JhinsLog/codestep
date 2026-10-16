// AI 질문 창: 지금 화면 정보(글)와 질문을 홈서버로 보내고, 운영자 PC AI의 답을 흘려 받는다.
// 접근 코드를 넣은 브라우저에서만 쓸 수 있다(테스트 기간). 답은 글자로만 표시한다(HTML로 해석하지 않음).
// AI 서버가 꺼져 있으면 질문 칸을 잠그고, 제목 옆 점멸 표시로 상태를 알린다(15초마다 확인).
import { el } from './stage';

const CODE_KEY = 'codestep.ai.code';
const getCode = () => { try { return localStorage.getItem(CODE_KEY) ?? ''; } catch { return ''; } };
const setCode = (c: string) => { try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch { /* 무시 */ } };

type Live = 'check' | 'on' | 'busy' | 'off' | 'disabled';
const LIVE_TEXT: Record<Live, string> = { check: '확인 중', on: '연결됨', busy: '답하는 중', off: '꺼짐', disabled: '사용 안 함' };
const OFF_MSG = 'AI 서버가 지금 꺼져 있어 질문할 수 없습니다. 운영자가 AI를 켜 두었을 때 다시 질문해 주세요.';

/** Enter(↵) 모양 아이콘. 글꼴에 따라 ↵ 글자가 깨지므로 그림으로 그린다 */
function enterIcon(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
  for (const d of ['M9 10l-5 5 5 5', 'M20 4v7a4 4 0 0 1-4 4H4']) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** context: 질문 순간의 화면 정보를 글로 돌려준다 */
export function askPanel(context: () => string): HTMLElement {
  const box = el('details', 'ask');
  const sum = el('summary', 'ask-sum');
  const live = el('span', 'ask-live check');
  const dot = el('span', 'ask-dot');
  const liveText = el('span', 'ask-live-text', LIVE_TEXT.check);
  live.append(dot, liveText);
  sum.append('🤖 이 화면에 대해 AI에게 질문하기 ', live);
  const body = el('div', 'ask-body');
  box.append(sum, body);

  const note = el('p', 'muted small', '질문과 지금 화면 정보(코드, 변수 값, 출력)가 운영자 PC의 AI로 전달됩니다. AI는 이 화면에 나온 정보만 근거로 답합니다.');
  const codeRow = el('form', 'ask-row');
  const codeIn = el('input', 'ask-code');
  codeIn.type = 'password';
  codeIn.placeholder = '접근 코드 (테스트 기간) 입력 후 Enter';
  codeIn.autocomplete = 'off';
  const codeBtn = el('button', 'ask-enter');
  codeBtn.append(enterIcon());
  codeBtn.type = 'submit';
  codeBtn.title = '접근 코드 확인 (Enter)';
  codeBtn.setAttribute('aria-label', '접근 코드 확인');
  codeRow.append(codeIn, codeBtn);
  const q = el('textarea', 'ask-q');
  q.rows = 2;
  q.maxLength = 1000;
  const send = el('button', 'ask-enter primary');
  send.append(enterIcon());
  send.title = '질문 보내기 (Enter)';
  send.setAttribute('aria-label', '질문 보내기');
  const qRow = el('div', 'ask-row');
  qRow.append(q, send);
  const state = el('p', 'ask-state muted small');
  const ans = el('div', 'ask-ans');
  ans.hidden = true;
  body.append(note, codeRow, qRow, state, ans);

  let online = false, enabled = true, busy = false;
  const ASK_HINT = '예: 27번째 줄 kim.deposit(300)은 무엇을 하나요?  (Enter 보내기 · Shift+Enter 줄바꿈)';

  /** 상태에 맞춰 점멸 표시와 입력 칸을 다시 그린다 */
  function paint() {
    const has = !!getCode();
    codeRow.hidden = has;
    qRow.hidden = !has;
    const s: Live = !enabled ? 'disabled' : busy ? 'busy' : online ? 'on' : polled ? 'off' : 'check';
    live.className = `ask-live ${s}`;
    liveText.textContent = LIVE_TEXT[s];
    live.title = `AI 서버: ${LIVE_TEXT[s]}`;
    const usable = enabled && online;
    q.disabled = !usable;
    send.disabled = !usable || busy;
    q.placeholder = usable ? ASK_HINT : !enabled ? 'AI 질문 기능이 꺼져 있습니다.' : 'AI 서버가 꺼져 있어 지금은 질문할 수 없습니다.';
  }

  let polled = false, queueLen = 0;
  async function status() {
    try {
      const s = await (await fetch('/api/ask/status')).json() as { enabled: boolean; online: boolean; queue: number };
      enabled = s.enabled; online = s.enabled && s.online; queueLen = s.queue;
    } catch { online = false; }
    polled = true;
    if (!busy) state.textContent = !enabled ? 'AI 질문 기능이 아직 꺼져 있습니다.' : online ? (queueLen ? `대기 중인 질문 ${queueLen}건` : '') : OFF_MSG;
    paint();
  }
  // 열려 있으면 15초, 닫혀 있으면 60초마다 확인한다. 탭이 숨겨졌거나 화면에서 빠지면 쉰다.
  let ticks = 0, mounted = false;
  const timer = setInterval(() => {
    if (!box.isConnected) { if (mounted) clearInterval(timer); return; }
    mounted = true;
    if (document.hidden) return;
    ticks++;
    if (box.open || ticks % 4 === 0) void status();
  }, 15_000);
  box.addEventListener('toggle', () => { if (box.open) { paint(); void status(); } });

  codeRow.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = codeIn.value.trim();
    if (!c) return;
    setCode(c); codeIn.value = ''; paint(); void status();
    if (!q.disabled) q.focus();
  });

  let es: EventSource | null = null;
  const finish = () => { busy = false; paint(); };
  async function ask() {
    const question = q.value.trim();
    if (!question || busy || q.disabled) return;
    busy = true;
    paint();
    es?.close();
    ans.hidden = false;
    ans.textContent = '';
    ans.classList.remove('err');
    state.textContent = '질문을 보내는 중…';
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Codestep-AI': getCode() }, body: JSON.stringify({ question, context: context().slice(0, 24_000) }) });
      const j = await r.json() as { id?: string; message?: string; error?: string };
      if (!r.ok || !j.id) {
        if (j.error === 'code') setCode('');
        throw new Error(j.message ?? `오류 ${r.status}`);
      }
      state.textContent = '답을 기다리는 중…';
      es = new EventSource(`/api/ask/${j.id}/stream`);
      es.addEventListener('queue', (e) => {
        const p = (JSON.parse((e as MessageEvent).data) as { position: number }).position;
        state.textContent = p > 0 ? `앞에 질문 ${p - 1}개가 있습니다. 기다리는 중…` : 'AI가 답을 쓰는 중…';
      });
      es.addEventListener('delta', (e) => { ans.textContent += (JSON.parse((e as MessageEvent).data) as { text: string }).text; });
      es.addEventListener('done', () => { state.textContent = '답변 완료'; es?.close(); finish(); });
      es.addEventListener('error', (e) => {
        const d = (e as MessageEvent).data;
        if (d) { ans.classList.add('err'); ans.textContent = (JSON.parse(d) as { message: string }).message; state.textContent = ''; }
        else if (es?.readyState === EventSource.CLOSED || !ans.textContent) state.textContent = '연결이 끊겼습니다.';
        es?.close();
        finish();
        void status();
      });
    } catch (e) {
      ans.classList.add('err');
      ans.textContent = (e as Error).message;
      state.textContent = '';
      finish();
    }
  }
  send.addEventListener('click', () => void ask());
  // Enter = 보내기, Shift+Enter = 줄바꿈. 한글 조합 중의 Enter는 글자 확정이므로 보내지 않는다.
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); void ask(); }
  });
  paint();
  void status();
  return box;
}

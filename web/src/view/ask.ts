// AI 질문 창: 지금 화면 정보(글)와 질문을 홈서버로 보내고, 데스크탑 AI의 답을 흘려 받는다.
// 접근 코드를 넣은 브라우저에서만 쓸 수 있다(테스트 기간). 답은 글자로만 표시한다(HTML로 해석하지 않음).
import { el } from './stage';

const CODE_KEY = 'codestep.ai.code';
const getCode = () => { try { return localStorage.getItem(CODE_KEY) ?? ''; } catch { return ''; } };
const setCode = (c: string) => { try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch { /* 무시 */ } };

/** context: 질문 순간의 화면 정보를 글로 돌려준다 */
export function askPanel(context: () => string): HTMLElement {
  const box = el('details', 'ask');
  const sum = el('summary', 'ask-sum');
  const dot = el('span', 'ask-dot');
  sum.append('🤖 이 화면에 대해 AI에게 질문하기 ', dot);
  const body = el('div', 'ask-body');
  box.append(sum, body);

  const note = el('p', 'muted small', '질문과 지금 화면 정보(코드, 변수 값, 출력)가 운영자 PC의 AI로 전달됩니다. AI는 이 화면에 나온 정보만 근거로 답합니다.');
  const codeRow = el('div', 'ask-row');
  const codeIn = el('input', 'ask-code');
  codeIn.type = 'password';
  codeIn.placeholder = '접근 코드 (테스트 기간)';
  codeIn.autocomplete = 'off';
  const codeBtn = el('button', '', '저장');
  codeRow.append(codeIn, codeBtn);
  const q = el('textarea', 'ask-q');
  q.rows = 2;
  q.maxLength = 1000;
  q.placeholder = '예: 27번째 줄 kim.deposit(300)은 무슨 일을 하는 건가요?  (Ctrl+Enter로 보내기)';
  const send = el('button', 'primary', '질문하기');
  const qRow = el('div', 'ask-row');
  qRow.append(q, send);
  const state = el('p', 'ask-state muted small');
  const ans = el('div', 'ask-ans');
  ans.hidden = true;
  body.append(note, codeRow, qRow, state, ans);

  const paintCode = () => {
    const has = !!getCode();
    codeRow.hidden = has;
    qRow.hidden = !has;
  };
  codeBtn.addEventListener('click', () => { setCode(codeIn.value.trim()); codeIn.value = ''; paintCode(); void status(); });

  async function status() {
    try {
      const s = await (await fetch('/api/ask/status')).json() as { enabled: boolean; online: boolean; queue: number };
      dot.className = `ask-dot ${!s.enabled ? 'off' : s.online ? 'on' : 'idle'}`;
      dot.title = !s.enabled ? 'AI 기능 꺼짐' : s.online ? 'AI 연결됨' : 'AI 서버(데스크탑) 꺼짐';
      state.textContent = !s.enabled ? 'AI 질문 기능이 아직 꺼져 있습니다.' : s.online ? `AI 연결됨${s.queue ? ` · 대기 ${s.queue}건` : ''}` : 'AI 서버(데스크탑)가 꺼져 있어 지금은 답할 수 없습니다.';
    } catch { dot.className = 'ask-dot off'; }
  }
  box.addEventListener('toggle', () => { if (box.open) { paintCode(); void status(); } });

  let es: EventSource | null = null;
  async function ask() {
    const question = q.value.trim();
    if (!question || send.disabled) return;
    send.disabled = true;
    es?.close();
    ans.hidden = false;
    ans.textContent = '';
    ans.classList.remove('err');
    state.textContent = '질문을 보내는 중…';
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Codestep-AI': getCode() }, body: JSON.stringify({ question, context: context().slice(0, 24_000) }) });
      const j = await r.json() as { id?: string; message?: string; error?: string };
      if (!r.ok || !j.id) {
        if (j.error === 'code') { setCode(''); paintCode(); }
        throw new Error(j.message ?? `오류 ${r.status}`);
      }
      state.textContent = '답을 기다리는 중…';
      es = new EventSource(`/api/ask/${j.id}/stream`);
      es.addEventListener('queue', (e) => {
        const p = (JSON.parse((e as MessageEvent).data) as { position: number }).position;
        state.textContent = p > 0 ? `앞에 질문 ${p - 1}개가 있습니다. 기다리는 중…` : 'AI가 답을 쓰는 중…';
      });
      es.addEventListener('delta', (e) => { ans.textContent += (JSON.parse((e as MessageEvent).data) as { text: string }).text; });
      es.addEventListener('done', () => { state.textContent = '답변 완료'; es?.close(); send.disabled = false; });
      es.addEventListener('error', (e) => {
        const d = (e as MessageEvent).data;
        if (d) { ans.classList.add('err'); ans.textContent = (JSON.parse(d) as { message: string }).message; state.textContent = ''; }
        else if (es?.readyState === EventSource.CLOSED || !ans.textContent) state.textContent = '연결이 끊겼습니다.';
        es?.close();
        send.disabled = false;
      });
    } catch (e) {
      ans.classList.add('err');
      ans.textContent = (e as Error).message;
      state.textContent = '';
      send.disabled = false;
    }
  }
  send.addEventListener('click', () => void ask());
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void ask(); } });
  paintCode();
  return box;
}

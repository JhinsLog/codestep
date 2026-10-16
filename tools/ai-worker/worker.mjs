#!/usr/bin/env node
// codestep AI 연결 프로그램 (데스크탑에서 실행).
// 홈서버(codestep)에 "먼저" 접속해 질문을 가져오고, 이 PC의 로컬 모델 서버(OpenAI 호환 API)로 답을 만들어
// 조각조각 돌려준다. 이 PC는 들어오는 연결을 받지 않는다(포트를 열지 않는다).
//
//   node worker.mjs --check     모델 서버와 홈서버 연결만 확인하고 끝낸다
//   node worker.mjs             계속 실행 (Ctrl+C로 끝)
//
// 설정 (환경 변수):
//   CODESTEP_URL        홈서버 주소              기본 https://codestep.jhinslog.com
//   CODESTEP_AI_TOKEN_FILE  연결 토큰이 든 파일    기본 ~/.codestep-ai/token  (토큰을 명령줄·코드에 쓰지 않는다)
//   MODEL_URL           모델 서버 OpenAI 호환 주소  기본 http://127.0.0.1:8080/v1
//   MODEL               모델 이름                  비우면 /models 의 첫 번째
//   NO_THINK            1이면 생각(think) 모드 끔   기본 1
// 필요: Node.js 18 이상 (fetch 내장). 따로 설치할 패키지 없음.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.env.CODESTEP_URL ?? 'https://codestep.jhinslog.com').replace(/\/$/, '');
const MODEL_URL = (process.env.MODEL_URL ?? 'http://127.0.0.1:8080/v1').replace(/\/$/, '');
const TOKEN_FILE = process.env.CODESTEP_AI_TOKEN_FILE ?? join(homedir(), '.codestep-ai', 'token');
const NO_THINK = process.env.NO_THINK !== '0';
let MODEL = process.env.MODEL ?? '';

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function token() {
  try {
    const t = readFileSync(TOKEN_FILE, 'utf8').trim();
    if (t.length < 32) throw new Error('짧음');
    return t;
  } catch (e) {
    console.error(`토큰 파일을 읽을 수 없습니다: ${TOKEN_FILE} (${e.message})`);
    process.exit(2);
  }
}
const TOKEN = token();
const auth = { Authorization: `Bearer ${TOKEN}` };

async function pickModel() {
  if (MODEL) return MODEL;
  const r = await fetch(`${MODEL_URL}/models`);
  if (!r.ok) throw new Error(`모델 서버 /models 응답 ${r.status}`);
  const j = await r.json();
  MODEL = j.data?.[0]?.id ?? j.models?.[0]?.name ?? '';
  if (!MODEL) throw new Error('모델 목록이 비어 있습니다');
  return MODEL;
}

/** <think>…</think> 부분을 걸러 내며 본문만 내보낸다 */
function thinkFilter() {
  let buf = '', inThink = false;
  return (piece, flush = false) => {
    buf += piece;
    let out = '';
    for (;;) {
      if (inThink) {
        const e = buf.indexOf('</think>');
        if (e < 0) { buf = buf.slice(-8); break; }
        buf = buf.slice(e + 8); inThink = false;
      } else {
        const s = buf.indexOf('<think>');
        if (s < 0) {
          // 태그가 조각 사이에 걸칠 수 있어 끝 7글자는 남겨 둔다
          const keep = flush ? 0 : 7;
          out += buf.slice(0, Math.max(0, buf.length - keep)); buf = buf.slice(Math.max(0, buf.length - keep));
          break;
        }
        out += buf.slice(0, s); buf = buf.slice(s + 7); inThink = true;
      }
    }
    return out;
  };
}

async function answer(job) {
  const send = (b) => fetch(`${BASE}/api/ai/answer/${job.id}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).catch(() => {});
  const started = Date.now();
  try {
    const model = await pickModel();
    const r = await fetch(`${MODEL_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, messages: job.messages, stream: true,
        max_tokens: job.params?.max_tokens ?? 900, temperature: job.params?.temperature ?? 0.3,
        ...(NO_THINK ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
    });
    if (!r.ok || !r.body) throw new Error(`모델 서버 응답 ${r.status}`);
    const filter = thinkFilter();
    let pending = '', last = Date.now(), lineBuf = '', total = 0;
    const dec = new TextDecoder();
    for await (const chunk of r.body) {
      lineBuf += dec.decode(chunk, { stream: true });
      let nl;
      while ((nl = lineBuf.indexOf('\n')) >= 0) {
        const line = lineBuf.slice(0, nl).trim();
        lineBuf = lineBuf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const d = JSON.parse(data).choices?.[0]?.delta?.content ?? '';
          if (d) { const t = filter(d); pending += t; total += t.length; }
        } catch { /* 불완전한 줄은 건너뛴다 */ }
      }
      // 너무 잘게 보내지 않도록 0.2초마다 모아서 보낸다
      if (pending && Date.now() - last > 200) { await send({ delta: pending }); pending = ''; last = Date.now(); }
    }
    pending += filter('', true);
    await send({ delta: pending, done: true });
    log(`답변 ${job.id.slice(0, 6)}: ${total}자, ${((Date.now() - started) / 1000).toFixed(1)}초`);
  } catch (e) {
    log(`답변 실패 ${job.id.slice(0, 6)}: ${e.message}`);
    await send({ error: e.message });
  }
}

async function check() {
  log(`모델 서버 ${MODEL_URL} 확인 중…`);
  const model = await pickModel();
  log(`모델: ${model}`);
  const r = await fetch(`${MODEL_URL}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: '한 단어로만 답하세요: 1+1은?' }], max_tokens: 50, ...(NO_THINK ? { chat_template_kwargs: { enable_thinking: false } } : {}) }),
  });
  const j = await r.json();
  log(`모델 응답: ${JSON.stringify(j.choices?.[0]?.message?.content ?? j).slice(0, 120)}`);
  log(`홈서버 ${BASE} 확인 중…`);
  const s = await (await fetch(`${BASE}/api/ask/status`)).json();
  log(`홈서버 AI 설정: ${s.enabled ? '켜짐' : '꺼짐 (홈서버에 토큰이 아직 없음)'}`);
  const n = await fetch(`${BASE}/api/ai/next`, { headers: auth, signal: AbortSignal.timeout(30_000) });
  log(`연결 토큰: ${n.status === 401 ? '거부됨 (토큰이 홈서버와 다름)' : n.status === 204 || n.status === 200 ? '정상' : `응답 ${n.status}`}`);
}

async function loop() {
  log(`시작: 홈서버 ${BASE}, 모델 서버 ${MODEL_URL}`);
  let backoff = 1000;
  for (;;) {
    try {
      const r = await fetch(`${BASE}/api/ai/next`, { headers: auth, signal: AbortSignal.timeout(40_000) });
      if (r.status === 401) { console.error('연결 토큰이 거부되었습니다. 토큰 파일을 확인하세요.'); process.exit(3); }
      if (r.status === 200) await answer(await r.json());
      else if (r.status !== 204) throw new Error(`홈서버 응답 ${r.status}`);
      backoff = 1000;
    } catch (e) {
      log(`연결 문제: ${e.message} — ${backoff / 1000}초 뒤 다시`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60_000);
    }
  }
}

if (process.argv.includes('--check')) check().catch((e) => { console.error(`확인 실패: ${e.message}`); process.exit(1); });
else loop();

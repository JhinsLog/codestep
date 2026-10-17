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
//   NAHIDA_URL          나히다 웹앱 주소(이 PC)      기본 http://127.0.0.1:8084
//   WAKE                1이면 모델이 내려가 있을 때 나히다에게 다시 올려 달라고 함  기본 1 (0이면 깨우지 않음)
//
// 깨우기(WAKE=1): 모델 서버가 없더라도 나히다 앱이 켜져 있고 다른 앱(콜롬비나)이 GPU를 쓰고 있지 않으면 질문을 받고,
// 나히다의 /api/warm으로 모델을 올린 뒤 답한다. 나히다 앱이 꺼져 있거나 GPU를 다른 앱이 쓰는 중이면 질문을 받지 않는다
// (나히다의 warm은 GPU를 빼앗아 오므로, 콜롬비나 대화를 끊지 않기 위해서다).
// 필요: Node.js 18 이상 (fetch 내장). 따로 설치할 패키지 없음.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.env.CODESTEP_URL ?? 'https://codestep.jhinslog.com').replace(/\/$/, '');
const MODEL_URL = (process.env.MODEL_URL ?? 'http://127.0.0.1:8080/v1').replace(/\/$/, '');
const TOKEN_FILE = process.env.CODESTEP_AI_TOKEN_FILE ?? join(homedir(), '.codestep-ai', 'token');
const NO_THINK = process.env.NO_THINK !== '0';
let MODEL = process.env.MODEL ?? '';
const NAHIDA_URL = (process.env.NAHIDA_URL ?? 'http://127.0.0.1:8084').replace(/\/$/, '');
const WAKE = process.env.WAKE !== '0';
const WARM_LIMIT = 90_000;

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

/** 나히다 앱 상태. 앱이 꺼져 있으면 null */
async function nahida() {
  try {
    const r = await fetch(`${NAHIDA_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const j = await r.json();
    return { llm: !!j.llm, otherLlm: !!j.other_llm };
  } catch { return null; }
}

/** 모델이 내려가 있으면 나히다에게 올려 달라고 하고 뜰 때까지 기다린다. keep: 기다리는 동안 홈서버에 살아 있다고 알림 */
async function ensureModel(keep) {
  if (await modelUp()) return;
  if (!WAKE) throw new Error('모델 서버가 꺼져 있습니다');
  const n = await nahida();
  if (!n) throw new Error('나히다 앱이 꺼져 있습니다');
  if (n.otherLlm) throw new Error('다른 앱이 GPU를 쓰고 있어 모델을 올리지 않았습니다');
  log('모델이 내려가 있어 나히다에게 올려 달라고 합니다…');
  const w = await fetch(`${NAHIDA_URL}/api/warm`, { method: 'POST', signal: AbortSignal.timeout(5000) }).catch((e) => ({ ok: false, status: e.message }));
  if (!w.ok) throw new Error(`나히다 깨우기 실패 (${w.status})`);
  const t0 = Date.now();
  let lastKeep = t0;
  while (Date.now() - t0 < WARM_LIMIT) {
    await sleep(2000);
    if (await modelUp()) { log(`모델이 떴습니다 (${((Date.now() - t0) / 1000).toFixed(1)}초)`); return; }
    if (Date.now() - lastKeep > 10_000) { await keep(); lastKeep = Date.now(); }
  }
  throw new Error(`모델이 ${WARM_LIMIT / 1000}초 안에 뜨지 않았습니다`);
}

async function answer(job) {
  const send = (b) => fetch(`${BASE}/api/ai/answer/${job.id}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).catch(() => {});
  const started = Date.now();
  try {
    // 홈서버는 90초 동안 아무 소식이 없으면 실패로 처리하므로, 깨우는 동안 빈 소식을 보낸다
    await ensureModel(() => send({}));
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
    const tail = filter('', true);
    pending += tail; total += tail.length;
    await send({ delta: pending, done: true });
    log(`답변 ${job.id.slice(0, 6)}: ${total}자, ${((Date.now() - started) / 1000).toFixed(1)}초`);
  } catch (e) {
    log(`답변 실패 ${job.id.slice(0, 6)}: ${e.message}`);
    await send({ error: e.message });
  }
}

async function check() {
  log(`모델 서버 ${MODEL_URL} 확인 중…`);
  await ensureModel(async () => {});
  const model = await pickModel();
  log(`모델: ${model}`);
  const r = await fetch(`${MODEL_URL}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: '한 단어로만 답하세요: 1+1은?' }], max_tokens: 50, ...(NO_THINK ? { chat_template_kwargs: { enable_thinking: false } } : {}) }),
  });
  const j = await r.json();
  log(`모델 응답: ${JSON.stringify(j.choices?.[0]?.message?.content ?? j).slice(0, 120)}`);
  const nh = await nahida();
  log(`나히다 앱 ${NAHIDA_URL}: ${!nh ? '응답 없음 (깨우기 불가)' : `모델 ${nh.llm ? '떠 있음' : '내려감'}, 다른 앱 GPU 사용 ${nh.otherLlm ? '예' : '아니오'}`} · 깨우기 ${WAKE ? '켜짐' : '꺼짐'}`);
  log(`홈서버 ${BASE} 확인 중…`);
  const s = await (await fetch(`${BASE}/api/ask/status`)).json();
  log(`홈서버 AI 설정: ${s.enabled ? '켜짐' : '꺼짐 (홈서버에 토큰이 아직 없음)'}`);
  const n = await fetch(`${BASE}/api/ai/next`, { headers: auth, signal: AbortSignal.timeout(30_000) });
  log(`연결 토큰: ${n.status === 401 ? '거부됨 (토큰이 홈서버와 다름)' : n.status === 204 || n.status === 200 ? '정상' : `응답 ${n.status}`}`);
}

/** 모델 서버가 지금 떠 있는가 (나히다가 유휴로 내리거나 다른 앱이 GPU를 가져가면 사라진다) */
async function modelUp() {
  try { return (await fetch(`${MODEL_URL}/models`, { signal: AbortSignal.timeout(3000) })).ok; } catch { return false; }
}

/** 지금 질문을 받을 수 있는가: 모델이 떠 있거나, 깨울 수 있으면(나히다 앱 켜짐 + GPU 비어 있음) 받는다 */
async function ready() {
  if (await modelUp()) return { ok: true, why: '모델 서버 떠 있음' };
  if (!WAKE) return { ok: false, why: '모델 서버가 꺼져 있습니다' };
  const n = await nahida();
  if (!n) return { ok: false, why: '모델 서버와 나히다 앱이 꺼져 있습니다' };
  if (n.otherLlm) return { ok: false, why: '다른 앱이 GPU를 쓰고 있습니다' };
  return { ok: true, why: '모델은 내려가 있지만 질문이 오면 깨웁니다' };
}

async function loop() {
  log(`시작: 홈서버 ${BASE}, 모델 서버 ${MODEL_URL}, 나히다 ${NAHIDA_URL} (깨우기 ${WAKE ? '켜짐' : '꺼짐'})`);
  let backoff = 1000;
  let lastWhy = '';
  for (;;) {
    // 받을 수 없으면 질문을 가져가지 않는다 → 홈서버 화면에 "AI 꺼짐"으로 보인다
    const r0 = await ready();
    if (r0.why !== lastWhy) { log(r0.ok ? `질문을 받습니다 (${r0.why}).` : `${r0.why}. 질문을 받지 않고 15초마다 확인합니다.`); lastWhy = r0.why; }
    if (!r0.ok) { await sleep(15_000); continue; }
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

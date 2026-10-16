// codestep 실행 API. 사용자 코드를 격리 컨테이너에서 실행하고 Trace JSON을 돌려준다.
//
//   POST /api/run      {"lang":"java","code":"..."}  → Trace
//   GET  /api/health   상태
//   GET  /api/auth     Access 로그인 후 원래 화면으로 돌려보낸다
//   /api/ask·/api/ai/  AI 질문 중계 (server/ai.mjs)
//
// 127.0.0.1에서만 듣고, 바깥 요청은 server/static.mjs가 /api/로 넘겨준다.
//
// 공개 전 잠금: CODESTEP_API_OPEN=1이 아니면 Cloudflare Access JWT를 검증해
// 통과한 요청만 실행한다. Access 설정(팀 도메인·AUD)이 없으면 전부 거부한다(fail closed).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createPublicKey, verify as verifySig, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { AI_ENABLED, handleAi } from './ai.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 5181);
const OPEN = process.env.CODESTEP_API_OPEN === '1';
const TEAM = process.env.CF_ACCESS_TEAM ?? '';   // 예: jhinslog.cloudflareaccess.com
const AUD = process.env.CF_ACCESS_AUD ?? '';     // /api Access 애플리케이션의 AUD 태그

const MAX_BODY = 64 * 1024;
const MAX_CODE = 20 * 1024;
const MAX_TRACE = 24 * 1024 * 1024;
const RUN_TIMEOUT_MS = 25_000;
const MAX_RUNNING = 2;   // 동시에 도는 컨테이너 수. 각자 CPU 1개·메모리 256MB로 따로 묶인다
const MAX_WAITING = 6;
const RATE_PER_MIN = 20;

// 모든 실행 컨테이너를 넣을 상위 cgroup(systemd slice). 비우면 Docker 기본 위치.
// codestep.slice에 CPU·메모리 총량을 걸어 두면 실행이 몇 개든 Earth 몫은 남는다.
const CGROUP_PARENT = process.env.CODESTEP_CGROUP_PARENT ?? '';

const IMAGES = {
  java: process.env.CODESTEP_JAVA_IMAGE ?? 'codestep-java:current',
  python: process.env.CODESTEP_PYTHON_IMAGE ?? 'codestep-python:current',
  c: process.env.CODESTEP_C_IMAGE ?? 'codestep-c:current',
};

// 컨테이너 격리 옵션. 사용자 코드는 이 밖으로 나오지 못해야 한다.
const SANDBOX = [
  '--rm', '-i',
  '--network', 'none',
  '--read-only',
  '--tmpfs', '/tmp:rw,size=16m,mode=1777',
  '--cap-drop', 'ALL',
  '--security-opt', 'no-new-privileges',
  '--pids-limit', '128',
  '--memory', '256m', '--memory-swap', '256m',   // 실측 최대 약 80MB
  '--cpus', '1',
  '--ulimit', 'nofile=256:256',
  '--label', 'app=codestep',
];

// ── Cloudflare Access JWT 검증 ─────────────────────────

let keys = { at: 0, byKid: new Map() };

async function accessKeys() {
  if (Date.now() - keys.at < 60 * 60 * 1000 && keys.byKid.size > 0) return keys.byKid;
  const res = await fetch(`https://${TEAM}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs ${res.status}`);
  const { keys: jwks } = await res.json();
  const byKid = new Map();
  for (const k of jwks) byKid.set(k.kid, createPublicKey({ key: k, format: 'jwk' }));
  keys = { at: Date.now(), byKid };
  return byKid;
}

const b64url = (s) => Buffer.from(s, 'base64url');

/** 검증에 성공하면 이메일(또는 sub), 실패하면 null */
async function verifyAccess(req) {
  if (!TEAM || !AUD) return null;
  const token = req.headers['cf-access-jwt-assertion'];
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64url(parts[0]).toString());
    const claims = JSON.parse(b64url(parts[1]).toString());
    if (header.alg !== 'RS256') return null;
    const key = (await accessKeys()).get(header.kid);
    if (!key) return null;
    const ok = verifySig('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, b64url(parts[2]));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(AUD)) return null;
    if (claims.iss !== `https://${TEAM}`) return null;
    if (typeof claims.exp !== 'number' || claims.exp < now) return null;
    if (typeof claims.nbf === 'number' && claims.nbf > now + 60) return null;
    return claims.email ?? claims.sub ?? 'access';
  } catch {
    return null;
  }
}

// ── 요청 제한과 실행 큐 ───────────────────────────────

const hits = new Map(); // 주체 → 최근 1분 요청 시각들

function rateLimited(who) {
  const now = Date.now();
  const list = (hits.get(who) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(who, list);
  if (hits.size > 10_000) hits.clear();
  return list.length > RATE_PER_MIN;
}

let running = 0;
const waiting = [];
const active = new Set(); // 지금 실행 중이거나 대기 중인 주체(IP)

function enqueue(job) {
  return new Promise((resolve, reject) => {
    if (waiting.length >= MAX_WAITING) {
      reject(Object.assign(new Error('busy'), { status: 503 }));
      return;
    }
    waiting.push({ job, resolve, reject });
    pump();
  });
}

function pump() {
  if (running >= MAX_RUNNING || waiting.length === 0) return;
  const { job, resolve, reject } = waiting.shift();
  running++;
  job().then(resolve, reject).finally(() => {
    running--;
    pump();
  });
}

function runContainer(lang, code) {
  return new Promise((resolve, reject) => {
    const name = `codestep-run-${randomBytes(6).toString('hex')}`;
    const parent = CGROUP_PARENT ? ['--cgroup-parent', CGROUP_PARENT] : [];
    // C는 컴파일한 실행 파일을 /work에서 돌리므로 그 tmpfs만 실행을 허용한다 (나머지 언어는 noexec)
    const work = ['--tmpfs', `/work:rw,${lang === 'c' ? 'exec,' : ''}size=32m,mode=1777`];
    const child = spawn('docker', ['run', '--name', name, ...parent, ...SANDBOX, ...work, IMAGES[lang]], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const chunks = [];
    let size = 0;
    let killed = false;
    const kill = (why) => {
      if (killed) return;
      killed = true;
      // docker CLI를 죽여도 컨테이너는 남으므로 컨테이너를 직접 죽인다
      spawn('docker', ['kill', name], { stdio: 'ignore' });
      reject(Object.assign(new Error(why), { status: 500 }));
    };
    const timer = setTimeout(() => kill('timeout'), RUN_TIMEOUT_MS);
    child.stdout.on('data', (b) => {
      size += b.length;
      if (size > MAX_TRACE) kill('trace too large');
      else chunks.push(b);
    });
    child.stderr.on('data', () => { /* 컨테이너 진단 출력은 버린다 */ });
    child.on('error', (e) => { clearTimeout(timer); if (!killed) reject(e); });
    child.on('close', () => {
      clearTimeout(timer);
      if (killed) return;
      const body = Buffer.concat(chunks);
      if (body.length === 0) reject(Object.assign(new Error('runner produced no output'), { status: 500 }));
      else resolve(body);
    });
    child.stdin.end(code);
  });
}

// ── HTTP ─────────────────────────────────────────────

function send(res, status, obj, req) {
  const raw = Buffer.isBuffer(obj) ? obj : Buffer.from(JSON.stringify(obj));
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  const gz = raw.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  const body = gz ? gzipSync(raw) : raw;
  if (gz) headers['Content-Encoding'] = 'gzip';
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers).end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (b) => {
      size += b.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(b);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (await handleAi(req, res, url)) return;
    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { ok: true, open: OPEN, running, waiting: waiting.length, maxRunning: MAX_RUNNING }, req);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/auth') {
      // Access 로그인을 마친 뒤 도착하는 곳. 같은 사이트 안의 경로로만 돌려보낸다.
      const next = url.searchParams.get('next') ?? '/';
      const safe = /^\/(?!\/)[\w\-./?=&#%]*$/.test(next) ? next : '/';
      res.writeHead(302, { Location: safe, 'Cache-Control': 'no-store' }).end();
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/run') {
      const who = OPEN ? (req.headers['cf-connecting-ip'] ?? 'anon') : await verifyAccess(req);
      if (!who) {
        send(res, 403, { error: 'locked', message: 'C·Java 실행은 아직 공개 전입니다. 관리자 로그인이 필요합니다.' }, req);
        return;
      }
      if (rateLimited(String(who))) {
        send(res, 429, { error: 'rate', message: '요청이 너무 많습니다. 잠시 후 다시 실행하세요.' }, req);
        return;
      }
      let input;
      try {
        input = JSON.parse(await readBody(req));
      } catch (e) {
        send(res, e.status ?? 400, { error: 'bad_request', message: '요청 형식이 잘못되었습니다.' }, req);
        return;
      }
      const { lang, code } = input ?? {};
      if (!Object.hasOwn(IMAGES, lang) || typeof code !== 'string') {
        send(res, 400, { error: 'bad_request', message: '지원하지 않는 언어이거나 코드가 없습니다.' }, req);
        return;
      }
      if (Buffer.byteLength(code) > MAX_CODE) {
        send(res, 413, { error: 'too_large', message: `코드는 ${MAX_CODE / 1024}KB까지 실행할 수 있습니다.` }, req);
        return;
      }
      // 한 사람이 실행 칸을 여러 개 차지하지 못하게 한다
      if (active.has(String(who))) {
        send(res, 429, { error: 'busy_self', message: '이전 실행이 아직 끝나지 않았습니다. 끝난 뒤 다시 실행하세요.' }, req);
        return;
      }
      active.add(String(who));
      try {
        const started = Date.now();
        const trace = await enqueue(() => runContainer(lang, code));
        console.log(`run ${lang} ${code.length}B ${Date.now() - started}ms ${trace.length}B`);
        send(res, 200, trace, req);
      } finally {
        active.delete(String(who));
      }
      return;
    }
    send(res, 404, { error: 'not_found' }, req);
  } catch (e) {
    const status = e.status ?? 500;
    const message = status === 503 ? '실행 대기열이 가득 찼습니다. 잠시 후 다시 시도하세요.'
      : e.message === 'timeout' ? '실행 시간이 너무 깁니다.'
      : '실행 중 서버 오류가 났습니다.';
    if (status >= 500 && status !== 503) console.error('run failed:', e.message);
    send(res, status, { error: 'run_failed', message }, req);
  }
});

server.requestTimeout = 60_000;
server.listen(PORT, HOST, () => {
  console.log(`codestep api: http://${HOST}:${PORT} open=${OPEN} access=${TEAM && AUD ? 'configured' : 'NOT configured (locked)'} ai=${AI_ENABLED ? 'on' : 'off'}`);
});

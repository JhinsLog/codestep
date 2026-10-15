// codestep 웹 정적 서버.
// web/dist를 127.0.0.1에서만 서빙한다. 외부 접근은 Cloudflare 터널(+Access)을 거친다.
//
//   node server/static.mjs            (PORT 기본 5180)
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../web/dist/', import.meta.url));
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 5180);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const SECURITY_HEADERS = {
  // WASM 컴파일에는 'wasm-unsafe-eval'만 허용한다 (일반 eval은 막힌 채로)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

async function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  const full = normalize(join(ROOT, rel));
  if (full !== ROOT.slice(0, -1) && !full.startsWith(ROOT)) return null; // 경로 탈출 차단
  try {
    const s = await stat(full);
    if (s.isFile()) return { full, size: s.size };
    if (s.isDirectory()) {
      const index = join(full, 'index.html');
      const si = await stat(index);
      return { full: index, size: si.size };
    }
  } catch {
    // 없는 파일
  }
  return null;
}

const server = createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const file = await resolveFile(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
    return;
  }
  const ext = extname(file.full);
  // 해시가 붙은 빌드 산출물만 오래 캐시하고, 나머지는 매번 확인한다
  const hashed = file.full.includes(`${sep}assets${sep}`);
  res.writeHead(200, {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': file.size,
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file.full).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`codestep web: http://${HOST}:${PORT} (root ${ROOT})`);
});

// 컨테이너 안에서 돈다(shoot.sh). plan.json 형식은 plan.example.json 참고.
// 컨테이너 안에서: dist를 서빙하고(/api/run은 미리 기록한 trace), 시나리오대로 화면을 찍는다.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = '/dist', SHOT = '/shot';
const index = JSON.parse(readFileSync(`${SHOT}/traces/index.json`, 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
let askOnline = false;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  // AI 질문 창 상태 흉내: /__ask?online=1 로 켜고 끈다
  if (url.pathname === '/__ask') { askOnline = url.searchParams.get('online') === '1'; res.writeHead(204).end(); return; }
  if (url.pathname === '/api/ask/status') { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ enabled: true, online: askOnline, queue: 0 })); return; }
  // 질문하면 정해 둔 답을 조각조각 흘려보낸다
  if (url.pathname === '/api/ask' && req.method === 'POST') {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const j = JSON.parse(b);
      console.log(`[ask] q=${j.question}\n[ask] context(${j.context.length}자):\n${j.context.slice(0, 900)}\n…\n${j.context.slice(-500)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'a'.repeat(24) }));
    });
    return;
  }
  if (/^\/api\/ask\/a{24}\/stream$/.test(url.pathname)) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const ans = '### 27줄 `kim.deposit(300)`\n\n**kim이 가리키는 Account 객체**의 `deposit` 메서드를 부릅니다.\n\n1. 스택에 `deposit` 프레임이 새로 생기고, `amount = 300`이 들어갑니다.\n2. 9줄에서 `balance += amount`가 실행되어 **balance가 1000 → 1300**으로 바뀝니다.\n3. 메서드가 끝나면 프레임이 사라지고 main으로 돌아옵니다.\n\n- 힙의 #40 객체 하나만 바뀌고, `lee`가 가리키는 객체는 그대로입니다.';
    const parts = ans.match(/[\s\S]{1,12}/g);
    res.write(`event: queue\ndata: {"position":0}\n\n`);
    let i = 0;
    const t = setInterval(() => {
      if (i < parts.length) res.write(`event: delta\ndata: ${JSON.stringify({ text: parts[i++] })}\n\n`);
      else { clearInterval(t); res.end('event: done\ndata: {}\n\n'); }
    }, 15);
    return;
  }
  if (url.pathname === '/api/run') {
    let body = '';
    req.on('data', (b) => (body += b));
    req.on('end', () => {
      const { code } = JSON.parse(body);
      const hit = index.find((s) => s.code === code) ?? index[0];
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(readFileSync(`${SHOT}/traces/${hit.i}.json`));
    });
    return;
  }
  let f = join(DIST, url.pathname);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  // 운영 서버(server/static.mjs)와 같은 CSP로 띄워서, 막히는 것이 있으면 바로 드러나게 한다
  const nonce = Math.random().toString(36).slice(2);
  const body = extname(f) === '.html' ? readFileSync(f, 'utf8').replaceAll('__CSP_NONCE__', nonce) : readFileSync(f);
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream', 'Content-Security-Policy': CSP(nonce) }).end(body);
});
await new Promise((r) => server.listen(8080, '127.0.0.1', r));

const CSP = (nonce) => [
  "default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", `style-src 'self' 'nonce-${nonce}'`,
  "img-src 'self' data:", "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ');

const plan = JSON.parse(readFileSync(`${SHOT}/plan.json`, 'utf8'));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const sc of plan) {
  const ctx = await browser.newContext({ viewport: sc.viewport ?? { width: 1600, height: 900 }, colorScheme: sc.dark ? 'dark' : 'light', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${sc.name}] console.${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => console.log(`[${sc.name}] pageerror: ${e.message}`));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP 위반: ${e.violatedDirective} ${e.blockedURI}`)));
  await page.goto(`http://127.0.0.1:8080${sc.url ?? '/java'}`);
  if (sc.view) await page.evaluate((v) => localStorage.setItem('codestep.view', v), sc.view), await page.reload();
  if (sc.code !== undefined) {
    // 예제가 아닌 코드: 편집기 저장소에 넣고 다시 열어 실행한다 (trace는 traces/index.json에 같은 코드로 기록해 둔다)
    await page.evaluate(([k, c]) => localStorage.setItem(k, c), [sc.codeKey ?? 'codestep.java.code', sc.code]);
    await page.reload();
    await page.click('[data-id=run]');
    await page.waitForSelector('[data-id=edit]:not([hidden])', { timeout: 15000 });
  }
  if (sc.sample !== undefined) {
    await page.selectOption('[data-id=sample]', String(sc.sample));
    await page.click('[data-id=run]');
    await page.waitForSelector('[data-id=edit]:not([hidden])', { timeout: 15000 });
  }
  for (const a of sc.actions ?? []) {
    if (a.goto !== undefined) {
      await page.evaluate((n) => { const s = document.querySelector('[data-id=slider]'); s.value = String(n); s.dispatchEvent(new Event('input')); }, a.goto);
    } else if (a.key) await page.keyboard.press(a.key);
    else if (a.click) await page.click(a.click);
    else if (a.fill) await page.fill(a.fill[0], a.fill[1]);
    else if (a.wait) await page.waitForTimeout(a.wait);
    else if (a.reload) await page.reload();
    else if (a.type) await page.locator(a.type[0]).first().pressSequentially(a.type[1]);
    else if (a.scroll) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), a.scroll);
    else if (a.hover) await page.mouse.move(a.hover[0], a.hover[1]);
    else if (a.eval) console.log(`[${sc.name}] eval: ${JSON.stringify(await page.evaluate(a.eval))}`);
    else if (a.probe) {
      for (let k = 0; k < 4; k++) {
        const r = await page.evaluate(() => { const h = document.querySelector('.s3d'); const c = h?.querySelector('canvas');
          return `host ${h?.clientWidth}x${h?.clientHeight} canvas ${c?.width}x${c?.height} css ${c?.clientWidth}x${c?.clientHeight} debug ${document.querySelector('.debug').clientHeight}`; });
        console.log(`[${sc.name}] ${r}`);
        await page.waitForTimeout(700);
      }
    }
    else if (a.fps) {
      const r = await page.evaluate(() => new Promise((res) => {
        const ts = []; const f = (t) => { ts.push(t); if (ts.length < 20) requestAnimationFrame(f); else res(ts); };
        requestAnimationFrame(f);
      }));
      const d = r.slice(1).map((t, i) => t - r[i]);
      console.log(`[${sc.name}] frame ms: avg ${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)} max ${Math.max(...d).toFixed(1)}`);
    }
    else if (a.shot) {
      const clip = a.el ? await page.locator(a.el).boundingBox() : undefined;
      const t0 = Date.now(); await page.screenshot({ path: `${SHOT}/out/${sc.name}-${a.shot}.png`, clip, fullPage: !!a.full, timeout: 180000 }); console.log(`[${sc.name}] screenshot ${Date.now() - t0}ms`);
      const pos = await page.locator('[data-id=pos]').textContent({ timeout: 300 }).catch(() => '');
      console.log(`[${sc.name}] shot ${a.shot}: ${pos}`);
    }
  }
  await ctx.close();
}
await browser.close();
server.close();

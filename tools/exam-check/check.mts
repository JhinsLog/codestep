// 정보처리기사 문제의 정답을 실제 실행 결과와 대조한다. 문제를 고치면 다시 돌린다.
//
//   node --import ./ts-register.mjs --experimental-strip-types check.mts
//
// C: codestep-c 이미지에서 gcc로 컴파일·실행 / Java: codestep-java 실행기
// Python: 격리 컨테이너의 python3 (없으면 gdb 내장 Python) / SQL: 사이트가 쓰는 계측 SQLite(WASM) 그대로
// SQL을 뺀 모든 실행은 네트워크 없는 컨테이너 안에서 한다.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PROBLEMS } from '../../web/src/exam/problems.ts';
import { isCorrect } from '../../web/src/exam/answer.ts';

const SANDBOX = ['run', '--rm', '-i', '--network', 'none', '--memory', '256m', '--cpus', '1', '--pids-limit', '64',
  '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--label', 'app=codestep', '--cgroup-parent', 'codestep.slice'];
const C_IMAGE = process.env.CODESTEP_C_IMAGE ?? 'codestep-c:dev';
const PY_IMAGE = process.env.CODESTEP_PY_IMAGE ?? 'codestep-c:dev';

function docker(args: string[], input: string): string {
  const r = spawnSync('docker', [...SANDBOX, ...args], { input, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0 && !r.stdout) throw new Error(r.stderr);
  return r.stdout;
}

async function sqlRun(setup: string, query: string): Promise<string> {
  const dir = new URL('../../web/public/sql/', import.meta.url).pathname;
  (globalThis as any).window = globalThis;
  (globalThis as any).document = { currentScript: null };
  const { default: create } = await import(dir + 'sqltrace.mjs');
  const bin = readFileSync(dir + 'sqltrace.wasm');
  const lines: string[] = [];
  const m = await create({ instantiateWasm: (imp: any, ok: any) => { WebAssembly.instantiate(bin, imp).then((r) => ok(r.instance)); return {}; }, print: (l: string) => lines.push(l) });
  m.ccall('codestep_run', 'number', ['string', 'string'], [setup, query]);
  const rows: string[] = [];
  for (const l of lines) {
    const e = JSON.parse(l);
    if (e.t === 'op' && e.op === 'ResultRow' && e.row) rows.push(e.row.map((v: unknown) => String(v)).join(' '));
    if (e.t === 'error') rows.push(`오류: ${e.msg}`);
  }
  return rows.join('\n');
}

let bad = 0;
for (const p of PROBLEMS) {
  let out: string | null = null;
  if (p.kind === 'code' && p.lang === 'c') {
    out = docker(['--tmpfs', '/work:rw,exec,size=16m,mode=1777', C_IMAGE, 'sh', '-c', 'cat > a.c && gcc -O0 -o a a.c && ./a'], p.code);
  } else if (p.kind === 'code' && p.lang === 'python') {
    out = docker([PY_IMAGE, 'sh', '-c', 'command -v python3 >/dev/null && python3 - || gdb -batch -ex "python exec(open(\'/dev/stdin\').read())"'], p.code);
  } else if (p.kind === 'code' && p.lang === 'java') {
    const t = JSON.parse(docker(['--read-only', '--tmpfs', '/work:rw,size=32m,mode=1777', '--tmpfs', '/tmp:rw,size=16m,mode=1777', 'codestep-java:current'], p.code));
    out = t.stdout;
  } else if (p.kind === 'sql') {
    out = await sqlRun(p.setup, p.query);
  }
  if (out === null) continue;
  const ok = isCorrect(p, out);
  if (!ok) bad++;
  console.log(`${ok ? '맞음' : '틀림'} ${p.id.padEnd(18)} 실행: ${JSON.stringify(out.trim())}${ok ? '' : `  정답 칸: ${JSON.stringify(p.kind === 'code' || p.kind === 'sql' ? p.answer : '')}`}`);
}
console.log(bad ? `\n틀린 정답 ${bad}개` : '\n모든 코드 문제의 정답이 실제 실행 결과와 같습니다');
process.exit(bad ? 1 : 0);

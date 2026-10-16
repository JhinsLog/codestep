// 정보처리기사 문제의 정답을 실제 실행 결과와 대조한다. 문제를 고치면 다시 돌린다.
//
//   node --import ./ts-register.mjs --experimental-strip-types check.mts [id 앞부분 …]
//   (예: check.mts r2024-  → 2024년 회차 문제만)
//
// C: codestep-c 이미지에서 gcc로 컴파일·실행 / Java: codestep-java 실행기
// Python: codestep-python 이미지의 python3 / SQL: 사이트가 쓰는 계측 SQLite(WASM) 그대로
// SQL을 뺀 모든 실행은 네트워크 없는 컨테이너 안에서 한다.
//
// 코드 빈칸 문제는 빈칸에 인정하는 답을 하나씩 넣어 모두 같은 출력이 나오는지 본다.
// SQL 작성 문제는 모범 답안이 오류 없이 실행되는지 보고 결과를 찍어 준다(눈으로 확인).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ALL, ROUNDS } from '../../web/src/exam/data.ts';
import { filledCode, sameOutput, termMatches } from '../../web/src/exam/answer.ts';
import type { Problem } from '../../web/src/exam/problems.ts';

const SANDBOX = ['run', '--rm', '-i', '--network', 'none', '--memory', '256m', '--cpus', '1', '--pids-limit', '64',
  '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--label', 'app=codestep', '--cgroup-parent', 'codestep.slice'];
const C_IMAGE = process.env.CODESTEP_C_IMAGE ?? 'codestep-c:current';
const PY_IMAGE = process.env.CODESTEP_PY_IMAGE ?? 'codestep-python:current';

function docker(args: string[], input: string): string {
  const r = spawnSync('docker', [...SANDBOX, ...args], { input, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0 && !r.stdout) return `(실행 실패) ${r.stderr.trim().slice(-400)}`;
  return r.stdout;
}

function runCode(lang: 'c' | 'java' | 'python', code: string): string {
  if (lang === 'c') {
    return docker(['--tmpfs', '/work:rw,exec,size=16m,mode=1777', '--workdir', '/work', '--entrypoint', 'sh', C_IMAGE,
      '-c', 'cat > a.c && gcc -O0 -w -o a a.c -lm 2>&1 && ./a'], code);
  }
  if (lang === 'python') return docker(['--entrypoint', 'python3', PY_IMAGE, '-I', '-'], code);
  const out = docker(['--read-only', '--tmpfs', '/work:rw,size=32m,mode=1777', '--tmpfs', '/tmp:rw,size=16m,mode=1777', 'codestep-java:current'], code);
  try {
    const t = JSON.parse(out);
    return t.error && !t.stdout ? `(오류) ${t.error.message}` : t.stdout;
  } catch { return out; }
}

let sqlModule: any = null;
async function sqlRun(setup: string, query: string): Promise<string[] | string> {
  const dir = new URL('../../web/public/sql/', import.meta.url).pathname;
  (globalThis as any).window = globalThis;
  (globalThis as any).document = { currentScript: null };
  const lines: string[] = [];
  if (!sqlModule) {
    const { default: create } = await import(dir + 'sqltrace.mjs');
    const bin = readFileSync(dir + 'sqltrace.wasm');
    sqlModule = { create, bin };
  }
  const m = await sqlModule.create({ instantiateWasm: (imp: any, ok: any) => { WebAssembly.instantiate(sqlModule.bin, imp).then((r: any) => ok(r.instance)); return {}; }, print: (l: string) => lines.push(l) });
  m.ccall('codestep_run', 'number', ['string', 'string'], [setup, query]);
  const rows: string[] = [];
  for (const l of lines) {
    const e = JSON.parse(l);
    if (e.t === 'op' && e.op === 'ResultRow' && e.row) rows.push(e.row.map((v: unknown) => (v === null ? 'NULL' : String(v))).join(' '));
    if (e.t === 'error') return `오류(${e.where}): ${e.msg}`;
  }
  return rows;
}

const only = process.argv.slice(2);
const pick = (p: Problem) => !only.length || only.some((o) => p.id.startsWith(o));

// 구조 검사: 회차마다 20문항, id 중복 없음, 빈칸 표시가 코드에 있음, 단답에 답이 있음
let bad = 0;
const fail = (msg: string) => { bad++; console.log(`틀림 ${msg}`); };
const ids = new Set<string>();
for (const p of ALL) {
  if (ids.has(p.id)) fail(`${p.id} id가 겹칩니다`);
  ids.add(p.id);
  if (p.kind === 'code-blank') for (const b of p.blanks) if (!p.code.includes(b.label)) fail(`${p.id} 코드에 빈칸 ${b.label}이 없습니다`);
  if (p.kind === 'short' || p.kind === 'code-blank') {
    for (const b of p.blanks) if (!b.accept.length || b.accept.some((a) => !a.trim())) fail(`${p.id} 빈칸 ${b.label}의 답이 비었습니다`);
    if (p.kind === 'short') for (const b of p.blanks) if (!termMatches(b.accept[0]!, b.accept)) fail(`${p.id} 대표 답이 자기 자신과 맞지 않습니다`);
  }
}
for (const r of ROUNDS) if (r.problems.length !== 20) fail(`${r.id} 회차 문항 수가 ${r.problems.length}개입니다`);

let ran = 0;
for (const p of ALL) {
  if (!pick(p)) continue;
  if (p.kind === 'code') {
    ran++;
    const out = runCode(p.lang, p.code);
    const ok = sameOutput(out, p.answer);
    if (!ok) bad++;
    console.log(`${ok ? '맞음' : '틀림'} ${p.id.padEnd(14)} ${p.title} → ${JSON.stringify(out.trim()).slice(0, 160)}${ok ? '' : `  정답 칸: ${JSON.stringify(p.answer)}`}`);
  } else if (p.kind === 'code-blank') {
    // 대표 답으로, 그리고 다른 인정 답을 하나씩 넣어서
    const variants: string[] = [filledCode(p)];
    p.blanks.forEach((b, i) => b.accept.slice(1).forEach((alt) => {
      variants.push(filledCode(p, (x) => (x === p.blanks[i] ? alt : x.accept[0]!)));
    }));
    for (const [k, code] of variants.entries()) {
      ran++;
      const out = runCode(p.lang, code);
      const ok = sameOutput(out, p.out);
      if (!ok) bad++;
      console.log(`${ok ? '맞음' : '틀림'} ${p.id.padEnd(14)} ${p.title}${k ? ` (다른 답 ${k})` : ''} → ${JSON.stringify(out.trim()).slice(0, 160)}${ok ? '' : `  기대: ${JSON.stringify(p.out)}`}`);
    }
  } else if (p.kind === 'sql') {
    ran++;
    const out = await sqlRun(p.before ? `${p.setup}\n${p.before}` : p.setup, p.query);
    const text = typeof out === 'string' ? out : p.count ? String(out.length) : out.join('\n');
    const ok = sameOutput(text, p.answer);
    if (!ok) bad++;
    console.log(`${ok ? '맞음' : '틀림'} ${p.id.padEnd(14)} ${p.title} → ${JSON.stringify(text)}${ok ? '' : `  정답 칸: ${JSON.stringify(p.answer)}`}`);
  } else if (p.kind === 'sql-write') {
    ran++;
    const out = p.check ? await sqlRun(`${p.setup}\n${p.answer}`, p.check) : await sqlRun(p.setup, p.answer);
    const ok = typeof out !== 'string';
    if (!ok) bad++;
    console.log(`${ok ? '실행' : '틀림'} ${p.id.padEnd(14)} ${p.title} → ${typeof out === 'string' ? out : JSON.stringify(out.join(' | '))}`);
  }
}
console.log(bad ? `\n문제 ${bad}개` : `\n실행한 ${ran}개 모두 정답과 같습니다 (전체 ${ALL.length}문제, 회차 ${ROUNDS.length}개)`);
process.exit(bad ? 1 : 0);

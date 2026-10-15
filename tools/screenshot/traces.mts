import { JAVA_SAMPLES } from '../../web/src/java/samples.ts';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
// 예제마다 실제 실행기로 trace를 기록해 둔다. 화면 찍기 서버가 /api/run 대신 이것을 돌려준다.
const OUT = new URL('./traces/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const index = [];
JAVA_SAMPLES.forEach((s, i) => {
  const r = spawnSync('docker', ['run', '--rm', '-i', '--network', 'none', '--read-only', '--tmpfs', '/work:rw,size=32m,mode=1777',
    '--tmpfs', '/tmp:rw,size=16m,mode=1777', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '128',
    '--memory', '256m', '--memory-swap', '256m', '--cpus', '1', '--label', 'app=codestep', '--cgroup-parent', 'codestep.slice',
    'codestep-java:current'], { input: s.code, maxBuffer: 64 << 20 });
  writeFileSync(`${OUT}${i}.json`, r.stdout);
  const t = JSON.parse(r.stdout.toString());
  index.push({ i, label: s.label, code: s.code });
  console.log(i, s.label, t.steps.length, 'steps', t.error?.kind ?? '');
});
writeFileSync(`${OUT}index.json`, JSON.stringify(index));

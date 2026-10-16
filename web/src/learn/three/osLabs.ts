// 운영체제 3D 실습: CPU 스케줄링(시간 조각이 간트 차트로 날아감), 페이지 교체(디스크 ↔ 프레임), RAID(고장과 복구), chmod(권한 스위치).
import { Object3D, Vector3 } from 'three';
import { simulatePaging, type PageAlgo, type PageStep } from '../../exam/sims/paging';
import { simulateSched, type Proc, type SchedAlgo, type SchedResult } from '../../exam/sims/sched';
import { sleep, type Viz } from '../core';
import { openModal } from '../modal';
import { hsl } from './adapt';
import { packet, shapeOf } from './flow';
import type { SyncOpts, Want } from './keyed';
import { base, flashAll, hopAll } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

// ───────────────────────── CPU 스케줄링 ─────────────────────────

const PROCS: Proc[] = [{ name: 'P1', arrival: 0, burst: 7 }, { name: 'P2', arrival: 1, burst: 4 }, { name: 'P3', arrival: 2, burst: 2 }, { name: 'P4', arrival: 4, burst: 5 }];
const PH = [215, 150, 30, 290];
const SI: Record<string, Info> = {
  proc: { title: '프로세스', sub: '쌓인 조각 = 남은 실행 시간', body: '조각 하나가 CPU 시간 1입니다. CPU가 한 단위 실행할 때마다 맨 위 조각이 간트 차트로 날아갑니다. 반투명하면 아직 도착하지 않은 프로세스입니다.' },
  cpu: { title: 'CPU', sub: '한 번에 하나만 실행', body: '스케줄러가 준비 큐에서 다음에 실행할 프로세스를 고릅니다. 고르는 규칙이 스케줄링 알고리즘입니다.' },
  gantt: { title: '간트 차트', sub: 'Gantt Chart', body: '시간 순서대로 CPU가 어느 프로세스를 실행했는지 보여 줍니다. 대기 시간 = 반환 시간 − 실행 시간, 반환 시간 = 종료 시각 − 도착 시각.' },
};

export function schedLab(): Viz {
  return lab({ title: 'CPU 스케줄링 3D', en: 'FCFS · SJF · SRT · RR · HRN', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const T = PROCS.reduce((s, p) => s + p.burst, 0);
    const CW = 16 / T, GX0 = -8, GZ = -2.7;
    const px = (i: number) => -4.8 + i * 3.2, PZ = 2.4;
    let t = -1;
    let remain: Record<string, number> = {};
    let gantt: { t: number; name: string | null }[] = [];
    let running: string | null = null;
    let queue: string[] = [];
    let res: SchedResult | null = null;
    let done = false;
    const color = (name: string) => hsl(PH[PROCS.findIndex((p) => p.name === name)]!, 0.62, 0.52);
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      PROCS.forEach((p, i) => {
        const x = px(i);
        const arrived = t >= p.arrival;
        const r = remain[p.name] ?? p.burst;
        out.push({ key: `pad:${p.name}`, kind: 'block', pos: V(x, 0, PZ), size: [1.5, 0.1, 1.5], color: running === p.name ? P.warn : P.slab, info: SI.proc });
        for (let u = 0; u < r; u++) out.push({ key: `u:${p.name}:${u}`, kind: 'block', pos: V(x, 0.12 + u * 0.33, PZ), size: [1.0, 0.3, 1.0], color: color(p.name), opacity: arrived || t < 0 ? undefined : 0.35, glow: running === p.name ? 0.3 : 0, info: SI.proc });
        out.push({ key: `nm:${p.name}`, kind: 'sign', pos: V(x, 0.25, PZ + 1.25), runs: [{ text: p.name, color: P.text, weight: 800, size: 44 }, { text: `  도착 ${p.arrival} · 실행 ${p.burst}`, color: P.muted, size: 34 }], height: 0.42, bg: hex(P.slab), info: SI.proc });
        const qi = queue.indexOf(p.name);
        const tag = r === 0 ? '완료' : running === p.name ? '실행 중' : !arrived && t >= 0 ? `도착 전 (t=${p.arrival})` : qi >= 0 ? `대기 ${qi + 1}번` : '';
        if (tag && t >= 0) out.push({ key: `tg:${p.name}`, kind: 'sign', pos: V(x, 0.4 + r * 0.33 + 0.35, PZ), runs: [{ text: tag, color: '#ffffff', weight: 800, size: 38 }], height: 0.38, bg: hex(r === 0 ? 0x64748b : running === p.name ? P.warn : qi >= 0 ? P.accent : 0x94a3b8), info: SI.proc });
        const row = res?.rows.find((x) => x.name === p.name);
        if (done && row) out.push({ key: `rs:${p.name}`, kind: 'sign', pos: V(x, 1.25, PZ), runs: [{ text: `대기 ${row.waiting} · 반환 ${row.turnaround}`, color: P.text, weight: 800, size: 38 }], height: 0.42, bg: hex(P.pend) });
      });
      out.push({ key: 'cpu', kind: 'block', pos: V(0, 0, -0.1), size: [2.4, 0.55, 1.5], color: running ? color(running) : 0x334155, text: running ? `CPU: ${running}` : 'CPU', textColor: '#ffffff', glow: running ? 0.25 : 0, info: SI.cpu });
      if (running) {
        const i = PROCS.findIndex((p) => p.name === running);
        const a = V(px(i), 0.25, PZ - 0.8), z = V(0, 0.25, 0.65);
        out.push({ key: `run:${running}`, kind: 'obj', pos: a.clone().add(z).multiplyScalar(0.5), sig: `${running}`, make: () => w.bar(a, z, color(running!), 0.06, 0.8) });
      }
      for (let s = 0; s <= T; s++) if (s % 2 === 0 || s === T) out.push({ key: `tm:${s}`, kind: 'sign', pos: V(GX0 + s * CW, 0.05, GZ + 0.85), runs: [{ text: String(s), color: P.muted, size: 34 }], height: 0.28 });
      out.push({ key: 'gbase', kind: 'block', pos: V(0, 0, GZ), size: [16.2, 0.06, 1.0], color: P.slab, info: SI.gantt });
      for (const g of gantt) out.push({ key: `g:${g.t}`, kind: 'block', pos: V(GX0 + (g.t + 0.5) * CW, 0.06, GZ), size: [CW - 0.04, 0.32, 0.86], color: g.name ? color(g.name) : 0x94a3b8, text: g.name ?? '-', textColor: '#ffffff', info: SI.gantt });
      out.push({ key: 'clock', kind: 'sign', pos: V(-9.2, 0.45, GZ), runs: [{ text: `t = ${Math.max(0, t)}`, color: P.text, weight: 800, mono: true }], height: 0.48, bg: hex(P.slab), info: SI.gantt });
      if (done && res) out.push({ key: 'avg', kind: 'sign', pos: V(0, 1.25, -0.1), runs: [{ text: `평균 대기 ${num(res.avgWait)} · 평균 반환 ${num(res.avgTurn)}`, color: '#ffffff', weight: 800 }], height: 0.48, bg: hex(P.good) });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });

    async function run(algo: SchedAlgo) {
      const R: SchedResult = simulateSched(PROCS, algo, 2);
      res = R;
      remain = Object.fromEntries(PROCS.map((p) => [p.name, p.burst]));
      gantt = []; running = null; queue = []; done = false; t = 0;
      l.code(`${algo}${algo === 'RR' ? ' (타임 퀀텀 2)' : ''}\n${PROCS.map((p) => `${p.name}: 도착 ${p.arrival}, 실행 ${p.burst}`).join('\n')}`);
      await draw({ ms: 400 });
      const end = R.segs.length ? R.segs[R.segs.length - 1]!.end : T;
      for (t = 0; t < end; t++) {
        const seg = R.segs.find((s) => s.start <= t && t < s.end);
        const now = seg?.name ?? null;
        const ev = [...R.events].reverse().find((e) => e.time <= t);
        queue = (ev?.queue ?? []).filter((n) => n !== now && (remain[n] ?? 0) > 0 && PROCS.find((p) => p.name === n)!.arrival <= t);
        for (const p of PROCS) if (p.arrival <= t && (remain[p.name] ?? 0) > 0 && p.name !== now && !queue.includes(p.name)) queue.push(p.name);
        const evNow = R.events.find((e) => e.time === t);
        if (now !== running || evNow) { running = now; if (evNow) l.say(`t=${t}: ${evNow.note}`, 'info'); await draw({ ms: 350 }); }
        if (now) {
          const from = k.get(`u:${now}:${remain[now]! - 1}`)?.position.clone();
          remain[now] = remain[now]! - 1;
          gantt.push({ t, name: now });
          if (remain[now] === 0) queue = queue.filter((n) => n !== now);
          await draw({ ms: 420, arc: 1.4, spawn: (key) => (key === `g:${t}` ? from : undefined) });
        } else {
          gantt.push({ t, name: null });
          await draw({ ms: 300 });
        }
      }
      running = null; queue = []; done = true; t = end;
      await draw({ ms: 500 });
      l.say(`${algo} 끝: 평균 대기 시간 ${num(R.avgWait)}, 평균 반환 시간 ${num(R.avgTurn)}. ${{
        FCFS: '먼저 온 순서대로. 긴 P1 때문에 뒤의 짧은 작업이 오래 기다립니다(호위 효과).',
        SJF: '비선점: 실행 중인 것은 끝까지, 다음은 실행 시간이 가장 짧은 것. 평균 대기 시간이 가장 짧은 편입니다.',
        SRT: '선점형 SJF: 남은 시간이 더 짧은 프로세스가 오면 CPU를 빼앗습니다.',
        RR: '시간 할당량(2)만큼씩 돌아가며 실행합니다. 시분할 시스템의 기본, 응답이 고르게 빠릅니다.',
        HRN: '응답률 = (대기 시간 + 실행 시간) / 실행 시간이 큰 것부터. 오래 기다린 긴 작업도 결국 실행됩니다(기아 해결).',
        PRIORITY: '',
      }[algo]}`, 'ok');
    }
    async function reset() {
      t = -1; remain = {}; gantt = []; running = null; queue = []; res = null; done = false;
      await draw({ exit: 'shrink' });
      w.fit(-9.8, 8.6, -3.6, 4.2);
    }
    void reset();
    const ALGOS: [SchedAlgo, string, string][] = [['FCFS', 'FCFS', '선입선처리 (비선점)'], ['SJF', 'SJF', '최단 작업 우선 (비선점)'], ['SRT', 'SRT', '최소 잔여 시간 (선점)'], ['RR', 'RR', '라운드 로빈 q=2 (선점)'], ['HRN', 'HRN', '응답률 (비선점)']];
    return {
      hint: '알고리즘 단추를 누르면 CPU가 1단위씩 실행하며 조각이 아래 간트 차트로 날아갑니다. 끝나면 대기·반환 시간이 계산됩니다.',
      reset,
      groups: [
        { name: '비선점', en: 'Non-preemptive', hue: 210, cmds: ALGOS.filter((a) => !a[2].includes('(선점')).map(([a, n, tip]): Cmd => ({ name: n, tip, run: () => run(a) })) },
        { name: '선점', en: 'Preemptive', hue: 20, cmds: ALGOS.filter((a) => a[2].includes('(선점')).map(([a, n, tip]): Cmd => ({ name: n, tip, run: () => run(a) })) },
      ],
    };
  } });
}

// ───────────────────────── 페이지 교체 ─────────────────────────

const REFS = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];
const NF = 3;
const PI: Record<string, Info> = {
  frame: { title: '페이지 프레임', sub: '주기억장치의 칸', body: '실행에 필요한 페이지를 올려 두는 주기억장치의 칸입니다. 칸이 모자라면 어떤 페이지를 내보낼지 골라야 합니다(페이지 교체).' },
  disk: { title: '보조기억장치', sub: '디스크', body: '모든 페이지가 저장된 곳입니다. 필요한 페이지가 프레임에 없으면(페이지 부재, Page Fault) 디스크에서 가져와야 해서 느립니다.' },
  ref: { title: '참조 문자열', sub: 'Reference String', body: 'CPU가 차례로 필요로 하는 페이지 번호입니다. 초록 = 적중(Hit), 빨강 = 부재(Fault).' },
  hist: { title: '프레임 변화표', sub: '시험에 나오는 표', body: '참조할 때마다 프레임 상태를 한 열씩 기록합니다. 위에 F 표시가 있는 열이 페이지 부재입니다.' },
};

export function pagingLab(): Viz {
  return lab({ title: '페이지 교체 3D', en: 'FIFO · LRU · LFU · OPT', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const RX = (i: number) => -6 + i * 1.0, RZ = 3.1;
    const FX = (s: number) => -1.6 + s * 1.6, FZ = 0.6;
    const HX = (i: number) => -5.4 + i * 0.9, HZ = -2.4;
    const DISK = V(-6.6, 0, 0.4);
    let algo: PageAlgo = 'FIFO';
    let steps: PageStep[] = [];
    let i = -1;
    // 각 프레임의 메타: 들어온 시각, 마지막 사용, 사용 횟수
    let meta: { loaded: number; used: number; count: number }[] = [];
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      REFS.forEach((r, j) => {
        const st = steps[j];
        const c = j > i || !st ? P.cell : st.hit ? P.good : P.bad;
        out.push({ key: `r:${j}`, kind: 'block', pos: V(RX(j), j === i ? 0.35 : 0, RZ), size: [0.85, 0.32, 0.75], color: c, text: String(r), textColor: j > i ? P.cellText : '#ffffff', glow: j === i ? 0.35 : 0, info: PI.ref });
      });
      out.push({ key: 'rlab', kind: 'sign', pos: V(RX(0) - 1.6, 0.3, RZ), runs: [{ text: '참조열', color: P.text, weight: 800, size: 38 }], height: 0.4, bg: hex(P.slab), info: PI.ref });
      const cur = i >= 0 ? steps[i] : undefined;
      for (let s = 0; s < NF; s++) {
        out.push({ key: `fp:${s}`, kind: 'block', pos: V(FX(s), 0, FZ), size: [1.4, 0.1, 1.4], color: P.slab, info: PI.frame });
        out.push({ key: `fl:${s}`, kind: 'sign', pos: V(FX(s), 0.2, FZ + 1.0), runs: [{ text: `프레임 ${s}`, color: P.muted, size: 34 }], height: 0.3, info: PI.frame });
        const pg = cur?.frames[s];
        if (pg !== null && pg !== undefined) {
          out.push({ key: `pg:${pg}`, kind: 'block', pos: V(FX(s), 0.1, FZ), size: [1.05, 0.85, 1.05], color: hsl(pg * 47 + 190, 0.55, 0.5), text: String(pg), textColor: '#ffffff', info: PI.frame });
          const m = meta[s];
          if (m) {
            const nextUse = REFS.slice(i + 1).indexOf(pg);
            const txt = algo === 'FIFO' ? `들어온 때 ${m.loaded + 1}` : algo === 'LRU' ? `최근 사용 ${m.used + 1}` : algo === 'LFU' ? `사용 ${m.count}회` : nextUse < 0 ? '앞으로 안 씀' : `${nextUse + 1}칸 뒤 사용`;
            out.push({ key: `mt:${s}`, kind: 'sign', pos: V(FX(s), 1.45, FZ), runs: [{ text: txt, color: P.text, weight: 700, size: 34 }], height: 0.32, bg: hex(P.bg) });
          }
        }
      }
      out.push({ key: 'disk', kind: 'obj', pos: DISK, make: () => shapeOf(w, 'db', 0x64748b), info: PI.disk });
      out.push({ key: 'dlab', kind: 'sign', pos: DISK.clone().add(V(0, 0.25, 1.1)), runs: [{ text: '디스크', color: P.text, weight: 800, size: 38 }], height: 0.4, bg: hex(P.slab), info: PI.disk });
      const faults = cur?.faults ?? 0;
      out.push({ key: 'fc', kind: 'sign', pos: DISK.clone().add(V(0, 1.9, 0)), runs: [{ text: `부재 ${faults}회`, color: '#ffffff', weight: 800 }], height: 0.48, bg: hex(P.bad), info: PI.disk });
      // 프레임 변화표
      for (let j = 0; j <= i; j++) {
        const st = steps[j]!;
        st.frames.forEach((pg, s) => { if (pg !== null) out.push({ key: `h:${j}:${s}`, kind: 'block', pos: V(HX(j) + 3.6, 0, HZ - (NF - 1 - s) * 0.62), size: [0.82, 0.18, 0.56], color: s === st.slot ? (st.hit ? P.good : P.bad) : P.cell, text: String(pg), textColor: s === st.slot ? '#ffffff' : P.cellText, info: PI.hist }); });
        if (!st.hit) out.push({ key: `hf:${j}`, kind: 'sign', pos: V(HX(j) + 3.6, 0.2, HZ - NF * 0.62), runs: [{ text: 'F', color: '#ffffff', weight: 800, size: 36 }], height: 0.3, bg: hex(P.bad), info: PI.hist });
      }
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });

    async function step() {
      if (i + 1 >= REFS.length) return false;
      i++;
      const st = steps[i]!;
      const s = st.slot;
      if (st.hit) { meta[s]!.used = i; meta[s]!.count++; }
      else meta[s] = { loaded: i, used: i, count: 1 };
      const victimObj = st.victim !== null ? k.get(`pg:${st.victim}`) : undefined;
      if (victimObj) {
        // 나가는 페이지는 디스크로 날아간다 (이름표가 사라지기 전에 따로 움직인다)
        await w.flash(victimObj, w.pal.bad, 350);
      }
      await draw({ ms: 600, arc: 1.4, exit: 'fly', spawn: (key) => (key === `pg:${st.ref}` && !st.hit ? DISK.clone().add(V(0, 1.2, 0)) : undefined) });
      if (st.hit) await flashAll(w, [k.get(`pg:${st.ref}`)], w.pal.good, 500);
      l.say(`${i + 1}번째 참조 ${st.ref}: ${st.note}`, st.hit ? 'ok' : 'bad');
      return true;
    }
    async function start(a: PageAlgo) {
      algo = a;
      steps = simulatePaging(REFS, NF, a);
      i = -1; meta = [];
      l.code(`${a}  프레임 ${NF}개\n참조열: ${REFS.join(' ')}`);
      await draw({ exit: 'shrink', ms: 400 });
    }
    async function runAll(a: PageAlgo) {
      await start(a);
      while (await step()) await sleep(650);
      l.say(`${a}: 페이지 부재 ${steps[steps.length - 1]!.faults}회, 적중 ${REFS.length - steps[steps.length - 1]!.faults}회. ${{
        FIFO: '가장 먼저 들어온 페이지를 내보냅니다. 단순하지만 프레임을 늘려도 부재가 늘 수 있습니다(벨레이디 모순).',
        LRU: '가장 오랫동안 사용하지 않은 페이지를 내보냅니다. 최근 사용 시각을 기억해야 합니다.',
        LFU: '사용 횟수가 가장 적은 페이지를 내보냅니다.',
        OPT: '앞으로 가장 오랫동안 쓰지 않을 페이지를 내보냅니다. 부재가 가장 적지만 미래를 알아야 해서 실제로는 못 씁니다(비교 기준).',
      }[a]}`, 'ok');
    }
    async function reset() { steps = []; i = -1; meta = []; await draw({ exit: 'shrink' }); w.fit(-7.8, 7.4, -4.4, 4.2); }
    void reset();
    const ALG: [PageAlgo, string][] = [['FIFO', '선입선출'], ['LRU', '최근 최소 사용'], ['LFU', '최소 사용 빈도'], ['OPT', '최적']];
    return {
      hint: '알고리즘을 누르면 참조열을 하나씩 처리합니다. 부재(빨강)면 디스크에서 페이지가 날아오고 하나가 쫓겨납니다. 뒤쪽은 시험에 나오는 프레임 변화표입니다.',
      reset,
      groups: [
        { name: '끝까지 실행', en: 'Run', hue: 210, cmds: ALG.map(([a, ko]): Cmd => ({ name: a, tip: ko, run: () => runAll(a) })) },
        { name: '한 단계씩', en: 'Step', hue: 150, cmds: [
          ...ALG.map(([a, ko]): Cmd => ({ name: `${a} 준비`, tip: `${ko} — 처음 상태로`, run: async () => { await start(a); l.say(`${a} 준비 완료. "다음 참조 ▶"를 누르세요.`, 'info'); } })),
          { name: '다음 참조 ▶', run: async () => { if (!steps.length) await start(algo); if (!(await step())) l.say('참조열을 모두 처리했습니다.', 'info'); } },
        ] },
      ],
    };
  } });
}

// ───────────────────────── RAID ─────────────────────────

interface Level { name: string; en: string; n: number; layout: string[][]; survive: number; desc: string; min: string }
const LEVELS: Level[] = [
  { name: 'RAID 0', en: '스트라이핑', n: 2, layout: [['A1', 'A2'], ['A3', 'A4'], ['A5', 'A6']], survive: 0, min: '최소 2개 · 용량 100%', desc: '데이터를 나눠 여러 디스크에 동시에 씁니다. 가장 빠르지만 중복이 없어 하나만 고장 나도 전부 잃습니다.' },
  { name: 'RAID 1', en: '미러링', n: 2, layout: [['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3']], survive: 1, min: '최소 2개 · 용량 50%', desc: '같은 데이터를 두 디스크에 똑같이 씁니다. 하나가 고장 나도 거울 디스크로 버팁니다.' },
  { name: 'RAID 4', en: '전용 패리티', n: 3, layout: [['A1', 'A2', 'P'], ['B1', 'B2', 'P'], ['C1', 'C2', 'P']], survive: 1, min: '최소 3개', desc: '블록 단위로 나눠 쓰고 패리티는 한 디스크에만 모읍니다. 쓸 때마다 패리티 디스크가 바빠 병목이 됩니다. (RAID 3은 바이트 단위)' },
  { name: 'RAID 5', en: '분산 패리티', n: 3, layout: [['A1', 'A2', 'P'], ['B1', 'P', 'B2'], ['P', 'C1', 'C2']], survive: 1, min: '최소 3개 · 1개 분량이 패리티', desc: '패리티를 모든 디스크에 돌아가며 나눠 씁니다. 디스크 1개가 고장 나도 나머지 데이터와 패리티를 XOR해 복구합니다.' },
  { name: 'RAID 6', en: '이중 패리티', n: 4, layout: [['A1', 'A2', 'P', 'Q'], ['B1', 'P', 'Q', 'B2'], ['P', 'Q', 'C1', 'C2']], survive: 2, min: '최소 4개 · 2개 분량이 패리티', desc: '패리티를 두 개(P, Q) 둬서 디스크 2개가 동시에 고장 나도 복구합니다.' },
];

export function raidLab(): Viz {
  return lab({ title: 'RAID 3D', en: 'Redundant Array of Independent Disks', height: 460, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let lv = LEVELS[3]!;
    let broken = new Set<number>();
    let shown = 0;   // 써 넣은 블록 수
    let lost = false;
    const DX = (d: number) => (d - (lv.n - 1) / 2) * 2.3;
    const info = (): Info => ({ title: `${lv.name} — ${lv.en}`, sub: lv.min, body: lv.desc });
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      for (let d = 0; d < lv.n; d++) {
        const bad = broken.has(d);
        out.push({ key: `disk:${d}`, kind: 'block', pos: V(DX(d), 0, 0), size: [1.8, 0.25, 1.6], color: bad ? P.bad : 0x475569, text: bad ? `디스크 ${d + 1} ✕` : `디스크 ${d + 1}`, textColor: '#ffffff', info: info() });
      }
      lv.layout.forEach((row, r) => row.forEach((blk, d) => {
        const order = r * lv.n + d;
        if (order >= shown) return;
        if (broken.has(d)) return;
        const par = blk === 'P' || blk === 'Q';
        const c = lost && !par ? P.bad : blk === 'P' ? P.key : blk === 'Q' ? 0xa855f7 : hsl(200 + (blk.charCodeAt(0) - 65) * 50, 0.55, 0.5);
        out.push({ key: `b:${r}:${d}`, kind: 'block', pos: V(DX(d), 0.3 + r * 0.6, 0), size: [1.45, 0.5, 1.2], color: c, text: blk, textColor: '#ffffff', info: par ? { title: '패리티', sub: blk === 'Q' ? '두 번째 패리티' : 'XOR 계산값', body: '같은 줄의 데이터 블록들을 XOR한 값입니다. 데이터 블록 하나가 사라져도 나머지와 패리티를 XOR하면 되살아납니다.' } : info() });
      }));
      out.push({ key: 'cap', kind: 'sign', pos: V(0, 2.6, 0), runs: [{ text: `${lv.name} `, color: P.text, weight: 800 }, { text: lv.min, color: P.muted, size: 36 }], height: 0.5, bg: hex(P.slab), info: info() });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const fit = () => w.fit(DX(0) - 2.6, DX(lv.n - 1) + 2.6, -3.4, 3.2);

    async function write(L: Level) {
      lv = L; broken = new Set(); shown = 0; lost = false;
      l.code(`${L.name} (${L.en}) — 디스크 ${L.n}개`);
      await draw({ exit: 'shrink', ms: 400 });
      fit();
      for (let o = 1; o <= L.n * L.layout.length; o++) {
        shown = o;
        await draw({ ms: 380, arc: 1.2, spawn: (key) => (key.startsWith('b:') ? V(0, 3.2, 3.2) : undefined) });
      }
      l.say(`${L.name} ${L.en}: ${L.desc}`, 'ok');
    }
    async function fail() {
      const d = [...Array(lv.n).keys()].find((x) => !broken.has(x));
      if (d === undefined) return;
      broken.add(d);
      l.code(`💥 디스크 ${d + 1} 고장`);
      await draw({ exit: 'fall', ms: 700 });
      if (broken.size > lv.survive) {
        lost = true;
        await draw({ ms: 400 });
        l.say(`${lv.name}는 디스크 ${lv.survive}개 고장까지만 견딥니다${lv.survive ? '' : '(중복이 없음)'}. 데이터를 복구할 수 없습니다 — 손실!`, 'bad');
        return;
      }
      l.say(`디스크 ${d + 1}이 고장 났지만 ${lv.name}는 ${lv.survive}개까지 견딥니다. "교체 후 복구"를 눌러 보세요.`, 'info');
    }
    async function rebuild() {
      if (!broken.size) { l.say('고장 난 디스크가 없습니다. 먼저 💥 디스크 고장을 눌러 보세요.', 'info'); return; }
      if (lost) { l.say('이미 데이터를 잃었습니다. 레벨을 다시 골라 주세요.', 'bad'); return; }
      const d = [...broken][0]!;
      l.code(`디스크 ${d + 1} 교체 → 다른 디스크로 다시 계산`);
      // 같은 줄의 다른 블록들이 빈 자리로 날아가 합쳐진다(미러는 복사, 패리티는 XOR)
      for (let r = 0; r < lv.layout.length; r++) {
        const srcs = [...Array(lv.n).keys()].filter((x) => x !== d && !broken.has(x)).map((x) => k.get(`b:${r}:${x}`)).filter(Boolean) as Object3D[];
        const target = V(DX(d), 0.3 + r * 0.6, 0);
        await Promise.all(srcs.map(async (s, j) => {
          const g = w.block(1.45, 0.5, 1.2, 0x94a3b8, { text: (s.userData.top as { text: string }).text, color: '#ffffff' });
          g.position.copy(s.position);
          root.add(g);
          b.temp.add(g);
          await sleep(j * 120);
          await w.move(g, target, 650, 0.9);
          b.temp.delete(g);
          await w.vanish(g, 'shrink', 200);
        }));
      }
      broken.delete(d);
      await draw({ ms: 450 });
      await flashAll(w, k.starting(`b:`).filter((o) => Math.abs(o.position.x - DX(d)) < 0.01), w.pal.good, 700);
      l.say(lv.name === 'RAID 1' ? '거울 디스크의 블록을 그대로 복사해 되살렸습니다.' : '같은 줄의 남은 블록과 패리티를 XOR해서 사라진 블록을 다시 계산했습니다.', 'ok');
    }
    async function reset() { await write(LEVELS[3]!); }
    void reset();
    return {
      hint: '레벨을 고르면 블록(A1, A2 …)이 디스크에 써집니다. 💥 디스크 고장 → 교체 후 복구로 데이터가 살아남는지 보세요.',
      reset,
      groups: [
        { name: '레벨', en: 'Level', hue: 210, cmds: LEVELS.map((L): Cmd => ({ name: L.name, tip: L.en, run: () => write(L) })) },
        { name: '고장', en: 'Failure', hue: 0, cmds: [{ name: '💥 디스크 고장', run: fail }, { name: '교체 후 복구', run: rebuild }] },
      ],
    };
  } });
}

// ───────────────────────── chmod ─────────────────────────

const WHO = [['u', '소유자', 'kim'], ['g', '그룹', 'lee'], ['o', '기타', 'park']] as const;
const BITS = [['r', '읽기', 4], ['w', '쓰기', 2], ['x', '실행', 1]] as const;
const CI: Info = { title: '권한 스위치', sub: 'r=4 · w=2 · x=1', body: '소유자(u)·그룹(g)·기타(o)마다 읽기(r)·쓰기(w)·실행(x)을 켜고 끕니다. 켜진 값을 더하면 그 자리의 8진수 숫자가 됩니다. 예: rwx = 4+2+1 = 7, r-x = 5.\n\n스위치 블록을 직접 눌러 켜고 꺼 보세요.' };

export function chmodLab(): Viz {
  return lab({ title: 'chmod 권한 3D', en: 'rwx · 8진수 · 접근 시험', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let on = [[true, true, true], [true, false, true], [true, false, false]];
    const SX = (j: number) => 2.2 + j * 1.6, SZ = (i: number) => -1.6 + i * 1.5;
    const FILE = V(-2.6, 0, -1.4);
    const PX = (i: number) => -5.4 + i * 2.2, PZ = 2.8;
    const oct = () => on.map((r) => r.reduce((a, v, j) => a + (v ? BITS[j]![2] : 0), 0)).join('');
    const sym = () => on.map((r) => r.map((v, j) => (v ? BITS[j]![0] : '-')).join('')).join('');
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      out.push({ key: 'file', kind: 'obj', pos: FILE, make: () => shapeOf(w, 'doc', 0x2563eb), info: { title: 'report.txt', sub: `-${sym()}  kim  staff`, body: '소유자는 kim, 그룹은 staff(lee가 속함), 그 밖의 사용자는 기타(park)입니다.' } });
      out.push({ key: 'ls', kind: 'sign', pos: FILE.clone().add(V(0, 2.0, 0)), runs: [{ text: `-${sym()}`, color: P.text, weight: 800, mono: true }, { text: '  kim staff report.txt', color: P.muted, size: 36, mono: true }], height: 0.48, bg: hex(P.slab) });
      BITS.forEach(([c, n, v], j) => out.push({ key: `bh:${j}`, kind: 'sign', pos: V(SX(j), 0.3, SZ(0) - 1.05), runs: [{ text: `${c} ${n} (${v})`, color: P.text, weight: 700, size: 36 }], height: 0.36 }));
      WHO.forEach(([c, n, who], i) => {
        out.push({ key: `wh:${i}`, kind: 'sign', pos: V(SX(0) - 1.75, 0.3, SZ(i)), runs: [{ text: `${n} ${c}`, color: P.text, weight: 800, size: 38 }, { text: ` ${who}`, color: P.muted, size: 32 }], height: 0.4, bg: hex(P.slab) });
        BITS.forEach(([c2], j) => {
          const v = on[i]![j]!;
          out.push({ key: `sw:${i}:${j}`, kind: 'block', pos: V(SX(j), 0, SZ(i)), size: [1.3, v ? 0.55 : 0.16, 1.1], color: v ? hsl([140, 40, 0][j]!, 0.6, 0.48) : 0x94a3b8, text: v ? c2 : '-', textColor: '#ffffff', glow: v ? 0.15 : 0, info: CI });
        });
        out.push({ key: `sum:${i}`, kind: 'sign', pos: V(SX(2) + 1.35, 0.45, SZ(i)), runs: [{ text: oct()[i]!, color: '#ffffff', weight: 800, mono: true }], height: 0.55, bg: hex(P.accent), info: CI });
      });
      WHO.forEach(([, n, who], i) => {
        out.push({ key: `p:${i}`, kind: 'obj', pos: V(PX(i), 0, PZ), make: () => shapeOf(w, 'person', hsl([215, 150, 300][i]!, 0.55, 0.5)), info: { title: who, sub: n, body: `${who}는 report.txt의 ${n} 권한(${sym().slice(i * 3, i * 3 + 3)})을 적용받습니다.` } });
        out.push({ key: `pn:${i}`, kind: 'sign', pos: V(PX(i), 0.25, PZ + 0.95), runs: [{ text: `${who} (${n})`, color: P.text, weight: 800, size: 36 }], height: 0.36, bg: hex(P.slab) });
      });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const show = () => l.code(`chmod ${oct()} report.txt\n# = chmod u=${sym().slice(0, 3).replace(/-/g, '')},g=${sym().slice(3, 6).replace(/-/g, '')},o=${sym().slice(6).replace(/-/g, '')}`);
    w.onPick = (inf, o) => {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (k.get(`sw:${i}:${j}`) === o) {
        on[i]![j] = !on[i]![j];
        void draw({ ms: 300 }).then(show);
        l.say(`${WHO[i]![1]}의 ${BITS[j]![1]}(${BITS[j]![0]}) 권한을 ${on[i]![j] ? '켰' : '껐'}습니다 → ${oct()}`, 'info');
        return;
      }
      openModal(inf.title, inf.body.split('\n\n'), inf.sub);
    };
    async function set(spec: string, sayText: string) {
      if (/^\d{3}$/.test(spec)) on = [...spec].map((d) => { const n = Number(d); return [!!(n & 4), !!(n & 2), !!(n & 1)]; });
      else {
        const m = /^([ugoa]+)([+\-=])([rwx]*)$/.exec(spec)!;
        const whos = m[1]!.includes('a') ? [0, 1, 2] : [...m[1]!].map((c) => 'ugo'.indexOf(c));
        for (const i of whos) BITS.forEach(([c], j) => {
          const has = m[3]!.includes(c);
          if (m[2] === '=') on[i]![j] = has; else if (has) on[i]![j] = m[2] === '+';
        });
      }
      l.code(`chmod ${spec} report.txt   # → ${oct()} (${sym()})`);
      await draw({ ms: 450 });
      l.say(sayText || `${WHO.map(([, n], i) => `${n} ${oct()[i]} = ${BITS.filter((_b, j) => on[i]![j]).map((x) => x[1]).join('·') || '권한 없음'}`).join(' / ')}`, 'ok');
    }
    async function attempt(j: number) {
      const act = [['cat report.txt', '읽기'], ['vi report.txt (저장)', '쓰기'], ['./report.txt', '실행']][j]!;
      l.code(`$ ${act[0]}   # ${act[1]} 시도`);
      await Promise.all(WHO.map(async (_x, i) => {
        const ok = on[i]![j]!;
        const p = packet(w, act[1]!, ok ? w.pal.good : w.pal.bad);
        const from = V(PX(i), 1.9, PZ), to = FILE.clone().add(V(0, 1.4, 0));
        p.position.copy(from);
        root.add(p);
        b.temp.add(p);
        await w.pop(p, 200);
        if (ok) { await w.move(p, to, 900, 0.8); await w.flash(k.get('file')!, w.pal.good, 400); }
        else { await w.move(p, from.clone().lerp(to, 0.6), 600, 0.5); await w.flash(p, w.pal.bad, 400); }
        b.temp.delete(p);
        await w.vanish(p, ok ? 'shrink' : 'fall', 400);
      }));
      l.say(`${act[1]}: ${WHO.map(([, n, who], i) => `${who}(${n}) ${on[i]![j] ? '○' : '✕'}`).join(', ')}. 실행(x)은 디렉터리라면 "들어가기(cd)" 권한입니다.`, 'info');
    }
    async function reset() { on = [[true, true, true], [true, false, true], [true, false, false]]; await draw({ exit: 'shrink' }); show(); w.fit(-6.8, 7.2, -3.4, 4.0); }
    void reset();
    return {
      hint: '스위치 블록을 직접 누르거나 명령을 골라 보세요. 사람들이 파일에 접근할 수 있는지 "접근 시험"으로 확인합니다.',
      reset,
      groups: [
        { name: '8진수', en: 'Octal', hue: 210, cmds: ['755', '644', '700', '751', '640'].map((p): Cmd => ({ name: `chmod ${p}`, run: () => set(p, '') })) },
        { name: '기호', en: 'Symbolic', hue: 150, cmds: [['u+x', ''], ['go-w', ''], ['a+r', ''], ['o=', '기타 사용자의 권한을 모두 없앴습니다(= 뒤가 비어 있음).']].map(([p, s]): Cmd => ({ name: `chmod ${p}`, run: () => set(p!, s!) })) },
        { name: '접근 시험', en: 'Try', hue: 30, cmds: [{ name: '읽기 (cat)', run: () => attempt(0) }, { name: '쓰기 (vi)', run: () => attempt(1) }, { name: '실행 (./)', run: () => attempt(2) }] },
      ],
    };
  } });
}


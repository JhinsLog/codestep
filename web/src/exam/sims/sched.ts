// CPU 스케줄링 (FCFS · SJF · SRT · RR · 우선순위 · HRN).
//
// 관례:
//   - 같은 조건이면 먼저 도착한 프로세스, 그다음 표에 적힌 순서
//   - 우선순위는 숫자가 작을수록 높다
//   - RR에서 시간 할당이 끝난 프로세스와 같은 시각에 도착한 프로세스가 있으면,
//     도착한 프로세스가 먼저 대기열에 들어간다
//   - HRN 우선순위 = (대기 시간 + 실행 시간) / 실행 시간, 클수록 먼저

export type SchedAlgo = 'FCFS' | 'SJF' | 'SRT' | 'RR' | 'PRIORITY' | 'HRN';

export const SCHED_ALGO_NAME: Record<SchedAlgo, string> = {
  FCFS: 'FCFS (먼저 온 순서)',
  SJF: 'SJF (짧은 작업 먼저, 비선점)',
  SRT: 'SRT (남은 시간이 짧은 것 먼저, 선점)',
  RR: 'RR (라운드 로빈)',
  PRIORITY: '우선순위 (비선점)',
  HRN: 'HRN (응답률이 높은 것 먼저)',
};

export interface Proc {
  name: string;
  arrival: number;
  burst: number;
  priority?: number;
}

export interface Seg { name: string | null; start: number; end: number }   // name이 null이면 쉬는 시간
export interface SchedEvent { time: number; pick: string; queue: string[]; note: string }
export interface SchedRow { name: string; arrival: number; burst: number; finish: number; turnaround: number; waiting: number }
export interface SchedResult { segs: Seg[]; events: SchedEvent[]; rows: SchedRow[]; avgWait: number; avgTurn: number }

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function simulateSched(procs: Proc[], algo: SchedAlgo, quantum = 2): SchedResult {
  const order = new Map(procs.map((p, i) => [p.name, i]));
  const tie = (a: Proc, b: Proc) => a.arrival - b.arrival || order.get(a.name)! - order.get(b.name)!;
  const left = new Map(procs.map((p) => [p.name, p.burst]));
  const finish = new Map<string, number>();
  const segs: Seg[] = [];
  const events: SchedEvent[] = [];
  const push = (name: string | null, start: number, end: number) => {
    const last = segs.at(-1);
    if (last && last.name === name && last.end === start) last.end = end;
    else segs.push({ name, start, end });
  };
  let t = 0;

  if (algo === 'RR') {
    const queue: Proc[] = [];
    const pending = procs.slice().sort(tie);
    const admit = (until: number) => {
      while (pending.length && pending[0]!.arrival <= until) queue.push(pending.shift()!);
    };
    admit(t);
    while (queue.length || pending.length) {
      if (!queue.length) {
        const next = pending[0]!.arrival;
        push(null, t, next);
        t = next;
        admit(t);
        continue;
      }
      const p = queue.shift()!;
      const run = Math.min(quantum, left.get(p.name)!);
      events.push({ time: t, pick: p.name, queue: [p.name, ...queue.map((x) => x.name)],
        note: `시간 ${t}: 대기열 맨 앞의 ${p.name} 실행 (${run}만큼, 남은 ${left.get(p.name)! - run})` });
      push(p.name, t, t + run);
      t += run;
      left.set(p.name, left.get(p.name)! - run);
      admit(t);   // 실행 중에 도착한 프로세스가 먼저 줄을 선다
      if (left.get(p.name)! > 0) queue.push(p);
      else finish.set(p.name, t);
    }
  } else if (algo === 'SRT') {
    let prev: string | null = null;
    const total = procs.reduce((a, p) => a + p.burst, 0);
    while (finish.size < procs.length && t < 10_000) {
      const ready = procs.filter((p) => p.arrival <= t && left.get(p.name)! > 0);
      if (!ready.length) { push(null, t, t + 1); t++; prev = null; continue; }
      const p = ready.sort((a, b) => left.get(a.name)! - left.get(b.name)! || tie(a, b))[0]!;
      if (p.name !== prev) {
        events.push({ time: t, pick: p.name, queue: ready.map((x) => `${x.name}(${left.get(x.name)})`),
          note: `시간 ${t}: 남은 시간이 가장 짧은 ${p.name}(${left.get(p.name)}) 실행${prev ? ` — ${prev} 선점됨` : ''}` });
      }
      push(p.name, t, t + 1);
      t++;
      left.set(p.name, left.get(p.name)! - 1);
      if (left.get(p.name) === 0) { finish.set(p.name, t); prev = null; } else prev = p.name;
      if (t > total + Math.max(...procs.map((x) => x.arrival)) + 1) break;
    }
  } else {
    while (finish.size < procs.length) {
      const ready = procs.filter((p) => p.arrival <= t && !finish.has(p.name));
      if (!ready.length) {
        const next = Math.min(...procs.filter((p) => !finish.has(p.name)).map((p) => p.arrival));
        push(null, t, next);
        t = next;
        continue;
      }
      let p: Proc;
      let why = '';
      if (algo === 'FCFS') {
        p = ready.sort(tie)[0]!;
        why = '가장 먼저 도착';
      } else if (algo === 'SJF') {
        p = ready.sort((a, b) => a.burst - b.burst || tie(a, b))[0]!;
        why = `실행 시간이 가장 짧음 (${p.burst})`;
      } else if (algo === 'PRIORITY') {
        p = ready.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || tie(a, b))[0]!;
        why = `우선순위가 가장 높음 (${p.priority})`;
      } else {
        const ratio = (x: Proc) => (t - x.arrival + x.burst) / x.burst;
        p = ready.sort((a, b) => ratio(b) - ratio(a) || tie(a, b))[0]!;
        why = `응답률이 가장 높음: ${ready.map((x) => `${x.name}=(${t - x.arrival}+${x.burst})/${x.burst}=${fmt(ratio(x))}`).join(', ')}`;
      }
      events.push({ time: t, pick: p.name, queue: ready.map((x) => x.name), note: `시간 ${t}: 대기 [${ready.map((x) => x.name).join(', ')}] 중 ${p.name} 선택 — ${why}` });
      push(p.name, t, t + p.burst);
      t += p.burst;
      finish.set(p.name, t);
    }
  }

  const rows = procs.map((p) => {
    const f = finish.get(p.name) ?? 0;
    return { name: p.name, arrival: p.arrival, burst: p.burst, finish: f, turnaround: f - p.arrival, waiting: f - p.arrival - p.burst };
  });
  const avg = (k: 'waiting' | 'turnaround') => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  return { segs, events, rows, avgWait: avg('waiting'), avgTurn: avg('turnaround') };
}

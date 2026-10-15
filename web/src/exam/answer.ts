// 정답 계산과 채점.
// 이론 문제의 정답은 시뮬레이터가 계산한다. 문제 데이터에 정답을 따로 적지 않아서 둘이 어긋날 일이 없다.
import type { Problem } from './problems';
import { simulatePaging } from './sims/paging';
import { simulateSched } from './sims/sched';
import { exprTree, fromLevel, toPostfix, traverse, type TNode } from './sims/tree';
import { divide, subnetInfo, toIp } from './sims/subnet';

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

export function preorder(n: TNode | null, out: string[] = []): string[] {
  if (!n) return out;
  out.push(n.v);
  preorder(n.l, out);
  preorder(n.r, out);
  return out;
}

/** 정답 (화면에 보여 줄 모양) */
export function answerOf(p: Problem): string {
  switch (p.kind) {
    case 'code': case 'sql': return p.answer;
    case 'paging': return String(simulatePaging(p.refs, p.frames, p.algo).at(-1)?.faults ?? 0);
    case 'sched': {
      const r = simulateSched(p.procs, p.algo, p.quantum);
      return num(p.ask === 'avgWait' ? r.avgWait : r.avgTurn);
    }
    case 'traverse': return traverse(fromLevel(p.level.split(/\s+/)), p.order).at(-1)?.seq.join(' ') ?? '';
    case 'notation': {
      const post = toPostfix(p.infix).at(-1)?.output ?? [];
      return (p.to === 'post' ? post : preorder(exprTree(post))).join(' ');
    }
    case 'subnet': {
      const s = subnetInfo(p.ip, p.prefix);
      return p.ask === 'hosts' ? String(s.hosts) : toIp(p.ask === 'network' ? s.network : p.ask === 'mask' ? s.mask : s.broadcast);
    }
    case 'subnet-div': {
      const s = divide(p.base, p.prefix, p.count)[p.nth - 1]!;
      return toIp(p.ask === 'network' ? s.network : s.broadcast);
    }
  }
}

/** 입력 안내 */
export function answerHint(p: Problem): string {
  switch (p.kind) {
    case 'code': return '출력 결과를 그대로 쓰세요. 띄어쓰기 차이는 봐줍니다.';
    case 'sql': return '행마다 한 줄, 값은 공백으로 구분하세요.';
    case 'paging': return '숫자만 쓰세요.';
    case 'sched': return '숫자만 쓰세요. 소수는 둘째 자리까지 (예: 4.75)';
    case 'traverse': case 'notation': return '차례대로 쓰세요. 띄어쓰기·쉼표는 상관없습니다 (예: ABC 또는 A B C)';
    default: return 'IP 주소는 점으로 구분해 쓰세요 (예: 192.168.0.1)';
  }
}

const squash = (s: string) => s.replace(/[\s,]+/g, '').replace(/[‘’'"]/g, '').toLowerCase();

/** 채점: 띄어쓰기·줄바꿈·쉼표 차이는 무시하고, 숫자 답은 값으로 비교한다 */
export function isCorrect(p: Problem, input: string): boolean {
  const want = answerOf(p);
  if (!input.trim()) return false;
  if (p.kind === 'sched' || p.kind === 'paging' || (p.kind === 'subnet' && p.ask === 'hosts')) {
    const v = Number(input.trim().replace(/[^\d.-]/g, ''));
    return Number.isFinite(v) && Math.abs(v - Number(want)) < 0.011;
  }
  if (p.kind === 'code' || p.kind === 'sql') {
    // 출력은 줄 단위로: 각 줄의 띄어쓰기 차이만 봐준다
    const lines = (s: string) => s.trim().split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const a = lines(input);
    const b = lines(want);
    if (a.length === b.length && a.every((l, i) => l === b[i])) return true;
    return input.replace(/\s+/g, '') === want.replace(/\s+/g, '');
  }
  return squash(input) === squash(want);
}

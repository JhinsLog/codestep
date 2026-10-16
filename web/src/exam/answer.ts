// 정답 계산과 채점.
// 이론 문제의 정답은 시뮬레이터가 계산한다. 문제 데이터에 정답을 따로 적지 않아서 둘이 어긋날 일이 없다.
// SQL 작성 문제는 쓴 SQL을 실제로 실행해 모범 답안과 결과를 비교한다 (sqlgrade.ts).
import type { Blank, Problem } from './problems';
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

const blankText = (bl: Blank[]) => (bl.length === 1 && !bl[0]!.label
  ? bl[0]!.accept[0]!
  : bl.map((b) => `${b.label} ${b.accept[0]}`).join('\n'));

/** 정답 (화면에 보여 줄 모양) */
export function answerOf(p: Problem): string {
  switch (p.kind) {
    case 'code': case 'sql': case 'sql-write': return p.answer;
    case 'code-blank': case 'short': return blankText(p.blanks);
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

/** 코드 빈칸 문제의 빈칸을 대표 답으로 채운 실행용 코드 */
export function filledCode(p: Problem & { kind: 'code-blank' }, pick: (b: Blank) => string = (b) => b.accept[0]!): string {
  let code = p.code;
  for (const b of p.blanks) code = code.split(b.label).join(pick(b));
  return code;
}

/** 답 칸: 빈칸 문제는 빈칸마다 하나, 나머지는 하나 */
export interface Field { label: string; multiline: boolean; mono: boolean }

export function fieldsOf(p: Problem): Field[] {
  switch (p.kind) {
    case 'code-blank': return p.blanks.map((b) => ({ label: b.label, multiline: false, mono: true }));
    case 'short': return p.blanks.map((b) => ({ label: b.label, multiline: false, mono: false }));
    case 'code': return [{ label: '', multiline: p.answer.includes('\n'), mono: true }];
    case 'sql': return [{ label: '', multiline: !p.count, mono: true }];
    case 'sql-write': return [{ label: '', multiline: true, mono: true }];
    default: return [{ label: '', multiline: false, mono: false }];
  }
}

/** 입력 안내 */
export function answerHint(p: Problem): string {
  switch (p.kind) {
    case 'code': return '출력 결과를 그대로 쓰세요. 띄어쓰기 차이는 봐줍니다.';
    case 'code-blank': return '빈칸에 들어갈 코드를 쓰세요. 빈칸이 여럿이면 하나씩 채점해 부분 점수를 줍니다.';
    case 'sql': return p.count ? '결과 행(튜플)의 개수를 숫자로 쓰세요.' : '행마다 한 줄, 값은 공백으로 구분하세요.';
    case 'sql-write': return 'SQL 문을 쓰세요. 쓴 SQL을 실제로 실행해 모범 답안과 결과가 같으면 정답입니다.';
    case 'short': return p.blanks.length > 1
      ? '칸마다 답을 쓰세요. 한글·영문 어느 쪽이든 인정하고, 칸마다 부분 점수를 줍니다.'
      : '답을 쓰세요. 한글·영문(약어 포함) 어느 쪽이든 인정합니다.';
    case 'paging': return '숫자만 쓰세요.';
    case 'sched': return '숫자만 쓰세요. 소수는 둘째 자리까지 (예: 4.75)';
    case 'traverse': case 'notation': return '차례대로 쓰세요. 띄어쓰기·쉼표는 상관없습니다 (예: ABC 또는 A B C)';
    default: return 'IP 주소는 점으로 구분해 쓰세요 (예: 192.168.0.1)';
  }
}

const squash = (s: string) => s.replace(/[\s,]+/g, '').replace(/[‘’'"]/g, '').toLowerCase();

/** 용어 비교용: 띄어쓰기·기호·대소문자를 지운다 */
export const normTerm = (s: string) => s.toLowerCase().normalize('NFC')
  .replace(/[\s,.·•\-_→⇒>~'"‘’“”`()[\]{}</]/g, '');

/** "~ 패턴", "~ 기법"처럼 붙여도 안 붙여도 되는 꼬리말 */
const TAIL = /(패턴|pattern|기법|방식|공격|attack|프로토콜|protocol)$/;
const same = (a: string, b: string) => a !== '' && (a === b || (a.replace(TAIL, '') === b.replace(TAIL, '') && a.replace(TAIL, '') !== ''));

/** 용어 답 하나가 맞는가. "AJAX(Asynchronous …)"처럼 괄호로 함께 쓴 것도 인정한다 */
export function termMatches(input: string, accept: string[]): boolean {
  const s = input.trim();
  if (!s) return false;
  const tries = [s];
  const m = /^(.*?)\s*[(（](.*)[)）]\s*$/.exec(s);
  if (m) tries.push(m[1]!, m[2]!);
  for (const a of accept) {
    const want = normTerm(a);
    if (/^-?\d+(\.\d+)?$/.test(a.trim())) {
      const v = Number(s.replace(/[^\d.-]/g, ''));
      if (s.replace(/[^\d.-]/g, '') !== '' && Math.abs(v - Number(a)) < 0.011) return true;
      continue;
    }
    if (tries.some((t) => same(normTerm(t), want))) return true;
  }
  return false;
}

/** 코드·SQL 출력 비교: 줄 단위로, 각 줄의 띄어쓰기 차이만 봐준다 */
export function sameOutput(input: string, want: string): boolean {
  const lines = (s: string) => s.trim().split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
  const a = lines(input);
  const b = lines(want);
  if (a.length === b.length && a.every((l, i) => l === b[i])) return true;
  return input.replace(/\s+/g, '') === want.replace(/\s+/g, '');
}

/** 동기 채점 (SQL 작성 문제 말고 전부). 0~1 점수: 빈칸 문제는 맞힌 칸의 비율 */
export function scoreSync(p: Problem, inputs: string[]): number {
  const one = inputs[0] ?? '';
  switch (p.kind) {
    case 'code': case 'sql': return one.trim() && sameOutput(one, p.answer) ? 1 : 0;
    case 'code-blank': {
      const ok = p.blanks.filter((b, i) => {
        const v = (inputs[i] ?? '').trim();
        return v && b.accept.some((a) => v.replace(/\s+/g, '') === a.replace(/\s+/g, ''));
      }).length;
      return ok / p.blanks.length;
    }
    case 'short': {
      const ok = p.blanks.filter((b, i) => termMatches(inputs[i] ?? '', b.accept)).length;
      return ok / p.blanks.length;
    }
    case 'sql-write': return 0;
    default: {
      if (!one.trim()) return 0;
      const want = answerOf(p);
      if (p.kind === 'sched' || p.kind === 'paging' || (p.kind === 'subnet' && p.ask === 'hosts')) {
        const v = Number(one.trim().replace(/[^\d.-]/g, ''));
        return Number.isFinite(v) && Math.abs(v - Number(want)) < 0.011 ? 1 : 0;
      }
      return squash(one) === squash(want) ? 1 : 0;
    }
  }
}

/** 채점 (0~1). SQL 작성 문제는 실행이 필요해서 비동기다 */
export async function score(p: Problem, inputs: string[]): Promise<number> {
  if (p.kind !== 'sql-write') return scoreSync(p, inputs);
  const { sameSqlResult } = await import('./sqlgrade');
  return (await sameSqlResult(p, inputs[0] ?? '')) ? 1 : 0;
}

/** 예전 방식 호환: 맞았는가 */
export const isCorrect = (p: Problem, input: string): boolean => scoreSync(p, [input]) === 1;

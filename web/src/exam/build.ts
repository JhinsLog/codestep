// 회차 문제를 짧게 적기 위한 도우미. id와 문항 번호는 round()가 붙인다.
import type { Blank, Category, Problem, Round, Table } from './problems';

type Draft = Problem extends infer P ? (P extends Problem ? Omit<P, 'id'> : never) : never;
type Opt = { trend?: boolean };

export const OUT = '다음 프로그램의 실행 결과를 쓰시오.';

/** 용어 하나를 쓰는 단답. accept의 첫 번째가 대표 답이다 */
export function term(cat: Category, title: string, question: string, accept: string | string[], explain: string,
  extra: { options?: string[]; tables?: Table[]; pre?: string } & Opt = {}): Draft {
  return { kind: 'short', cat, title, question, blanks: [{ label: '', accept: [accept].flat() }], explain, ...extra };
}

/** 빈칸 여러 개: [['①', '답', '다른 표기' …], …] */
export function blanks(cat: Category, title: string, question: string, list: string[][], explain: string,
  extra: { options?: string[]; tables?: Table[]; pre?: string } & Opt = {}): Draft {
  const bl: Blank[] = list.map(([label, ...accept]) => ({ label: label!, accept }));
  return { kind: 'short', cat, title, question, blanks: bl, explain, ...extra };
}

/** 코드 실행 결과 쓰기 */
export function out(lang: 'c' | 'java' | 'python', title: string, code: string, answer: string, explain: string,
  extra: { question?: string } & Opt = {}): Draft {
  const { question = OUT, ...rest } = extra;
  return { kind: 'code', cat: lang, lang, title, question, code, answer, explain, ...rest };
}

/** 코드 빈칸 채우기: code 안의 빈칸 표시(①, ② …)를 채우면 output이 나온다 */
export function fill(lang: 'c' | 'java' | 'python', title: string, question: string, code: string, list: string[][],
  output: string, explain: string, extra: Opt = {}): Draft {
  const bl: Blank[] = list.map(([label, ...accept]) => ({ label: label!, accept }));
  return { kind: 'code-blank', cat: lang, lang, title, question, code, blanks: bl, out: output, explain, ...extra };
}

/** SQL 실행 결과 쓰기 */
export function sqlOut(title: string, question: string, setup: string, query: string, answer: string, explain: string,
  extra: { count?: boolean; before?: string } & Opt = {}): Draft {
  return { kind: 'sql', cat: 'sql', title, question, setup, query, answer, explain, ...extra };
}

/** SQL 작성: 실제로 실행해 모범 답안과 결과를 비교한다 */
export function sqlWrite(title: string, question: string, setup: string, answer: string, explain: string,
  extra: { check?: string } & Opt = {}): Draft {
  return { kind: 'sql-write', cat: 'sql', title, question, setup, answer, explain, ...extra };
}

/** 여러 개를 고르는 보기 문제의 답: 어떤 순서로 써도 인정한다 (['ㄱ', 'ㄷ'] → 'ㄱ, ㄷ', 'ㄷ, ㄱ') */
export function anyOrder(items: string[]): string[] {
  if (items.length <= 1) return items;
  return items.flatMap((x, i) => anyOrder(items.filter((_, j) => j !== i)).map((rest) => `${x}, ${rest}`));
}

/** 그 밖의 유형(시뮬레이터 문제 등)은 그대로 */
export const raw = (d: Draft): Draft => d;

export function round(id: string, meta: Omit<Round, 'id' | 'label' | 'problems'>, list: Draft[]): Round {
  const [year, no] = id.split('-');
  const problems = list.map((d, i) => ({ ...d, id: `r${id}-${String(i + 1).padStart(2, '0')}`, round: id, no: i + 1 }) as Problem);
  return { id, label: `${year}년 ${no}회`, ...meta, problems };
}

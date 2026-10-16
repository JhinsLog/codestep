// 개념 목록과, 문제 글에서 관련 개념을 찾는 규칙
import type { Category, Problem } from '../../exam/problems';
import { answerOf } from '../../exam/answer';
import { NET } from './net';
import { DB } from './db';
import { DESIGN } from './design';
import { DEV } from './dev';
import { OS } from './os';
import { SEC } from './sec';
import { LANG } from './lang';
import type { Concept } from './types';

export type { Concept };
export const CONCEPTS: Concept[] = [...NET, ...DB, ...DESIGN, ...DEV, ...OS, ...SEC, ...LANG];
export const conceptById = (id: string) => CONCEPTS.find((c) => c.id === id);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 영문 약어는 앞뒤가 영문·숫자가 아닐 때만 맞는 것으로 친다 (UI가 GUI에 걸리지 않게) */
const MATCHERS = new Map(CONCEPTS.map((c) => [c.id, c.match.map((k) => (/^[\x20-\x7e]+$/.test(k)
  ? { k, re: new RegExp(`(?<![A-Za-z0-9])${esc(k)}(?![A-Za-z0-9])`, 'i') }
  : { k, re: null as RegExp | null }))]));

function textOf(p: Problem): { head: string; all: string } {
  const parts = [p.question];
  if (p.kind === 'short') {
    if (p.pre) parts.push(p.pre);
    if (p.options) parts.push(p.options.join(' '));
    for (const t of p.tables ?? []) parts.push(t.cols.join(' '));
  }
  if (p.kind === 'code' || p.kind === 'code-blank') parts.push(p.code);
  if (p.kind === 'sql') parts.push(p.query, p.before ?? '');
  if (p.kind === 'sql-write') parts.push(p.answer);
  parts.push(answerOf(p));
  return { head: p.title, all: parts.join('\n') };
}

const KIND_CONCEPT: Partial<Record<Problem['kind'], string>> = { paging: 'paging', sched: 'sched', subnet: 'ipaddr', 'subnet-div': 'ipaddr', traverse: 'tree', notation: 'tree' };

/** 문제와 관련 있는 개념 (점수가 높은 순, 최대 max개) */
export function conceptsFor(p: Problem, max = 3): Concept[] {
  const { head, all } = textOf(p);
  const scored: { c: Concept; s: number }[] = [];
  for (const c of CONCEPTS) {
    let s = 0;
    for (const { k, re } of MATCHERS.get(c.id)!) {
      const hit = (t: string) => (re ? re.test(t) : t.includes(k));
      if (hit(head)) s += 3;
      else if (hit(all)) s += 1;
    }
    if (KIND_CONCEPT[p.kind] === c.id) s += 10;
    if (s > 0 && c.cat === p.cat) s += 1;
    if (s > 0) scored.push({ c, s });
  }
  scored.sort((a, b) => b.s - a.s);
  // 낱말 하나만 스치듯 걸린 개념은 뺀다 (가장 잘 맞는 개념의 절반 이상만)
  const top = scored[0]?.s ?? 0;
  return scored.filter((x, i) => i === 0 || x.s * 2 >= top).slice(0, max).map((x) => x.c);
}

/** 개념별 관련 문제 (개념 페이지용) */
let cache: Map<string, Problem[]> | null = null;
export function problemsOf(all: Problem[]): Map<string, Problem[]> {
  if (cache) return cache;
  cache = new Map(CONCEPTS.map((c) => [c.id, []]));
  for (const p of all) for (const c of conceptsFor(p, 2)) cache.get(c.id)!.push(p);
  return cache;
}

export const CAT_ORDER: Category[] = ['net', 'db', 'sql', 'ds', 'design', 'dev', 'os', 'sec', 'c', 'java', 'python'];

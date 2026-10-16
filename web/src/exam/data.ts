// 정보처리기사 모드의 모든 문제: 유형별 연습 문제 + 회차별 모의고사 문제
import { CATEGORIES, PROBLEMS, type Category, type Problem, type Round } from './problems';
import { ROUNDS } from './rounds';

export { CATEGORIES, ROUNDS };

export const ALL: Problem[] = [...PROBLEMS, ...ROUNDS.flatMap((r) => r.problems)];

const index = new Map(ALL.map((p) => [p.id, p]));
export const byId = (id: string): Problem | undefined => index.get(id);
export const roundById = (id: string): Round | undefined => ROUNDS.find((r) => r.id === id);

/** 유형별 연습 목록: 그 유형의 연습 문제, 이어서 회차 문제(최근 회차부터) */
export const listOf = (cat: Category): Problem[] => ALL.filter((p) => p.cat === cat);

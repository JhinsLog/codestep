import type { Category } from '../../exam/problems';
import type { Viz } from '../core';

/** 개념 하나: 문제를 풀 때 옆에 띄우는 기초 지식 그림 */
export interface Concept {
  id: string;
  name: string;
  en?: string;
  cat: Category;
  summary: string;     // 한두 문장 요약
  match: string[];     // 문제 글에서 찾을 낱말 (영문 약어는 단어 단위로 찾는다)
  make: () => Viz;
}

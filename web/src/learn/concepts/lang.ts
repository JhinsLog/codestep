// 프로그래밍 언어 기초: 코드 문제를 풀 때 옆에서 확인하는 문법 그림
import { board } from '../templates/board';
import { fields } from '../templates/fields';
import { stack } from '../core';
import type { Concept } from './types';

export const LANG: Concept[] = [
  {
    id: 'cpointer', name: 'C 포인터 연산', en: '*p++ · *++p · ++*p · %s · %c', cat: 'c',
    summary: '* 와 ++가 함께 있으면 후위 ++가 먼저 묶인다. *p++는 값을 쓰고 p를 옮기고, ++*p는 값 자체를 1 올린다. %s는 주소부터 끝까지, %c는 글자 하나.',
    match: ['포인터', '*p++', '*++p', '++*p', '%s', '%c', '->', '&', 'malloc', '이중 포인터', '배열 포인터'],
    make: () => stack([
      fields({ title: 'int a[] = {10, 20, 30}; int *p = a; 일 때', en: '칸을 누르면 결과와 뒤의 p 위치를 설명합니다', rows: [
        { label: '식', fields: [
          { name: '*p++', text: '*p++', desc: '= *(p++) : 지금 값 10을 쓰고, p는 a[1]로 옮긴다 (값은 그대로)', hue: 210 },
          { name: '*++p', text: '*++p', desc: '= *(++p) : p를 먼저 a[1]로 옮기고 그 값 20을 쓴다', hue: 150 },
          { name: '++*p', text: '++*p', desc: '= ++(*p) : p는 그대로, a[0] 자체가 11이 되고 11을 쓴다', hue: 30 },
          { name: '(*p)++', text: '(*p)++', desc: 'a[0]의 지금 값 10을 쓰고, 그 뒤 a[0]이 11이 된다', hue: 0 },
          { name: '*(p+2)', text: '*(p+2)', desc: 'p는 그대로, 두 칸 뒤의 값 30 (= p[2])', hue: 280 }] },
      ], note: '우선순위: 후위 ++ -- > 단항 * & ++ -- (오른쪽부터) > 산술. 구조체 포인터 p->x 는 (*p).x' })(),
      board({ title: '헷갈리는 짝', groups: [
        { name: '출력 형식', hue: 210, items: [{ name: '%s', desc: '주소를 받아 NUL(\\0) 전까지 문자열 전체' }, { name: '%c', desc: '글자(값) 하나. *p, p[0]' }, { name: '%d · %x · %u', desc: '10진 정수 · 16진수 · 부호 없는 정수' }, { name: '%.2f', desc: '소수 둘째 자리 (반올림)' }] },
        { name: '배열과 포인터', hue: 30, items: [{ name: 'a[i] = *(a + i)', desc: '배열 이름은 첫 원소의 주소처럼 쓰인다' }, { name: 'sizeof(a)', desc: '배열이면 전체 바이트, 포인터면 주소 크기(8)' }, { name: 'p - q', desc: '두 포인터 사이의 "원소 개수"' }] },
        { name: '함수에 넘길 때', hue: 140, items: [{ name: '값 전달 f(x)', desc: '복사본이라 함수 안에서 바꿔도 원본은 그대로' }, { name: '주소 전달 f(&x)', desc: '*p로 원본을 바꾼다' }, { name: '배열 f(arr)', desc: '시작 주소가 넘어가 원본이 바뀐다' }, { name: '이중 포인터 f(&p)', desc: '포인터 변수 자체를 바꿀 때' }] },
      ], quiz: false })(),
    ]),
  },
  {
    id: 'pycollections', name: 'Python 자료형과 슬라이싱', en: 'list · set · dict · slicing', cat: 'python',
    summary: '슬라이싱 a[시작:끝:간격]은 끝을 포함하지 않는다. 리스트는 순서가 있고 바뀌며, 집합은 중복이 없고, 딕셔너리는 넣은 순서를 지킨다.',
    match: ['리스트', '슬라이싱', 'append', 'extend', 'pop', 'reverse', 'set', 'dict', '딕셔너리', '집합', 'enumerate', 'lambda', 'split', 'join'],
    make: () => stack([
      fields({ title: 's = "PYTHON" 의 인덱스', en: '칸을 눌러 보세요', rows: [
        { label: '양수', fields: [...'PYTHON'].map((ch, i) => ({ name: `s[${i}] = '${ch}'`, text: `${ch} ${i}`, desc: `앞에서 ${i}번째. 뒤에서 세면 s[${i - 6}]`, hue: 200 + i * 15 })) },
        { label: '음수', fields: [...'PYTHON'].map((ch, i) => ({ name: `s[${i - 6}] = '${ch}'`, text: `${i - 6}`, desc: `뒤에서 ${6 - i}번째`, hue: 200 + i * 15 })) },
        { label: '예', fields: [
          { name: 's[1:4]', text: "s[1:4] → 'YTH'", w: 2, desc: '1, 2, 3번 (끝 4는 포함하지 않는다)', hue: 140 },
          { name: 's[::-1]', text: "s[::-1] → 'NOHTYP'", w: 2, desc: '간격 -1: 뒤집기', hue: 30 },
          { name: 's[::2]', text: "s[::2] → 'PTO'", w: 2, desc: '0, 2, 4번', hue: 280 }] },
      ] })(),
      board({ title: '자료형별 주요 메서드', groups: [
        { name: '리스트 list [ ]', hue: 210, items: [{ name: 'append(x)', desc: '끝에 하나 추가' }, { name: 'extend(리스트)', desc: '여러 개를 이어 붙임' }, { name: 'insert(i, x)', desc: 'i번 자리에 끼워 넣기' }, { name: 'pop(i)', desc: 'i번(생략하면 마지막)을 꺼내 돌려주고 삭제' }, { name: 'remove(x)', desc: '값이 x인 첫 원소 삭제' }, { name: 'reverse() · sort()', desc: '제자리에서 뒤집기 · 정렬 (None을 돌려줌)' }] },
        { name: '집합 set { }', hue: 140, items: [{ name: 'add · update', desc: '하나 추가 · 여러 개 추가 (중복은 무시)' }, { name: 'remove · discard', desc: '없으면 KeyError · 없어도 괜찮음' }, { name: '& | - ^', desc: '교집합 · 합집합 · 차집합 · 대칭차' }] },
        { name: '딕셔너리 dict {k: v}', hue: 30, items: [{ name: 'd[k] = v', desc: '같은 키면 값을 덮어쓴다 (키 순서는 처음 넣은 순서)' }, { name: 'get(k, 기본값)', desc: '키가 없으면 기본값' }, { name: 'items() · keys() · values()' }] },
        { name: '얕은 복사', hue: 0, items: [{ name: 'b = a', desc: '같은 객체를 함께 가리킨다' }, { name: 'b = a[:]', desc: '바깥만 새로, 안쪽 리스트는 공유' }, { name: 'copy.deepcopy(a)', desc: '안쪽까지 모두 새로' }] },
      ], quiz: false })(),
    ]),
  },
  {
    id: 'protocol', name: '프로토콜', en: 'Protocol: Syntax · Semantics · Timing', cat: 'net',
    summary: '통신하는 양쪽이 무엇을(구문), 어떤 뜻으로(의미), 언제(타이밍) 주고받을지 미리 정한 약속이다.',
    match: ['프로토콜', '통신 규약', '구문', '타이밍', 'Syntax', 'Semantics'],
    make: board({ title: '프로토콜의 기본 요소와 기능', groups: [
      { name: '기본 요소', hue: 210, items: [{ name: '구문', en: 'Syntax', desc: '데이터 형식, 부호화, 신호 레벨 — "무엇을"' }, { name: '의미', en: 'Semantics', desc: '제어 정보, 오류 관리 — "어떤 뜻으로"' }, { name: '타이밍', en: 'Timing', desc: '속도 맞춤, 순서 제어 — "언제"' }] },
      { name: '기능', hue: 30, items: [{ name: '단편화와 재조립' }, { name: '캡슐화' }, { name: '흐름 제어' }, { name: '오류 제어' }, { name: '동기화' }, { name: '순서 제어' }, { name: '주소 지정' }, { name: '다중화' }, { name: '경로 제어' }] },
    ], quiz: false }),
  },
];

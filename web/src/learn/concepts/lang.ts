// 프로그래밍 언어 기초: 코드 문제를 풀 때 옆에서 확인하는 문법 그림
import { board } from '../three/adapt';
import { stack } from '../core';
import { protocolLab } from '../three/protocolLab';
import { pointerLab, pythonLab } from '../three/langLabs';
import type { Concept } from './types';

export const LANG: Concept[] = [
  {
    id: 'cpointer', name: 'C 포인터 연산', en: '*p++ · *++p · ++*p · %s · %c', cat: 'c',
    summary: '* 와 ++가 함께 있으면 후위 ++가 먼저 묶인다. *p++는 값을 쓰고 p를 옮기고, ++*p는 값 자체를 1 올린다. %s는 주소부터 끝까지, %c는 글자 하나.',
    match: ['포인터', '*p++', '*++p', '++*p', '%s', '%c', '->', '&', 'malloc', '이중 포인터', '배열 포인터'],
    make: () => stack([
      pointerLab(),
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
      pythonLab(),
      board({ title: '자료형별 주요 메서드', groups: [
        { name: '리스트 list [ ]', hue: 210, items: [{ name: 'append(x)', desc: '끝에 하나 추가' }, { name: 'extend(리스트)', desc: '여러 개를 이어 붙임' }, { name: 'insert(i, x)', desc: 'i번 자리에 끼워 넣기' }, { name: 'pop(i)', desc: 'i번(생략하면 마지막)을 꺼내 돌려주고 삭제' }, { name: 'remove(x)', desc: '값이 x인 첫 원소 삭제' }, { name: 'reverse() · sort()', desc: '제자리에서 뒤집기 · 정렬 (None을 돌려줌)' }] },
        { name: '집합 set { }', hue: 140, items: [{ name: 'add · update', desc: '하나 추가 · 여러 개 추가 (중복은 무시)' }, { name: 'remove · discard', desc: '없으면 KeyError · 없어도 괜찮음' }, { name: '& | - ^', desc: '교집합 · 합집합 · 차집합 · 대칭차' }] },
        { name: '딕셔너리 dict {k: v}', hue: 30, items: [{ name: 'd[k] = v', desc: '같은 키면 값을 덮어쓴다 (키 순서는 처음 넣은 순서)' }, { name: 'get(k, 기본값)', desc: '키가 없으면 기본값' }, { name: 'items() · keys() · values()', desc: '딕셔너리의 (키, 값) 쌍 / 키 목록 / 값 목록을 돌려준다. for k, v in d.items():' }] },
        { name: '얕은 복사', hue: 0, items: [{ name: 'b = a', desc: '같은 객체를 함께 가리킨다' }, { name: 'b = a[:]', desc: '바깥만 새로, 안쪽 리스트는 공유' }, { name: 'copy.deepcopy(a)', desc: '안쪽까지 모두 새로' }] },
      ], quiz: false })(),
    ]),
  },
  {
    id: 'protocol', name: '프로토콜', en: 'Protocol: Syntax · Semantics · Timing', cat: 'net',
    summary: '통신하는 양쪽이 무엇을(구문), 어떤 뜻으로(의미), 언제(타이밍) 주고받을지 미리 정한 약속이다.',
    match: ['프로토콜', '통신 규약', '구문', '타이밍', 'Syntax', 'Semantics'],
    make: () => stack([protocolLab(), board({ title: '프로토콜의 기본 요소와 기능', groups: [
      { name: '기본 요소', hue: 210, items: [{ name: '구문', en: 'Syntax', desc: '데이터 형식, 부호화, 신호 레벨 — "무엇을"' }, { name: '의미', en: 'Semantics', desc: '제어 정보, 오류 관리 — "어떤 뜻으로"' }, { name: '타이밍', en: 'Timing', desc: '속도 맞춤, 순서 제어 — "언제"' }] },
      { name: '기능', hue: 30, items: [{ name: '단편화와 재조립', desc: '큰 데이터를 망이 실을 수 있는 크기로 나눠 보내고(단편화) 받는 쪽에서 다시 합친다(재조립)' }, { name: '캡슐화', desc: '데이터에 주소·제어 정보(헤더)를 덧붙여 봉투에 넣듯 감싼다. 받는 쪽은 헤더를 벗긴다' }, { name: '흐름 제어', desc: '받는 쪽이 감당할 수 있는 만큼만 보내도록 양·속도를 조절한다 (슬라이딩 윈도우)' }, { name: '오류 제어', desc: '전송 중 생긴 오류를 검출(CRC·패리티)하고 재전송(ARQ)이나 정정(해밍)으로 바로잡는다' }, { name: '동기화', desc: '송수신 측의 시작 시점·비트 박자·상태를 서로 맞춘다 (동기 신호, 플래그, handshake)' }, { name: '순서 제어', desc: '패킷에 순서 번호를 붙여 뒤섞여 도착해도 원래 순서로 정렬한다' }, { name: '주소 지정', desc: '출발지·목적지 주소(MAC, IP, 포트)를 붙여 정확한 상대에게 전달한다' }, { name: '다중화', desc: '여러 통신이 하나의 회선을 나눠 쓴다 (시분할 TDM, 주파수 분할 FDM)' }, { name: '경로 제어', desc: '여러 경로 중 가장 좋은 경로를 골라 보낸다 (라우팅)' }] },
    ], quiz: false })()]),
  },
];

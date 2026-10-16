// 소프트웨어 개발·테스트 개념
import { board } from '../three/adapt';
import { fields } from '../three/adapt';
import { graph } from '../three/adapt';
import { ladder } from '../three/adapt';
import { stack, tabs } from '../core';
import { coverage, integration, vModel } from '../custom/misc';
import type { Concept } from './types';

export const DEV: Concept[] = [
  {
    id: 'testlevels', name: '테스트 단계', en: 'V-Model · Unit · Integration · System · Acceptance', cat: 'dev',
    summary: '단위 → 통합 → 시스템 → 인수 테스트. 통합할 때 하향식은 스텁(가짜 하위), 상향식은 드라이버(가짜 상위)를 쓴다.',
    match: ['V-모델', 'V 모델', '단위 테스트', '통합 테스트', '시스템 테스트', '인수 테스트', '알파', '베타', '상향식', '하향식', '스텁', '드라이버', '클러스터', '빅뱅', 'Stub', 'Driver'],
    make: () => tabs([{ name: '스텁과 드라이버', make: integration }, { name: 'V-모델', make: vModel }, { name: '인수 테스트', make: board({ title: '인수 테스트의 종류', groups: [
      { name: '알파 테스트', en: 'Alpha Test', hue: 210, items: [{ name: '개발자의 장소', desc: '사용자가 시험하고, 개발자가 옆에서 지켜보며 기록한다 (통제된 환경)' }] },
      { name: '베타 테스트', en: 'Beta Test', hue: 30, items: [{ name: '사용자의 실제 환경', desc: '개발자 없이 실제 사용자가 써 보고 문제를 보고한다' }] },
      { name: '그 밖의 인수 테스트', hue: 140, items: [{ name: '사용자 인수' }, { name: '운영상 인수' }, { name: '계약 인수' }, { name: '규정 인수' }] },
    ], quiz: false }) }]),
  },
  {
    id: 'blackbox', name: '블랙박스와 화이트박스 테스트', en: 'Black-box · White-box Testing', cat: 'dev',
    summary: '블랙박스는 명세(입력·출력)만 보고, 화이트박스는 코드 내부 구조를 보고 테스트한다. 동등 분할은 대표값, 경계값 분석은 경계 근처 값을 고른다.',
    match: ['블랙박스', '화이트박스', '동등 분할', '동치', '경계값', '원인-결과', '오류 예측', '비교 검사', 'Equivalence', 'Boundary', '기초 경로', '명세 기반'],
    make: () => stack([
      fields({ title: '점수 0~100, 60점 이상 합격 — 무엇을 넣어 볼까?', en: '동등 분할 vs 경계값 분석', rows: [
        { label: '입력 범위', fields: [{ name: '무효 (0 미만)', text: '… -1', desc: '무효 동치 클래스', hue: 0 }, { name: '불합격 (0~59)', text: '0 ~ 59', w: 3, desc: '유효 동치 클래스 ①', hue: 30 }, { name: '합격 (60~100)', text: '60 ~ 100', w: 2.5, desc: '유효 동치 클래스 ②', hue: 140 }, { name: '무효 (100 초과)', text: '101 …', desc: '무효 동치 클래스', hue: 0 }] },
        { label: '동등 분할', fields: [{ name: '동등 분할: -5', text: '-5', desc: '그룹마다 대표값 하나', hue: 0 }, { name: '동등 분할: 30', text: '30', w: 3, desc: '대표값', hue: 30 }, { name: '동등 분할: 80', text: '80', w: 2.5, desc: '대표값', hue: 140 }, { name: '동등 분할: 150', text: '150', desc: '대표값', hue: 0 }] },
        { label: '경계값 분석', fields: [{ name: '경계값: -1, 0', text: '-1 | 0', w: 1.5, desc: '아래 경계 바로 밖과 경계', hue: 0 }, { name: '경계값: 59, 60', text: '59 | 60', w: 3, desc: '합격 경계 양쪽 — < 와 <= 실수를 잡는다', hue: 40 }, { name: '경계값: 100, 101', text: '100 | 101', w: 2, desc: '위 경계와 바로 밖', hue: 0 }] },
      ], note: '칸을 눌러 보세요. 동등 분할은 그룹의 "대표값", 경계값 분석은 그룹의 "끝" 근처 값을 고른다.' })(),
      board({ title: '테스트 기법 분류', en: '섞어서 분류 연습을 해 보세요', groups: [
        { name: '블랙박스', en: 'Black-box (명세 기반)', hue: 0, desc: '내부를 모른 채 입력과 출력만 본다', items: [
          { name: '동등 분할', en: 'Equivalence Partitioning', desc: '같은 결과를 내는 그룹의 대표값' }, { name: '경계값 분석', en: 'Boundary Value Analysis', desc: '경계와 그 양옆' },
          { name: '원인-결과 그래프', en: 'Cause-Effect Graph', desc: '입력 조건 조합을 그래프·결정 테이블로' }, { name: '오류 예측', en: 'Error Guessing', desc: '경험과 감으로' },
          { name: '비교 검사', en: 'Comparison Testing', desc: '여러 버전에 같은 입력을 넣어 비교' }] },
        { name: '화이트박스', en: 'White-box (구조 기반)', hue: 210, desc: '코드의 논리 구조를 보고 경로를 시험한다', items: [
          { name: '기초 경로 검사', en: 'Basis Path', desc: '순환 복잡도만큼의 독립 경로' }, { name: '조건 검사', en: 'Condition Testing', desc: '조건식' },
          { name: '루프 검사', en: 'Loop Testing', desc: '반복문' }, { name: '데이터 흐름 검사', en: 'Data Flow Testing', desc: '변수의 정의와 사용' },
          { name: '구문·결정·조건 커버리지', desc: '얼마나 덮었는지의 기준' }] },
      ] })(),
    ]),
  },
  {
    id: 'coverage', name: '커버리지', en: 'Statement · Decision · Condition · MC/DC', cat: 'dev',
    summary: '구문(모든 문장) < 결정(결정 전체 참·거짓) < 조건/결정 < MC/DC < 다중 조건(모든 조합). 직접 케이스를 켜고 꺼 보세요.',
    match: ['커버리지', 'Coverage', 'MC/DC', '구문 커버리지', '결정 커버리지', '조건 커버리지', '분기 커버리지', '문장 커버리지'],
    make: () => stack([coverage(), ladder({ title: '커버리지 강도', top: '약함', bottom: '강함', shape: 'stairs', hue: [200, 0], items: [
      { name: '구문 커버리지', en: 'Statement', desc: '모든 문장을 한 번 이상 실행' },
      { name: '결정 커버리지', en: 'Decision · Branch', desc: '모든 결정(분기)이 참·거짓을 한 번 이상' },
      { name: '조건/결정 커버리지', en: 'Condition/Decision', desc: '결정 전체와 개별 조건이 모두 참·거짓을 한 번 이상' },
      { name: '변경 조건/결정 커버리지', en: 'MC/DC', desc: '각 조건이 다른 조건과 무관하게 결과에 영향을 주는지' },
      { name: '다중 조건 커버리지', en: 'Multiple Condition', desc: '조건의 모든 조합' },
    ], note: '조건 커버리지는 결정 커버리지를 보장하지 않아서 이 사다리에 끼지 않는다.' })()]),
  },
  {
    id: 'testbasics', name: '테스트 원리와 도구', en: 'Testing Principles · Oracle · Harness', cat: 'dev',
    summary: '살충제 패러독스, 결함 집중, 오류-부재의 궤변 같은 원리와 테스트 오라클·하네스·케이스의 구성.',
    match: ['오라클', '살충제', '테스트 케이스', '하네스', '회귀 테스트', '테스트 원리', '결함 집중', '슈트', '목 오브젝트', '회복 테스트', '오류-부재', '파레토', '강도 테스트'],
    make: () => tabs([
      { name: '테스트 원리', make: board({ title: '소프트웨어 테스트 원리', groups: [{ name: '원리', hue: 200, items: [
        { name: '결함 집중', en: '파레토 법칙', desc: '결함의 80%는 20%의 모듈에 몰려 있다' },
        { name: '살충제 패러독스', en: 'Pesticide Paradox', desc: '같은 테스트만 반복하면 새 결함을 못 찾는다 → 케이스를 주기적으로 개선' },
        { name: '오류-부재의 궤변', desc: '결함이 없어도 요구사항을 못 맞추면 품질이 높다고 할 수 없다' },
        { name: '완벽한 테스트는 불가능', desc: '모든 경우를 다 시험할 수 없다' },
        { name: '조기 테스트', desc: '일찍 시작할수록 비용이 적다' },
        { name: '정황 의존', desc: '상황(분야)에 따라 테스트 방법이 다르다' }] }], quiz: false }) },
      { name: '오라클', make: board({ title: '테스트 오라클 — 정답을 아는 기준', groups: [{ name: '종류', hue: 30, items: [
        { name: '참 오라클', en: 'True', desc: '모든 입력에 기대 결과를 제공' }, { name: '샘플링 오라클', en: 'Sampling', desc: '특정 몇 개의 입력에 대해서만' },
        { name: '추정 오라클', en: 'Heuristic', desc: '특정 입력은 정확히, 나머지는 추정' }, { name: '일관성 검사 오라클', en: 'Consistent', desc: '변경 전후 결과가 같은지' }] }], quiz: false }) },
      { name: '케이스·하네스', make: board({ title: '테스트 케이스와 하네스', groups: [
        { name: '테스트 케이스', hue: 140, desc: 'IEEE 829', items: [{ name: '식별자' }, { name: '테스트 항목' }, { name: '테스트 조건', desc: '실행 전 갖춰야 할 상태' }, { name: '테스트 데이터', desc: '넣을 입력값' }, { name: '예상 결과', desc: '나와야 하는 출력' }] },
        { name: '테스트 하네스', hue: 280, items: [{ name: '테스트 드라이버', desc: '하위 모듈을 호출하는 상위 흉내' }, { name: '테스트 스텁', desc: '호출되는 하위 흉내' }, { name: '테스트 슈트', en: 'Suite', desc: '케이스들의 묶음' }, { name: '테스트 스크립트', desc: '실행 절차' }, { name: '목 오브젝트', en: 'Mock Object', desc: '정해진 행동을 하는 가짜 객체' }] },
        { name: '목적별 테스트', hue: 0, items: [{ name: '회귀 테스트', en: 'Regression', desc: '수정 후 새 오류가 생기지 않았는지' }, { name: '회복 테스트', desc: '고장을 내고 복구되는지' }, { name: '안전 테스트', desc: '보안' }, { name: '강도 테스트', en: 'Stress', desc: '과부하' }, { name: '성능 테스트', desc: '응답 시간·처리량' }, { name: '병행 테스트', desc: '새 시스템과 기존 시스템에 같은 데이터' }] },
      ] }) },
    ]),
  },
  {
    id: 'scm', name: '형상 관리', en: 'Software Configuration Management', cat: 'dev',
    summary: '소스·문서의 변경을 식별 → 통제 → 감사 → 기록한다. 도구는 Git(분산), SVN·CVS(중앙 집중).',
    match: ['형상', '버전 관리', 'Git', 'SVN', 'CVS', '형상 통제', '베이스라인', '기준선'],
    make: () => stack([
      ladder({ title: '형상 관리 절차', top: '먼저', bottom: '나중', shape: 'stairs', hue: [200, 120], items: [
        { name: '형상 식별', desc: '관리할 대상(소스, 문서)을 정하고 이름·번호를 붙인다' },
        { name: '형상 통제', desc: '변경 요청을 검토·승인해 기준선(베이스라인)에 반영한다 (형상 통제 위원회)' },
        { name: '형상 감사', desc: '기준선 변경이 제대로 되었는지 검증한다' },
        { name: '형상 기록', desc: '변경 결과를 기록하고 보고한다 (상태 보고)' },
      ] })(),
      board({ title: '버전 관리 도구', groups: [
        { name: '공유 폴더', hue: 40, items: [{ name: 'RCS' }, { name: 'SCCS' }] },
        { name: '클라이언트/서버', hue: 210, desc: '중앙 저장소 하나', items: [{ name: 'CVS' }, { name: 'SVN', en: 'Subversion' }] },
        { name: '분산 저장소', hue: 140, desc: '각자 전체 저장소 사본', items: [{ name: 'Git' }, { name: 'Mercurial' }] },
      ], quiz: false })(),
    ]),
  },
  {
    id: 'eai', name: 'EAI 구축 유형', en: 'Enterprise Application Integration', cat: 'dev',
    summary: 'Point-to-Point(1:1 직접), Hub & Spoke(중앙 허브), Message Bus(미들웨어 버스), Hybrid(그룹 안 허브, 그룹 사이 버스).',
    match: ['EAI', 'ESB', 'Point-to-Point', 'Hub', 'Message Bus', 'Hybrid', '시스템 통합', '애플리케이션 통합'],
    make: graph({ title: 'EAI 구축 유형', en: '애플리케이션들을 어떻게 연결하나', w: 640, h: 300,
      nodes: [{ id: 'A', name: '인사', x: 100, y: 60 }, { id: 'B', name: '회계', x: 540, y: 60 }, { id: 'C', name: '영업', x: 100, y: 240 }, { id: 'D', name: '생산', x: 540, y: 240 }, { id: 'H', name: '허브', en: 'Hub', x: 320, y: 150, kind: 'cloud' }],
      edges: [],
      scenarios: [
        { name: 'Point-to-Point', desc: '미들웨어 없이 애플리케이션끼리 1:1로 직접 연결한다. 단순하지만 연결이 늘어나면 거미줄이 되어 변경·재사용이 어렵다.',
          edges: [{ a: 'A', b: 'B', dir: false }, { a: 'A', b: 'C', dir: false }, { a: 'A', b: 'D', dir: false }, { a: 'B', b: 'C', dir: false }, { a: 'B', b: 'D', dir: false }, { a: 'C', b: 'D', dir: false }], path: [['A', 'D']] },
        { name: 'Hub & Spoke', desc: '모든 연결이 중앙 허브를 거친다. 확장·관리가 쉽지만 허브가 고장 나면 전체가 멈춘다.',
          edges: [{ a: 'A', b: 'H', dir: false }, { a: 'B', b: 'H', dir: false }, { a: 'C', b: 'H', dir: false }, { a: 'D', b: 'H', dir: false }], path: [['A', 'H', 'D']], hl: ['H'] },
        { name: 'Message Bus', desc: '애플리케이션 사이에 미들웨어(버스, ESB)를 두고 메시지로 통신한다. 확장성이 뛰어나 대용량 처리에 알맞다.',
          edges: [{ a: 'A', b: 'H', dir: false, label: '버스' }, { a: 'B', b: 'H', dir: false }, { a: 'C', b: 'H', dir: false }, { a: 'D', b: 'H', dir: false }], path: [['A', 'H', 'B'], ['C', 'H', 'D']] },
        { name: 'Hybrid', desc: '그룹 안에서는 Hub & Spoke, 그룹 사이는 Message Bus. 필요한 경우에 맞춰 섞어 쓴다.',
          edges: [{ a: 'A', b: 'C', dir: false, label: '그룹 1' }, { a: 'B', b: 'D', dir: false, label: '그룹 2' }, { a: 'A', b: 'H', dir: false }, { a: 'B', b: 'H', dir: false }], path: [['C', 'A', 'H', 'B', 'D']] },
      ] }),
  },
  {
    id: 'codequality', name: '코드 품질과 분석 도구', en: 'Refactoring · Static/Dynamic Analysis · Naming', cat: 'dev',
    summary: '리팩토링은 동작은 그대로 두고 구조를 개선한다. 정적 분석은 실행하지 않고, 동적 분석은 실행하며 결함을 찾는다.',
    match: ['리팩토링', '정적 분석', '동적 분석', '헝가리안', '표기법', 'JUnit', 'xUnit', 'PMD', 'Checkstyle', 'cppcheck', 'Valgrind', '코드 스멜', '명명 규칙'],
    make: board({ title: '코드 품질 도구', en: '분류 연습으로 도구를 나눠 보세요', groups: [
      { name: '정적 분석', en: 'Static (실행 안 함)', hue: 210, items: [{ name: 'PMD', desc: 'Java 결함·규칙 위반' }, { name: 'Checkstyle', desc: 'Java 코딩 표준' }, { name: 'cppcheck', desc: 'C/C++' }, { name: 'SonarQube', desc: '종합 품질' }] },
      { name: '동적 분석', en: 'Dynamic (실행하며)', hue: 0, items: [{ name: 'Valgrind', desc: '메모리 누수' }, { name: 'Avalanche', desc: '결함 탐지' }] },
      { name: '테스트 도구', hue: 140, items: [{ name: 'JUnit', desc: 'Java 단위 테스트 (xUnit)' }, { name: 'Selenium', desc: '웹 UI 자동 테스트' }, { name: 'FitNesse', desc: '웹 기반 테스트 케이스' }] },
      { name: '명명 규칙', hue: 40, items: [{ name: '헝가리안 표기법', en: 'Hungarian', desc: 'nCount, strName — 타입 접두어' }, { name: '카멜 표기법', en: 'camelCase', desc: 'myValue' }, { name: '파스칼 표기법', en: 'PascalCase', desc: 'MyValue' }, { name: '스네이크 표기법', en: 'snake_case', desc: 'my_value' }] },
      { name: '리팩토링', en: 'Refactoring', hue: 280, items: [{ name: '외부 동작은 그대로', desc: '내부 구조만 개선해 읽기·고치기 쉽게' }, { name: '코드 스멜', desc: '중복 코드, 긴 메서드, 큰 클래스 → 리팩토링 대상' }] },
    ] }),
  },
  {
    id: 'devmgmt', name: '개발 관리', en: 'Estimation · Metrics · Methodology · Release', cat: 'dev',
    summary: 'LOC로 노력(인월)과 기간을 추정하고, 성능은 처리량·응답 시간·경과 시간·자원 사용률로 잰다. 애자일은 짧은 주기로 반복한다.',
    match: ['LOC', '맨먼스', 'M/M', 'COCOMO', '릴리즈 노트', '성능 지표', '처리량', '응답 시간', '경과 시간', '자원 사용률', '애자일', '스크럼', 'XP', '폭포수', 'RTO', 'RPO', '비용 산정'],
    make: () => tabs([
      { name: 'LOC 비용 산정', make: fields({ title: 'LOC 기법 예: 30,000라인 · 5명 · 1인 월 300라인', rows: [
        { label: '노력(M/M)', fields: [{ name: '총 LOC', text: '30,000', desc: '예상 코드 줄 수', hue: 210 }, { name: '÷', text: '÷', w: 0.3, desc: '' }, { name: '1인 월 생산성', text: '300', desc: '한 사람이 한 달에 짜는 줄 수', hue: 40 }, { name: '=', text: '=', w: 0.3, desc: '' }, { name: '노력', text: '100 인월', desc: '한 사람이면 100개월 걸릴 일', hue: 140 }] },
        { label: '기간', fields: [{ name: '노력', text: '100 인월', desc: '', hue: 140 }, { name: '÷', text: '÷', w: 0.3, desc: '' }, { name: '인원', text: '5명', desc: '투입 인원', hue: 280 }, { name: '=', text: '=', w: 0.3, desc: '' }, { name: '기간', text: '20개월', desc: '', hue: 0 }] },
      ], note: '비용 = 노력 × 1인당 월 인건비. 다른 기법: COCOMO(조직형·반분리형·내장형), 기능 점수(FP), 델파이' }) },
      { name: '성능 지표', make: board({ title: '애플리케이션 성능 지표', groups: [{ name: '4가지', hue: 200, items: [
        { name: '처리량', en: 'Throughput', desc: '일정 시간에 처리한 일의 양' }, { name: '응답 시간', en: 'Response Time', desc: '요청 후 첫 응답까지' },
        { name: '경과 시간', en: 'Turnaround Time', desc: '작업을 맡기고 끝날 때까지' }, { name: '자원 사용률', en: 'Resource Usage', desc: 'CPU·메모리·네트워크 사용 정도' }] }], quiz: false }) },
      { name: '방법론·릴리즈', make: board({ title: '개발 방법론과 배포', groups: [
        { name: '방법론', hue: 30, items: [{ name: '폭포수', en: 'Waterfall', desc: '단계를 순서대로, 되돌아가기 어렵다' }, { name: '애자일', en: 'Agile', desc: '짧은 주기로 반복·점진, 고객과 협력, 변화에 대응' }, { name: '스크럼', en: 'Scrum', desc: '스프린트(2~4주), 백로그, 일일 회의' }, { name: 'XP', en: 'eXtreme Programming', desc: '짝 프로그래밍, 테스트 먼저, 잦은 배포' }] },
        { name: '릴리즈 노트', hue: 140, items: [{ name: '헤더', desc: '문서·제품 이름, 버전, 날짜' }, { name: '개요·목적' }, { name: '이슈 요약', desc: '수정한 버그, 추가 기능' }, { name: '재현 항목·수정 내용' }, { name: '면책 조항' }, { name: '연락처' }] },
        { name: '재해 복구', hue: 0, items: [{ name: 'RTO', en: 'Recovery Time Objective', desc: '언제까지 복구할지 (시간)' }, { name: 'RPO', en: 'Recovery Point Objective', desc: '어느 시점 데이터까지 되살릴지' }] },
      ], quiz: false }) },
    ]),
  },
];

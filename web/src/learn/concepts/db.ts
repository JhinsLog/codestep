// 데이터베이스·SQL·자료구조 개념
import { board } from '../three/adapt';
import { ladder } from '../three/adapt';
import { seq } from '../three/adapt';
import { stack, tabs } from '../core';
import { joinLab, relAlgLab } from '../three/joinLab';
import { integrityLab, keysLab, relTermsLab } from '../three/dbLabs';
import { sqlLab } from '../three/sqlLab';
import { normLab } from '../three/normLab';
import { txLab } from '../three/txLab';
import { orderLab } from '../three/orderLab';
import { hashLab, notationLab, treeLab } from '../three/dsLabs';
import type { Concept } from './types';

export const DB: Concept[] = [
  {
    id: 'relterms', name: '관계 데이터 모델 용어', en: 'Tuple · Attribute · Domain · Degree · Cardinality', cat: 'db',
    summary: '표 하나가 릴레이션, 행이 튜플, 열이 속성. 튜플 수가 카디널리티, 속성 수가 차수, 속성이 가질 수 있는 값의 집합이 도메인이다.',
    match: ['튜플', '카디널리티', '차수', '디그리', '도메인', '릴레이션 인스턴스', '릴레이션 스키마', 'Attribute', '속성', '열(column)'],
    make: relTermsLab,
  },
  {
    id: 'relalg', name: '관계 대수', en: 'Relational Algebra', cat: 'db',
    summary: 'σ(행 고르기), π(열 고르기), ⋈(합치기), ÷(모두 가진 것)와 합·교·차집합, 카티션 곱. 절차적 언어이고, 비절차적인 것은 관계해석이다.',
    match: ['관계 대수', '관계대수', 'σ', 'π', '÷', '⋈', '디비전', '셀렉트', '프로젝트', '합집합', '교집합', '차집합', '카티션', '관계해석', '관계 해석'],
    make: () => stack([relAlgLab(), board({ title: '관계대수와 관계해석', groups: [
      { name: '관계대수', en: 'Relational Algebra', hue: 210, desc: '절차적: 결과를 "어떻게" 구하는지 연산 순서로 쓴다', items: [{ name: '순수 관계 연산', desc: 'σ 셀렉트, π 프로젝트, ⋈ 조인, ÷ 디비전' }, { name: '일반 집합 연산', desc: '∪ 합집합, ∩ 교집합, − 차집합, × 카티션 곱' }] },
      { name: '관계해석', en: 'Relational Calculus', hue: 30, desc: '비절차적: 결과가 "무엇"인지만 쓴다 (코드가 제안, 프레디킷 해석 기반)', items: [{ name: '튜플 관계해석' }, { name: '도메인 관계해석' }, { name: '∀ 모든 · ∃ 존재한다', desc: '정량자 기호를 쓴다' }] },
    ], quiz: false })()]),
  },
  {
    id: 'joins', name: '조인', en: 'JOIN', cat: 'db',
    summary: '내부 조인은 양쪽에 짝이 있는 행만, 외부 조인은 짝이 없는 쪽도 NULL로 채워 남긴다. 세타·동등·자연 조인은 조건의 모양에 따른 구분이다.',
    match: ['JOIN', '조인', '세타', '동등 조인', '자연 조인', '외부 조인', 'INNER', 'OUTER', 'CROSS', 'Theta', 'Equi', 'Natural'],
    make: () => stack([joinLab(), board({ title: '조건에 따른 조인 구분', groups: [
      { name: '세타 조인', en: 'Theta Join', hue: 200, desc: '=, <, >, ≤, ≥, ≠ 같은 비교 연산자로 조인', items: [{ name: '동등 조인', en: 'Equi Join', desc: '세타 조인 중 = 만 쓴 것. 조인 속성이 결과에 두 번 나온다' }, { name: '자연 조인', en: 'Natural Join', desc: '동등 조인에서 중복 속성을 하나로 합친 것 (⋈)' }] },
      { name: '외부 조인', en: 'Outer Join', hue: 30, items: [{ name: 'LEFT' }, { name: 'RIGHT' }, { name: 'FULL' }] },
    ], quiz: false })()]),
  },
  {
    id: 'keys', name: '키', en: 'Key', cat: 'db',
    summary: '슈퍼키(유일성) ⊃ 후보키(유일성 + 최소성) ⊃ 기본키·대체키. 외래키는 다른 테이블의 기본키를 참조한다.',
    match: ['슈퍼키', '후보키', '기본키', '대체키', '외래키', '유일성', '최소성', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'Candidate Key', 'Super Key'],
    make: keysLab,
  },
  {
    id: 'normalization', name: '정규화와 이상 현상', en: 'Normalization · Anomaly', cat: 'db',
    summary: '중복 때문에 생기는 이상 현상(삽입·삭제·갱신)을 없애려고 릴레이션을 나눈다. 1NF → 2NF(부분 종속 제거) → 3NF(이행 종속 제거) → BCNF …',
    match: ['정규형', '정규화', '함수 종속', '부분 함수', '이행', 'BCNF', '이상 현상', '삽입 이상', '삭제 이상', '갱신 이상', '반정규화', '역정규화', '1NF', '2NF', '3NF', 'Anomaly'],
    make: () => stack([normLab(), tabs([
      { name: '정규화 계단', make: ladder({ title: '정규화 단계', en: 'Normal Form', top: '아래 단계부터 하나씩', bottom: '위로 갈수록 중복이 적다', shape: 'stairs', hue: [200, 140],
        items: [
          { name: '제1정규형', en: '1NF', tag: '도메인이 원자값', desc: '모든 속성 값이 더 나눌 수 없는 원자값이다. "취미: 축구, 독서"처럼 한 칸에 여러 값이 있으면 안 된다.' },
          { name: '제2정규형', en: '2NF', tag: '부분 함수 종속 제거', desc: '기본키의 "일부"에만 종속된 속성을 떼어 낸다. 예: (학번, 과목)이 키인데 학번 → 이름이면 [학생(학번, 이름)]으로 분리.' },
          { name: '제3정규형', en: '3NF', tag: '이행 함수 종속 제거', desc: 'A → B → C처럼 키가 아닌 속성을 거쳐 결정되는 속성을 떼어 낸다. 예: 학번 → 학과 → 학과장.' },
          { name: 'BCNF', en: 'Boyce-Codd', tag: '결정자가 모두 후보키', desc: '모든 결정자가 후보키여야 한다. 3NF보다 엄격하다.' },
          { name: '제4정규형', en: '4NF', tag: '다치 종속 제거', desc: '하나의 키에 서로 독립인 여러 값 집합이 붙는 다치 종속(MVD)을 없앤다.' },
          { name: '제5정규형', en: '5NF', tag: '조인 종속 제거', desc: '후보키를 통하지 않는 조인 종속을 없앤다.' },
        ], mnemonic: '외우기: "도부이결다조" — 도메인 원자값, 부분 종속, 이행 종속, 결정자, 다치 종속, 조인 종속' }) },
      { name: '이상 현상', make: board({ title: '이상 현상 (Anomaly)', groups: [
        { name: '삽입 이상', en: 'Insertion', hue: 140, items: [{ name: '원치 않는 값까지 넣어야 함', desc: '수강하지 않은 학생은 과목이 없어서 등록할 수 없다(키에 NULL)' }] },
        { name: '삭제 이상', en: 'Deletion', hue: 0, items: [{ name: '원치 않는 정보까지 지워짐', desc: '마지막 수강 기록을 지우자 학생의 학과 정보까지 사라진다' }] },
        { name: '갱신 이상', en: 'Update', hue: 40, items: [{ name: '일부만 바뀌어 불일치', desc: '학생의 학과가 여러 행에 중복되어, 일부만 고치면 서로 다른 값이 된다' }] },
      ], quiz: false }) },
      { name: '함수 종속', make: board({ title: '함수 종속의 종류', en: 'X → Y : X가 Y를 결정한다', groups: [
        { name: '완전 함수 종속', en: 'Full', hue: 140, items: [{ name: '(학번, 과목) → 성적', desc: '기본키 "전체"가 있어야 결정된다' }] },
        { name: '부분 함수 종속', en: 'Partial', hue: 30, items: [{ name: '(학번, 과목) 중 학번 → 이름', desc: '기본키의 일부만으로 결정 → 2NF에서 제거' }] },
        { name: '이행 함수 종속', en: 'Transitive', hue: 0, items: [{ name: '학번 → 학과 → 학과장', desc: '다른 속성을 거쳐 결정 → 3NF에서 제거' }] },
        { name: '반정규화', en: 'Denormalization', hue: 270, desc: '성능을 위해 일부러 정규화를 되돌림', items: [{ name: '테이블 통합·분할', desc: '조인을 줄이려고 합치거나, 행(수평)·열(수직)로 나눈다' }, { name: '중복 테이블·속성 추가', desc: '집계 테이블, 자주 쓰는 속성을 중복 저장' }, { name: '대가', desc: '조회는 빨라지지만 무결성(일관성) 유지가 어려워진다' }] },
      ], quiz: false }) },
    ])]),
  },
  {
    id: 'transaction', name: '트랜잭션과 회복', en: 'Transaction · ACID · Recovery', cat: 'db',
    summary: '트랜잭션은 한꺼번에 처리되어야 하는 작업 단위. ACID를 지키며, 장애가 나면 로그로 REDO(다시 반영)·UNDO(되돌리기)한다.',
    match: ['트랜잭션', 'ACID', '원자성', '일관성', '독립성', '지속성', 'ROLLBACK', 'COMMIT', 'REDO', 'UNDO', '회복', '로킹', '병행 제어', '즉시 갱신', '지연 갱신', 'Atomicity', 'SAVEPOINT', '상호 배제'],
    make: () => stack([txLab(), tabs([
      { name: 'ACID', make: board({ title: '트랜잭션의 특성 ACID', groups: [
        { name: '원자성', en: 'Atomicity', hue: 0, items: [{ name: '전부 아니면 전무', desc: '모두 반영(COMMIT)되거나 하나도 반영되지 않는다(ROLLBACK)' }] },
        { name: '일관성', en: 'Consistency', hue: 60, items: [{ name: '규칙을 지킨 상태 유지', desc: '실행 전후 모두 무결성 제약을 만족한다' }] },
        { name: '독립성', en: 'Isolation', hue: 140, items: [{ name: '서로 간섭 없음', desc: '동시에 실행돼도 다른 트랜잭션의 중간 결과를 볼 수 없다 → 병행 제어(로킹)' }] },
        { name: '지속성', en: 'Durability', hue: 220, items: [{ name: '완료되면 영구히', desc: '커밋한 결과는 장애가 나도 사라지지 않는다 → 회복 기법' }] },
      ], quiz: false }) },
      { name: '계좌 이체와 ROLLBACK', make: seq({ title: '계좌 이체 트랜잭션', actors: [{ name: '트랜잭션' }, { name: '김 계좌', sub: '10만 원' }, { name: '이 계좌', sub: '0원' }],
        scenarios: [
          { name: '정상 → COMMIT', desc: '두 작업이 모두 성공해야 의미가 있다.', steps: [
            { from: 0, to: 1, label: '김 -3만 원', note: '김 계좌 7만 원' }, { from: 0, to: 2, label: '이 +3만 원', note: '이 계좌 3만 원' },
            { from: 0, to: 0, label: 'COMMIT', note: '두 변경을 영구히 확정한다(지속성)' }] },
          { name: '도중 장애 → ROLLBACK', desc: '돈이 빠져나간 뒤 입금 전에 오류가 나면, 빠져나간 것까지 되돌려야 한다(원자성).', steps: [
            { from: 0, to: 1, label: '김 -3만 원', note: '김 계좌 7만 원' }, { from: 0, to: 2, label: '이 +3만 원', kind: 'lost', note: '도중에 장애!' },
            { from: 0, to: 1, label: 'ROLLBACK: 김 +3만 원', kind: 'bad', note: '로그의 이전 값으로 되돌려 김 계좌가 다시 10만 원이 된다(UNDO)' }] },
        ] }) },
      { name: '장애 회복', make: board({ title: '로그 기반 회복', groups: [
        { name: 'REDO (재실행)', hue: 140, desc: '장애 전에 COMMIT된 트랜잭션', items: [{ name: '로그를 보고 다시 반영', desc: '로그에 start와 commit이 모두 있다' }] },
        { name: 'UNDO (취소)', hue: 0, desc: 'COMMIT되지 않은 트랜잭션', items: [{ name: '이전 값으로 되돌림', desc: '로그에 start만 있다' }] },
        { name: '기법', hue: 220, items: [{ name: '즉시 갱신', en: 'Immediate Update', desc: '실행 중 바로 반영 → REDO + UNDO' }, { name: '지연 갱신', en: 'Deferred Update', desc: '커밋까지 미룸 → REDO만' }, { name: '그림자 페이징', desc: '로그 없이 그림자 페이지 테이블로 복구' }, { name: '검사점', en: 'Checkpoint', desc: '회복할 범위를 줄인다' }] },
        { name: '병행 제어', hue: 280, items: [{ name: '로킹', en: 'Locking', desc: '자료에 잠금을 걸어 상호 배제 (단위가 크면 관리 쉽고 병행성 낮음)' }, { name: '2단계 로킹', desc: '확장 단계(잠금만) → 축소 단계(해제만)' }, { name: '타임스탬프', desc: '시작 시각 순서로 처리' }] },
      ], quiz: false }) },
    ])]),
  },
  {
    id: 'integrity', name: '무결성 제약 조건', en: 'Integrity Constraint', cat: 'db',
    summary: '개체 무결성(기본키는 NULL·중복 불가), 참조 무결성(외래키는 참조하는 기본키 값이거나 NULL), 도메인 무결성(값의 범위).',
    match: ['무결성 제약', '개체 무결성', '참조 무결성', '도메인 무결성', 'CASCADE', '키 무결성', '무결성'],
    make: () => stack([integrityLab(), board({ title: '무결성 제약 조건 정리', groups: [
      { name: '개체 무결성', en: 'Entity Integrity', hue: 210, items: [{ name: '기본키 NULL ✕', desc: 'INSERT INTO 학생 VALUES (NULL, …) → 위반' }, { name: '기본키 중복 ✕', desc: '학번 1001이 이미 있는데 또 넣으면 위반' }] },
      { name: '참조 무결성', en: 'Referential Integrity', hue: 30, items: [{ name: '외래키는 존재하는 값만', desc: '학과에 없는 D9를 학생.학과코드에 넣으면 위반' }, { name: 'ON DELETE CASCADE', desc: '참조되는 행을 지우면 참조하는 행도 함께 삭제' }, { name: 'RESTRICT · SET NULL', desc: '삭제 거부 / 참조하는 값을 NULL로' }] },
      { name: '도메인 무결성', en: 'Domain Integrity', hue: 140, items: [{ name: '값의 타입·범위', desc: '학년은 1~4만 → CHECK (학년 BETWEEN 1 AND 4)' }] },
    ], quiz: false })()]),
  },
  {
    id: 'schema', name: '스키마와 데이터 모델', en: 'Schema · Data Model', cat: 'db',
    summary: '스키마 3단계: 외부(사용자 관점) → 개념(전체 논리 구조) → 내부(물리 저장). 데이터 모델 = 구조 + 연산 + 제약 조건.',
    match: ['스키마', '외부 스키마', '개념 스키마', '내부 스키마', '데이터 모델', '데이터 독립성'],
    make: () => stack([
      ladder({ title: '스키마의 3단계', en: 'ANSI/SPARC 3-Level', top: '사용자에 가깝다', bottom: '저장 장치에 가깝다', shape: 'stack', hue: [200, 280], items: [
        { name: '외부 스키마', en: 'External Schema', desc: '사용자·응용 프로그램이 보는 부분적인 논리 구조. 여러 개일 수 있다(서브 스키마).' },
        { name: '개념 스키마', en: 'Conceptual Schema', desc: '기관 전체의 논리 구조. 모든 개체·관계·제약 조건. 하나뿐이다. 보통 "스키마"라 하면 이것.' },
        { name: '내부 스키마', en: 'Internal Schema', desc: '물리적 저장 구조: 레코드 형식, 인덱스, 저장 방법.' },
      ], note: '외부↔개념 사이가 논리적 데이터 독립성, 개념↔내부 사이가 물리적 데이터 독립성이다.' })(),
      board({ title: '데이터 모델의 구성 요소', groups: [
        { name: '구조', en: 'Structure', hue: 210, items: [{ name: '개체 타입과 관계', desc: '데이터의 정적 성질' }] },
        { name: '연산', en: 'Operation', hue: 30, items: [{ name: '데이터 처리 방법', desc: '동적 성질, 데이터베이스를 조작하는 도구' }] },
        { name: '제약 조건', en: 'Constraint', hue: 140, items: [{ name: '논리적 제약', desc: '저장될 수 있는 데이터의 조건' }] },
      ], quiz: false })(),
    ]),
  },
  {
    id: 'dbdesign', name: '데이터베이스 설계 단계', en: 'Database Design', cat: 'db',
    summary: '요구 조건 분석 → 개념적 설계(E-R) → 논리적 설계(스키마·정규화) → 물리적 설계(저장 구조) → 구현',
    match: ['설계 단계', '요구 조건 분석', '개념적 설계', '논리적 설계', '물리적 설계', '데이터베이스 설계', '설계 순서'],
    make: ladder({ title: '데이터베이스 설계 순서', top: '먼저', bottom: '나중', shape: 'stairs', hue: [40, 220], items: [
      { name: '요구 조건 분석', tag: '요구 조건 명세서', desc: '사용자가 무엇을 원하는지 모아 명세서를 쓴다.' },
      { name: '개념적 설계', tag: 'E-R 다이어그램', desc: 'DBMS와 상관없이 개체·속성·관계를 E-R 모델로 그린다. 트랜잭션 모델링.' },
      { name: '논리적 설계', tag: '관계 스키마 · 정규화', desc: '특정 DBMS의 데이터 모델(관계형 등)에 맞춰 테이블 스키마를 만들고 정규화한다.' },
      { name: '물리적 설계', tag: '저장 구조 · 인덱스', desc: '레코드 형식, 인덱스, 접근 경로 등 실제 저장 방법을 정한다.' },
      { name: '구현', tag: 'DDL 실행', desc: 'CREATE TABLE 같은 DDL로 데이터베이스를 만든다.' },
    ], mnemonic: '개념(무엇을) → 논리(어떤 모델로) → 물리(어떻게 저장)' }),
  },
  {
    id: 'er', name: 'E-R 다이어그램', en: 'Entity-Relationship Diagram', cat: 'db',
    summary: '피터 첸의 표기: 사각형 개체, 마름모 관계, 타원 속성. 이중 사각형은 약한 개체, 이중 타원은 다중값 속성.',
    match: ['E-R', 'ER 다이어그램', '약한 개체', '다중값', '개체 타입'],
    make: board({ title: 'E-R 다이어그램 기호 (피터 첸)', groups: [
      { name: '기본', hue: 210, items: [{ name: '□ 사각형 = 개체', en: 'Entity', desc: '학생, 과목처럼 저장할 대상' }, { name: '◇ 마름모 = 관계', en: 'Relationship', desc: '수강하다' }, { name: '○ 타원 = 속성', en: 'Attribute', desc: '이름, 학번' }, { name: '─ 선 = 연결', desc: '개체와 속성, 개체와 관계를 잇는다' }] },
      { name: '특수', hue: 30, items: [{ name: '이중 사각형 = 약한 개체', en: 'Weak Entity', desc: '스스로는 식별하지 못하는 개체' }, { name: '이중 마름모 = 식별 관계', desc: '약한 개체와의 관계' }, { name: '이중 타원 = 다중값 속성', desc: '전화번호 여러 개' }, { name: '밑줄 타원 = 기본키 속성', desc: '' }, { name: '점선 타원 = 유도 속성', desc: '생일로 계산하는 나이' }] },
    ], quiz: false }),
  },
  {
    id: 'fileorg', name: '파일 편성과 인덱스·뷰', en: 'File Organization · Index · View', cat: 'db',
    summary: '순차·색인 순차·직접(해싱) 파일. 인덱스는 검색을 빠르게, 뷰는 저장하지 않는 가상 테이블이다.',
    match: ['파일 편성', '순차 파일', '색인 순차', 'ISAM', '오버플로', '직접 파일', '파일 구조', '인덱스', 'INDEX', '뷰', 'VIEW', '가상 테이블'],
    make: board({ title: '파일 편성과 데이터베이스 객체', groups: [
      { name: '파일 편성', hue: 210, items: [
        { name: '순차 파일', en: 'Sequential', desc: '키 순서대로 저장, 처음부터 차례로 읽는다' },
        { name: '색인 순차 파일', en: 'ISAM', desc: '기본 구역 + 색인 구역 + 오버플로 구역. 순차·직접 접근 모두' },
        { name: '직접 파일', en: 'Hashing', desc: '해시 함수로 주소를 계산해 바로 접근' }] },
      { name: '인덱스', en: 'Index', hue: 30, items: [{ name: 'CREATE INDEX 이름 ON 테이블(열)', desc: '검색은 빨라지고, 삽입·수정·삭제는 인덱스도 고쳐야 해서 느려진다' }, { name: 'B-트리', desc: '대부분의 DBMS가 쓰는 균형 트리 인덱스' }] },
      { name: '뷰', en: 'View', hue: 140, items: [{ name: '가상 테이블', desc: '기본 테이블에서 유도, 물리적으로 저장하지 않는다' }, { name: '보안·편의', desc: '필요한 열만 보여 주고 복잡한 조인을 숨긴다' }, { name: '한계', desc: 'ALTER로 바꿀 수 없고(지우고 다시 만듦), 인덱스를 따로 만들 수 없다' }] },
    ], quiz: false }),
  },
  {
    id: 'sqlcmd', name: 'SQL 명령어 분류', en: 'DDL · DML · DCL · TCL', cat: 'sql',
    summary: '정의어(CREATE·ALTER·DROP), 조작어(SELECT·INSERT·UPDATE·DELETE), 제어어(GRANT·REVOKE), 트랜잭션 제어(COMMIT·ROLLBACK).',
    match: ['DDL', 'DML', 'DCL', 'TCL', 'GRANT', 'REVOKE', 'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'DOMAIN', 'CHECK'],
    make: () => stack([sqlLab(), board({ title: 'SQL 명령어 분류', groups: [
      { name: 'DDL 정의어', en: 'Data Definition', hue: 210, items: [{ name: 'CREATE', desc: 'TABLE·VIEW·INDEX·DOMAIN 만들기' }, { name: 'ALTER', desc: 'ALTER TABLE 학생 ADD 주소 VARCHAR(50)' }, { name: 'DROP', desc: 'DROP TABLE 학생 CASCADE | RESTRICT' }, { name: 'TRUNCATE', desc: '모든 행 삭제(구조는 남김, 되돌릴 수 없음)' }] },
      { name: 'DML 조작어', en: 'Data Manipulation', hue: 30, items: [{ name: 'SELECT', desc: 'SELECT 열 FROM 표 WHERE 조건' }, { name: 'INSERT', desc: 'INSERT INTO 표 VALUES (…)' }, { name: 'UPDATE', desc: 'UPDATE 표 SET 열 = 값 WHERE 조건' }, { name: 'DELETE', desc: 'DELETE FROM 표 WHERE 조건' }] },
      { name: 'DCL 제어어', en: 'Data Control', hue: 140, items: [{ name: 'GRANT', desc: 'GRANT SELECT ON 학생 TO kim [WITH GRANT OPTION]' }, { name: 'REVOKE', desc: 'REVOKE SELECT ON 학생 FROM kim [CASCADE]' }] },
      { name: 'TCL 트랜잭션 제어', en: 'Transaction Control', hue: 280, items: [{ name: 'COMMIT', desc: '확정' }, { name: 'ROLLBACK', desc: '취소' }, { name: 'SAVEPOINT', desc: '되돌아갈 지점' }] },
    ] })()]),
  },
  {
    id: 'sqlorder', name: 'SELECT의 처리 순서', en: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', cat: 'sql',
    summary: 'SELECT는 쓰는 순서와 처리 순서가 다르다. WHERE는 묶기 전의 행을, HAVING은 묶은 뒤의 그룹을 거른다.',
    match: ['GROUP BY', 'HAVING', 'ORDER BY', 'DISTINCT', 'LIKE', 'BETWEEN', '서브쿼리', 'COUNT', 'AVG', 'SUM', 'IN (', 'ALL', 'ANY', 'NULL'],
    make: () => stack([orderLab(), ladder({ title: 'SELECT 문의 처리 순서', en: 'Logical Query Processing', top: '먼저 처리', bottom: '나중에 처리', shape: 'stairs', hue: [200, 20], items: [
      { name: 'FROM (JOIN)', desc: '어느 테이블에서 가져올지. 조인이 있으면 먼저 합친다.' },
      { name: 'WHERE', desc: '행 하나하나를 조건으로 거른다. 아직 묶기 전이라 집계 함수(COUNT, AVG)를 쓸 수 없다. AND가 OR보다 먼저 계산된다.' },
      { name: 'GROUP BY', desc: '같은 값끼리 묶는다.' },
      { name: 'HAVING', desc: '묶은 그룹을 조건으로 거른다. 집계 함수를 쓸 수 있다.' },
      { name: 'SELECT', desc: '보여 줄 열과 계산식. DISTINCT는 중복 행 제거. COUNT(열)은 NULL을 세지 않는다.' },
      { name: 'ORDER BY', desc: '마지막에 정렬. 기본 ASC(오름차순), DESC는 내림차순. SELECT의 별칭을 쓸 수 있다.' },
    ], note: '조건 연산: LIKE(% 아무 글자 여러 개, _ 한 글자), BETWEEN a AND b(양 끝 포함), IN(…), > ALL(…)은 최댓값보다 큼, > ANY(…)는 최솟값보다 큼' })()]),
  },
  {
    id: 'hash', name: '해시 테이블', en: 'Hash Table', cat: 'ds',
    summary: '키를 해시 함수에 넣어 주소를 바로 계산한다. 다른 키가 같은 주소가 되는 충돌은 체이닝이나 개방 주소법으로 해결한다.',
    match: ['충돌', '체이닝', '버킷', '해시 테이블', '선형 조사', '동의어', 'Collision', 'Chaining', '해싱 함수'],
    make: hashLab,
  },
  {
    id: 'tree', name: '트리 순회와 수식 표기', en: 'Tree Traversal · Notation', cat: 'ds',
    summary: '전위(루트 먼저), 중위(루트 가운데), 후위(루트 나중). 수식 트리를 후위 순회하면 후위식이 된다.',
    match: ['순회', '전위', '중위', '후위', '표기', '이진 트리', 'Preorder', 'Inorder', 'Postorder'],
    make: () => tabs([{ name: '트리 순회', make: treeLab }, { name: '수식 표기 변환', make: notationLab }]),
  },
  {
    id: 'datanew', name: '데이터 신기술', en: 'Big Data · Mining · Blockchain', cat: 'db',
    summary: '대용량 데이터를 나눠 저장·처리하는 하둡, 숨은 규칙을 찾는 데이터 마이닝, 위·변조가 어려운 분산 장부 블록체인 등.',
    match: ['데이터 마이닝', '하둡', 'Hadoop', 'LOD', '다크 데이터', '블록체인', '빅데이터', '맵리듀스', 'OLAP', 'Linked Open Data'],
    make: board({ title: '데이터 신기술', groups: [
      { name: '빅데이터', hue: 200, items: [{ name: '하둡', en: 'Hadoop', desc: '여러 컴퓨터로 대용량 데이터를 분산 저장(HDFS)·처리(맵리듀스)하는 오픈소스' }, { name: '맵리듀스', en: 'MapReduce', desc: '나눠서 처리(Map)하고 모아서 합친다(Reduce)' }, { name: '스쿱', en: 'Sqoop', desc: '관계형 DB ↔ 하둡 데이터 이동' }] },
      { name: '분석', hue: 30, items: [{ name: '데이터 마이닝', en: 'Data Mining', desc: '대량 데이터에서 숨은 규칙·패턴(연관, 분류, 군집)을 찾는다' }, { name: 'OLAP', desc: '다차원 데이터를 대화식으로 분석 (드릴다운, 롤업, 슬라이스)' }, { name: '다크 데이터', en: 'Dark Data', desc: '모아 두기만 하고 활용하지 않는 데이터' }] },
      { name: '공유·신뢰', hue: 140, items: [{ name: 'LOD', en: 'Linked Open Data', desc: '공개된 데이터를 URI로 연결해 공유 (시맨틱 웹)' }, { name: '블록체인', en: 'Blockchain', desc: '거래 블록을 해시로 사슬처럼 연결한 분산 원장. 한 블록을 고치면 뒤의 해시가 모두 깨진다' }] },
    ] }),
  },
];

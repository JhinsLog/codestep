// 소프트웨어 설계 개념
import { board } from '../templates/board';
import { graph } from '../templates/graph';
import { ladder } from '../templates/ladder';
import { stack, tabs } from '../core';
import type { Concept } from './types';
import { COHESION, COUPLING } from '../scenes/design';

export const DESIGN: Concept[] = [
  {
    id: 'coupling', name: '결합도', en: 'Coupling', cat: 'design',
    summary: '모듈과 모듈 "사이"의 의존 정도. 약할수록 좋다: 자료 < 스탬프 < 제어 < 외부 < 공통 < 내용.',
    match: ['결합도', 'Coupling'],
    make: ladder({ title: '결합도 — 약한(좋은) 것부터', en: 'Coupling', top: '약함 · 좋은 설계', bottom: '강함 · 나쁜 설계', hue: [140, 0], items: [
      { scene: COUPLING.data, name: '자료 결합도', en: 'Data Coupling', tag: '필요한 값만', desc: '모듈끼리 꼭 필요한 데이터(값)만 매개변수로 주고받는다. 가장 바람직하다. 예: add(a, b)' },
      { scene: COUPLING.stamp, name: '스탬프 결합도', en: 'Stamp Coupling', tag: '자료 구조 통째로', desc: '배열·구조체·레코드 같은 자료 구조를 통째로 넘기지만, 받는 쪽은 그 일부만 쓴다.' },
      { scene: COUPLING.control, name: '제어 결합도', en: 'Control Coupling', tag: '플래그·제어 신호', desc: '어떻게 처리하라는 제어 신호(플래그)를 넘겨 상대의 내부 흐름을 바꾼다. 예: print(data, mode)' },
      { scene: COUPLING.external, name: '외부 결합도', en: 'External Coupling', tag: '외부 데이터·규약', desc: '외부에서 정한 데이터 형식, 통신 규약, 장치를 함께 참조한다.' },
      { scene: COUPLING.common, name: '공통 결합도', en: 'Common Coupling', tag: '전역 변수 공유', desc: '여러 모듈이 하나의 전역 변수(공통 데이터 영역)를 함께 쓰고 고친다. 하나를 바꾸면 모두 영향을 받는다.' },
      { scene: COUPLING.content, name: '내용 결합도', en: 'Content Coupling', tag: '남의 내부를 직접', desc: '다른 모듈의 내부 변수나 코드를 직접 참조·수정한다. 가장 나쁘다.' },
    ], mnemonic: '외우기: "자스제외공내"' }),
  },
  {
    id: 'cohesion', name: '응집도', en: 'Cohesion', cat: 'design',
    summary: '모듈 "안"의 요소들이 하나의 목적으로 뭉친 정도. 강할수록 좋다: 기능적 > 순차적 > 교환적 > 절차적 > 시간적 > 논리적 > 우연적.',
    match: ['응집도', 'Cohesion'],
    make: ladder({ title: '응집도 — 강한(좋은) 것부터', en: 'Cohesion', top: '강함 · 좋은 설계', bottom: '약함 · 나쁜 설계', hue: [140, 0], items: [
      { scene: COHESION.functional, name: '기능적 응집도', en: 'Functional', tag: '하나의 기능', desc: '모든 요소가 하나의 기능을 위해 함께 동작한다. 가장 바람직하다.' },
      { scene: COHESION.sequential, name: '순차적 응집도', en: 'Sequential', tag: '출력 → 다음 입력', desc: '한 활동의 출력이 다음 활동의 입력이 된다. 예: 읽기 → 검증 → 저장' },
      { scene: COHESION.communicational, name: '교환적 응집도', en: 'Communicational', tag: '같은 입출력 공유', desc: '같은 입력이나 출력 데이터를 쓰는 서로 다른 기능이 모여 있다. 통신적 응집도라고도 한다.' },
      { scene: COHESION.procedural, name: '절차적 응집도', en: 'Procedural', tag: '정해진 순서', desc: '여러 기능을 정해진 순서대로 수행하도록 모아 놓았다(데이터는 주고받지 않는다).' },
      { scene: COHESION.temporal, name: '시간적 응집도', en: 'Temporal', tag: '같은 시점', desc: '같은 시간대에 실행되는 것끼리 모였다. 예: 초기화 모듈' },
      { scene: COHESION.logical, name: '논리적 응집도', en: 'Logical', tag: '비슷한 성격', desc: '성격이 비슷한 처리를 한데 모으고 플래그로 하나를 골라 실행한다.' },
      { scene: COHESION.coincidental, name: '우연적 응집도', en: 'Coincidental', tag: '관련 없음', desc: '서로 아무 관련 없는 것들이 우연히 모여 있다. 가장 나쁘다.' },
    ], mnemonic: '외우기: "기순교절시논우" — 좋은 설계는 결합도는 낮게, 응집도는 높게' }),
  },
  {
    id: 'modularity', name: '모듈화와 팬인·팬아웃', en: 'Modularity · Fan-In · Fan-Out', cat: 'design',
    summary: '팬인은 나를 호출하는 상위 모듈 수, 팬아웃은 내가 호출하는 하위 모듈 수. 모듈 독립성은 결합도↓ 응집도↑로 높인다.',
    match: ['팬인', '팬아웃', 'Fan-In', 'Fan-Out', 'Fan In', '모듈 독립성', '모듈화', '시스템 구조도'],
    make: graph({
      title: '모듈 구조도에서 팬인·팬아웃 세기', en: '모듈을 눌러 보세요', w: 640, h: 300, degree: true,
      nodes: [{ id: 'A', name: 'A', x: 320, y: 40 }, { id: 'B', name: 'B', x: 140, y: 140 }, { id: 'C', name: 'C', x: 320, y: 140 }, { id: 'D', name: 'D', x: 500, y: 140 }, { id: 'E', name: 'E', x: 80, y: 250 }, { id: 'F', name: 'F', x: 320, y: 250 }, { id: 'G', name: 'G', x: 540, y: 250 }],
      edges: [{ a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'A', b: 'D' }, { a: 'B', b: 'E' }, { a: 'B', b: 'F' }, { a: 'C', b: 'F' }, { a: 'D', b: 'F' }, { a: 'D', b: 'G' }],
      note: '팬인이 높으면 재사용이 잘 된 것(F는 3), 팬아웃이 너무 높으면 모듈을 나눌 필요가 있다. 좋은 설계: 팬인은 높게, 팬아웃은 낮게.',
    }),
  },
  {
    id: 'gof', name: 'GoF 디자인 패턴', en: 'Design Patterns (23)', cat: 'design',
    summary: '생성(객체를 만드는 법) 5, 구조(조합하는 법) 7, 행위(책임과 소통) 11. "분류 연습"으로 직접 나눠 보세요.',
    match: ['디자인 패턴', 'GoF', '싱글톤', '싱글턴', '팩토리', '빌더', '프로토타입', '어댑터', '브리지', '컴포지트', '데코레이터', '퍼사드', '플라이웨이트', '프록시', '옵저버', '전략', '커맨드', '반복자', '방문자', '중재자', '메멘토', '템플릿 메서드', '책임 연쇄', '인터프리터', 'Singleton', 'Observer', 'Adapter', 'Proxy', 'Visitor', 'Iterator', 'Bridge', 'Factory', '생성 패턴', '구조 패턴', '행위 패턴'],
    make: board({ title: 'GoF 디자인 패턴 23가지', en: 'Gang of Four', groups: [
      { name: '생성 패턴', en: 'Creational', hue: 140, desc: '객체를 "만드는" 방법을 캡슐화한다 (5)', items: [
        { name: '추상 팩토리', en: 'Abstract Factory', desc: '관련 객체들의 묶음(제품군)을 구체 클래스 없이 한 번에 만든다' },
        { name: '빌더', en: 'Builder', desc: '복잡한 객체를 단계별로 조립한다' },
        { name: '팩토리 메서드', en: 'Factory Method', desc: '어떤 클래스의 객체를 만들지 하위 클래스가 정한다 (가상 생성자)' },
        { name: '프로토타입', en: 'Prototype', desc: '원본 객체를 복제해 새 객체를 만든다' },
        { name: '싱글톤', en: 'Singleton', desc: '객체를 하나만 만들고 어디서든 그것을 쓴다' }] },
      { name: '구조 패턴', en: 'Structural', hue: 210, desc: '클래스·객체를 "조합"해 더 큰 구조를 만든다 (7)', items: [
        { name: '어댑터', en: 'Adapter', desc: '맞지 않는 인터페이스를 변환해 함께 쓴다 (돼지코)' },
        { name: '브리지', en: 'Bridge', desc: '기능 계층과 구현 계층을 분리해 따로 확장' },
        { name: '컴포지트', en: 'Composite', desc: '부분과 전체를 같은 방식으로 다루는 트리 구조 (폴더와 파일)' },
        { name: '데코레이터', en: 'Decorator', desc: '객체를 감싸 기능을 동적으로 덧붙인다' },
        { name: '퍼사드', en: 'Facade', desc: '복잡한 하위 시스템 앞에 단순한 창구 하나' },
        { name: '플라이웨이트', en: 'Flyweight', desc: '같은 객체를 공유해 메모리를 아낀다' },
        { name: '프록시', en: 'Proxy', desc: '대리 객체로 접근을 통제한다 (지연 로딩, 권한 검사)' }] },
      { name: '행위 패턴', en: 'Behavioral', hue: 30, desc: '객체 사이의 "책임과 소통" 방법 (11)', items: [
        { name: '책임 연쇄', en: 'Chain of Responsibility', desc: '요청을 처리할 수 있는 객체를 만날 때까지 사슬로 넘긴다' },
        { name: '커맨드', en: 'Command', desc: '요청을 객체로 만들어 저장·취소할 수 있게 한다' },
        { name: '인터프리터', en: 'Interpreter', desc: '언어의 문법을 클래스로 표현해 해석한다' },
        { name: '반복자', en: 'Iterator', desc: '내부 구조를 드러내지 않고 원소에 차례로 접근' },
        { name: '중재자', en: 'Mediator', desc: '객체끼리 직접 소통하지 않고 중재자를 거친다' },
        { name: '메멘토', en: 'Memento', desc: '객체 상태를 저장해 되돌린다 (Ctrl+Z)' },
        { name: '옵저버', en: 'Observer', desc: '상태가 바뀌면 구독자들에게 자동 알림 (1:N)' },
        { name: '상태', en: 'State', desc: '상태마다 행동을 다른 객체로 나눈다' },
        { name: '전략', en: 'Strategy', desc: '알고리즘을 캡슐화해 실행 중에 바꿔 끼운다' },
        { name: '템플릿 메서드', en: 'Template Method', desc: '뼈대는 상위에서, 세부 단계는 하위에서' },
        { name: '방문자', en: 'Visitor', desc: '원소 클래스를 고치지 않고 새 연산을 추가' }] },
    ] }),
  },
  {
    id: 'uml', name: 'UML', en: 'Unified Modeling Language', cat: 'design',
    summary: 'UML은 사물·관계·다이어그램으로 이루어진다. 다이어그램은 구조(정적)와 행위(동적)로 나뉜다.',
    match: ['UML', '클래스 다이어그램', '패키지 다이어그램', '시퀀스', '유스케이스', '컴포넌트 다이어그램', '배치 다이어그램', '활동 다이어그램', '상태 다이어그램', '일반화', '집합 관계', '연관', '실체화', '럼바우', '오퍼레이션', '다이어그램'],
    make: () => tabs([
      { name: '다이어그램 종류', make: board({ title: 'UML 다이어그램', groups: [
        { name: '구조 (정적)', en: 'Structural', hue: 210, items: [
          { name: '클래스', en: 'Class', desc: '클래스의 속성·오퍼레이션과 클래스 사이 관계' }, { name: '객체', en: 'Object', desc: '어느 순간의 객체(인스턴스)와 관계' },
          { name: '컴포넌트', en: 'Component', desc: '실제 구현 모듈과 인터페이스' }, { name: '배치', en: 'Deployment', desc: '물리적 노드(서버)와 그 위의 소프트웨어' },
          { name: '복합체 구조', en: 'Composite Structure', desc: '클래스 내부 구조' }, { name: '패키지', en: 'Package', desc: '요소들을 묶은 그룹과 그룹 사이 의존 관계' }] },
        { name: '행위 (동적)', en: 'Behavioral', hue: 30, items: [
          { name: '유스케이스', en: 'Use Case', desc: '사용자(액터)가 시스템으로 하는 일' }, { name: '시퀀스', en: 'Sequence', desc: '객체 사이 메시지를 시간 순서로' },
          { name: '커뮤니케이션', en: 'Communication', desc: '객체 사이 메시지와 연결 관계' }, { name: '상태', en: 'State', desc: '한 객체의 상태 변화' },
          { name: '활동', en: 'Activity', desc: '처리 흐름 (순서도와 비슷)' }, { name: '타이밍', en: 'Timing', desc: '시간 제약' }, { name: '상호작용 개요', en: 'Interaction Overview', desc: '상호작용들의 흐름' }] },
      ] }) },
      { name: '관계 표기', make: board({ title: 'UML 관계', groups: [
        { name: '전체-부분', hue: 210, items: [{ name: '집합', en: 'Aggregation ◇', desc: '빈 마름모. 부분이 따로 존재할 수 있다 (컴퓨터-키보드)' }, { name: '포함', en: 'Composition ◆', desc: '채운 마름모. 전체가 없어지면 부분도 없어진다 (집-방)' }] },
        { name: '상속·구현', hue: 30, items: [{ name: '일반화', en: 'Generalization △', desc: '빈 삼각형 실선 화살표. is-a (동물-고양이)' }, { name: '실체화', en: 'Realization', desc: '빈 삼각형 점선 화살표. 인터페이스 구현' }] },
        { name: '사용', hue: 140, items: [{ name: '연관', en: 'Association', desc: '실선. 서로 관계가 있다' }, { name: '의존', en: 'Dependency', desc: '점선 화살표. 잠깐 사용(매개변수 등)' }] },
      ], quiz: false }) },
      { name: '구성 요소·럼바우', make: board({ title: 'UML 구성 요소와 럼바우 모델링', groups: [
        { name: 'UML 구성 요소', hue: 210, items: [{ name: '사물', en: 'Things', desc: '구조·행동·그룹·주해 사물' }, { name: '관계', en: 'Relationships', desc: '사물 사이의 연관성' }, { name: '다이어그램', en: 'Diagram', desc: '사물과 관계를 그림으로' }, { name: '오퍼레이션', en: 'Operation', desc: '클래스 칸의 세 번째: 클래스가 할 수 있는 동작' }] },
        { name: '럼바우 (OMT)', hue: 30, desc: '분석 순서: 객체 → 동적 → 기능 ("객동기")', items: [{ name: '객체 모델링', en: 'Object', desc: '객체와 관계 (객체 다이어그램)' }, { name: '동적 모델링', en: 'Dynamic', desc: '시간에 따른 상태 변화 (상태 다이어그램)' }, { name: '기능 모델링', en: 'Functional', desc: '입력 → 처리 → 출력 흐름 (자료 흐름도 DFD)' }] },
      ], quiz: false }) },
    ]),
  },
  {
    id: 'requirements', name: '요구사항', en: 'Functional · Non-functional Requirements', cat: 'design',
    summary: '기능 요구사항은 시스템이 "무엇을" 하는가, 비기능 요구사항은 "어떻게·얼마나 잘"(성능, 보안, 운영, 자원 …).',
    match: ['요구사항', '기능 요구', '비기능', '기능적', '성능 요구', '요구 사항'],
    make: board({ title: '기능 요구사항과 비기능 요구사항', en: '항목을 섞어 직접 분류해 보세요', groups: [
      { name: '기능', en: 'Functional', hue: 140, desc: '사용자가 시스템으로 "할 수 있는 일"', items: [
        { name: '회원은 장바구니에 상품을 담는다' }, { name: '관리자는 주문을 취소할 수 있다' }, { name: '검색어로 상품을 찾는다' }] },
      { name: '성능', en: 'Performance', hue: 210, items: [{ name: '검색 응답 2초 이내' }, { name: '동시 접속 1,000명 처리' }] },
      { name: '보안', en: 'Security', hue: 0, items: [{ name: '개인정보는 암호화해 저장' }, { name: '5회 틀리면 계정 잠금' }] },
      { name: '운영', en: 'Operational', hue: 40, items: [{ name: '매일 새벽 자동 백업' }, { name: '관리 화면에서 서버 모니터링' }] },
      { name: '자원', en: 'Resource', hue: 280, items: [{ name: '메모리 4GB 안에서 동작' }] },
    ], note: '비기능 요구사항: 성능, 보안, 품질(신뢰성·사용성), 제약 사항, 운영, 자원, 인터페이스 …' }),
  },
  {
    id: 'ui', name: 'UI 설계', en: 'User Interface', cat: 'design',
    summary: 'UI 설계 원칙: 직관성·유효성·학습성·유연성. UI 종류: CLI(명령어) → GUI(그래픽) → NUI(자연스러운 동작) → OUI(사물).',
    match: ['UI', 'UX', 'GUI', 'NUI', 'CLI', 'OUI', '직관성', '유효성', '학습성', '유연성', '사용자 인터페이스', '사용자 경험'],
    make: board({ title: 'UI 설계 원칙과 종류', groups: [
      { name: 'UI 설계 원칙', hue: 210, desc: '외우기: "직유학유"', items: [
        { name: '직관성', en: 'Intuitiveness', desc: '누구나 쉽게 이해하고 바로 쓸 수 있어야 한다' }, { name: '유효성', en: 'Efficiency', desc: '사용자의 목적을 정확하게 달성해야 한다' },
        { name: '학습성', en: 'Learnability', desc: '누구나 쉽게 배우고 익힐 수 있어야 한다' }, { name: '유연성', en: 'Flexibility', desc: '요구를 최대한 수용하고 실수를 최소화해야 한다' }] },
      { name: 'UI 종류', hue: 30, items: [
        { name: 'CLI', en: 'Command Line Interface', desc: '명령어를 입력' }, { name: 'GUI', en: 'Graphical User Interface', desc: '아이콘·창·마우스' },
        { name: 'NUI', en: 'Natural User Interface', desc: '말·몸짓·터치 같은 자연스러운 동작' }, { name: 'OUI', en: 'Organic User Interface', desc: '모든 사물이 입출력 장치' }] },
      { name: 'UI와 UX', hue: 140, items: [{ name: 'UI', en: 'User Interface', desc: '사용자와 시스템이 만나는 접점(화면, 버튼)' }, { name: 'UX', en: 'User Experience', desc: '제품을 쓰며 느끼는 경험 전체' }] },
    ] }),
  },
  {
    id: 'archi', name: '설계 원칙과 아키텍처', en: 'SOLID · MVC · Architecture Pattern', cat: 'design',
    summary: 'SOLID는 객체지향 설계 5원칙, MVC는 모델·뷰·컨트롤러로 나누는 아키텍처 패턴이다.',
    match: ['MVC', 'SOLID', 'ISP', 'SRP', 'OCP', 'LSP', 'DIP', '인터페이스 분리', '아키텍처', '설계 원칙', '단일 책임', '개방-폐쇄', '리스코프', '의존 역전'],
    make: () => stack([
      graph({ title: 'MVC 패턴의 흐름', en: 'Model · View · Controller', w: 640, h: 260,
        nodes: [{ id: 'U', name: '사용자', x: 70, y: 130 }, { id: 'C', name: '컨트롤러', en: 'Controller', x: 260, y: 60, desc: '사용자 입력을 받아 모델·뷰에 일을 시킨다' }, { id: 'M', name: '모델', en: 'Model', x: 520, y: 60, desc: '데이터와 비즈니스 로직' }, { id: 'V', name: '뷰', en: 'View', x: 390, y: 200, desc: '사용자에게 보이는 화면' }],
        edges: [{ a: 'U', b: 'C', label: '입력' }, { a: 'C', b: 'M', label: '처리 요청' }, { a: 'M', b: 'V', label: '데이터' }, { a: 'V', b: 'U', label: '화면' }],
        scenarios: [{ name: '요청 한 번의 흐름', path: [['U', 'C', 'M', 'V', 'U']], notes: ['사용자가 버튼을 누른다', '컨트롤러가 모델에 처리를 맡긴다', '모델이 바뀐 데이터를 뷰에 알린다', '뷰가 화면을 다시 그린다 — 화면을 바꿔도 모델은 그대로'] }] })(),
      board({ title: 'SOLID 원칙', en: '객체지향 설계 5원칙', groups: [
        { name: 'S 단일 책임', en: 'SRP', hue: 0, items: [{ name: '클래스가 바뀌는 이유는 하나', desc: 'Single Responsibility Principle' }] },
        { name: 'O 개방-폐쇄', en: 'OCP', hue: 40, items: [{ name: '확장에 열리고 수정에 닫힘', desc: 'Open-Closed Principle' }] },
        { name: 'L 리스코프 치환', en: 'LSP', hue: 120, items: [{ name: '자식은 부모 자리에 들어가도 문제없다', desc: 'Liskov Substitution Principle' }] },
        { name: 'I 인터페이스 분리', en: 'ISP', hue: 200, items: [{ name: '쓰지 않는 메서드에 의존하지 않는다', desc: 'Interface Segregation Principle — 큰 인터페이스를 쓰임새별로 쪼갠다' }] },
        { name: 'D 의존 역전', en: 'DIP', hue: 280, items: [{ name: '구체 클래스가 아니라 추상에 의존', desc: 'Dependency Inversion Principle' }] },
      ], quiz: false })(),
      board({ title: '아키텍처 패턴', groups: [{ name: '종류', hue: 200, items: [
        { name: '계층', en: 'Layered', desc: '표현-비즈니스-데이터 계층으로 쌓는다' }, { name: '클라이언트-서버', desc: '요청하는 쪽과 응답하는 쪽' },
        { name: 'MVC', en: 'Model-View-Controller', desc: '데이터·화면·입력 처리를 나눈다' }, { name: '파이프-필터', desc: '처리 단계를 파이프로 잇는다 (유닉스 셸)' },
        { name: '브로커', desc: '중개자가 요청을 알맞은 서버에 연결' }, { name: '마스터-슬레이브', desc: '마스터가 일을 나눠 맡기고 결과를 모은다' },
        { name: '피어 투 피어', desc: '모두가 클라이언트이자 서버' }, { name: '이벤트 버스', desc: '이벤트를 채널로 발행·구독' }] }], quiz: false })(),
    ]),
  },
  {
    id: 'oop', name: '객체지향 핵심', en: 'Class · Inheritance · Polymorphism', cat: 'java',
    summary: '오버로딩은 같은 이름·다른 매개변수(컴파일 때 결정), 오버라이딩은 부모 메서드를 자식이 다시 정의(실행 때 객체로 결정).',
    match: ['오버라이딩', '오버로딩', '상속', '다형성', '생성자', '추상 클래스', '인터페이스', '업캐스팅', '캡슐화', 'super', 'static'],
    make: board({ title: '객체지향 핵심 개념', groups: [
      { name: '같은 이름, 다른 동작', hue: 210, items: [
        { name: '오버로딩', en: 'Overloading', desc: '한 클래스에서 이름은 같고 매개변수(개수·타입)가 다른 메서드들. 어느 것을 부를지는 "컴파일할 때" 인자 타입으로 정한다' },
        { name: '오버라이딩', en: 'Overriding', desc: '자식이 부모의 메서드를 같은 모양으로 다시 정의. 어느 것이 실행될지는 "실행할 때" 실제 객체로 정한다(동적 바인딩)' },
        { name: '필드·static은 재정의 X', desc: '필드와 static 메서드는 변수의 "타입"을 따른다 (은닉, hiding)' }] },
      { name: '객체 만들기', hue: 30, items: [
        { name: '생성자', en: 'Constructor', desc: '클래스와 이름이 같고 반환형이 없다. new 할 때 자동 호출' },
        { name: '생성 순서', desc: '부모 필드 초기화 → 부모 생성자 → 자식 필드 초기화 → 자식 생성자 나머지' },
        { name: 'this() · super()', desc: '같은 클래스의 다른 생성자 / 부모 생성자. 첫 줄에만' }] },
      { name: '추상화·다형성', hue: 140, items: [
        { name: '추상 클래스', en: 'abstract', desc: '추상 메서드를 가질 수 있고 new 할 수 없다. 자식이 구현' },
        { name: '인터페이스', en: 'interface', desc: '구현할 메서드 목록. implements로 구현, 여러 개 가능' },
        { name: '업캐스팅', desc: 'Parent p = new Child(); 부모 타입으로 자식 객체를 가리킨다' },
        { name: '캡슐화', en: 'Encapsulation', desc: '데이터와 기능을 묶고 private으로 내부를 숨긴다' }] },
    ], quiz: false }),
  },
];

// 글로만 설명하던 개념을 실제 동작 장면으로: 객체지향, E-R 다이어그램, 파일 편성, 데이터 신기술(맵리듀스·블록체인).
import { flowLab, type FLink, type FNode, type FScenario, type FStep, type Shape, type Tone } from './flow';

type NodeSpec = [id: string, name: string, x: number, z: number, shape?: Shape, color?: Tone, sub?: string];
const POOL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
function scene(name: string, tip: string, nodes: NodeSpec[], links: FLink[], steps: FStep[]): FScenario {
  const set: FScenario['set'] = Object.fromEntries(POOL.map((id) => [id, { hidden: true }]));
  for (const [id, n, x, z, shape, color, sub] of nodes) set![id] = { hidden: false, name: n, at: [x, z], shape: shape ?? 'box', color: color ?? 0x2563eb, sub, scale: 1 };
  return { name, tip, set, links, steps };
}
const pool = (body: string): FNode[] => POOL.map((id, i) => ({ id, name: id, at: [i - 5, 0], hidden: true, info: { title: '구성 요소', body } }));
const S = (text: string, extra: Partial<FStep> = {}): FStep => ({ say: text, wait: Math.min(2200, 700 + text.length * 16), ...extra });

// ───────────────────────── 객체지향 ─────────────────────────

export const oopLab = flowLab({
  title: '객체지향 3D', en: '오버로딩 · 오버라이딩 · 생성자 순서 · 캡슐화 · 추상 클래스 · static', height: 470,
  hint: '장면 단추를 누르면 객체와 메서드 사이로 호출이 오갑니다. 어느 메서드가 실행되는지 보세요.',
  nodes: pool('클래스·객체·메서드입니다. 파랑 = 클래스/메서드, 초록 = 객체, 보라 = 부모(또는 추상), 회색 사람 = 호출하는 코드.'),
  groups: [{ name: '장면', hue: 210, items: [
    scene('오버로딩', '컴파일 때 결정', [['a', 'main()', -6, 0, 'person', 0x64748b], ['b', 'add(int, int)', 1, -2.4, 'chip', 0x2563eb], ['c', 'add(double, double)', 1, 0, 'chip', 0x2563eb], ['d', 'add(int, int, int)', 1, 2.4, 'chip', 0x2563eb]],
      [['a', 'b'], ['a', 'c'], ['a', 'd']], [
        S('이름은 같고 매개변수(개수·타입)가 다른 메서드들입니다. 어느 것을 부를지는 인자를 보고 컴파일할 때 정합니다.', { code: 'add(1, 2);\nadd(1.5, 2.5);\nadd(1, 2, 3);' }),
        { send: { from: 'a', to: 'b', label: 'add(1, 2)' }, mark: [{ at: 'b', label: 'int 두 개 → 3', color: 'good' }] },
        { send: { from: 'a', to: 'c', label: 'add(1.5, 2.5)' }, mark: [{ at: 'c', label: 'double → 4.0', color: 'good' }] },
        { send: { from: 'a', to: 'd', label: 'add(1, 2, 3)' }, mark: [{ at: 'd', label: '세 개 → 6', color: 'good' }] },
        S('반환형만 다른 것은 오버로딩이 아닙니다(컴파일 오류). 오버로딩 = 정적 바인딩.', { tone: 'ok' }),
      ]),
    scene('오버라이딩', '실행 때 실제 객체로', [['a', 'Animal a = new Dog();', -6, 0, 'person', 0x64748b], ['b', 'Animal.speak()', 0, -2, 'chip', 0xa855f7, '"..."'], ['c', 'Dog.speak()', 0, 2, 'chip', 0x2563eb, '"멍멍" (재정의)'], ['d', 'Dog 객체', 5.5, 2, 'box', 0x16a34a, '실제 객체']],
      [['b', 'c', 'muted', '상속·재정의'], ['a', 'd', 'warn', '참조']], [
        S('변수 타입은 Animal이지만 실제 객체는 Dog입니다(업캐스팅).', { code: 'Animal a = new Dog();\na.speak();' }),
        { send: { from: 'a', to: 'b', label: 'a.speak()', fate: 'blocked' }, say: '컴파일러는 Animal에 speak()가 있는지만 확인합니다. 실행은 여기서 하지 않습니다.', tone: 'info' },
        { send: { from: 'a', to: 'd', label: '실제 객체는?' } },
        { send: { from: 'd', to: 'c', label: 'speak()' }, mark: [{ at: 'c', label: '"멍멍"', color: 'good' }], say: '실행할 때 실제 객체(Dog)의 재정의된 메서드가 불립니다 — 동적 바인딩.' },
        S('단, 필드와 static 메서드는 재정의되지 않고 변수 타입(Animal)을 따릅니다. 시험 코드 문제의 단골 함정입니다.', { tone: 'ok' }),
      ]),
    scene('생성자 순서', 'new Child()', [['a', 'new Child()', -6, 0, 'person', 0x64748b], ['b', 'Parent()', -1, -2, 'chip', 0xa855f7, '부모 생성자'], ['c', 'Child()', -1, 2, 'chip', 0x2563eb, '자식 생성자'], ['d', 'Child 객체', 5, 0, 'box', 0x16a34a, '완성']],
      [['a', 'c'], ['c', 'b', 'muted', 'super()'], ['c', 'd']], [
        S('자식 객체를 만들면 자식 생성자의 첫 줄에서 부모 생성자(super())가 먼저 실행됩니다.', { code: 'class Child extends Parent {\n  Child() { super(); print("C"); }\n}', set: { d: { hidden: true } } }),
        { send: { from: 'a', to: 'c', label: 'new' }, mark: [{ at: 'c', label: '첫 줄: super()', color: 'warn' }] },
        { send: { from: 'c', to: 'b', label: 'super()' }, mark: [{ at: 'b', label: '1. "P" 출력', color: 'good' }] },
        { send: { from: 'b', to: 'c', label: '복귀' }, mark: [{ at: 'c', label: '2. "C" 출력', color: 'good' }] },
        { set: { d: { hidden: false } }, send: { from: 'c', to: 'd', label: '완성' } },
        S('출력은 P → C. super()를 안 써도 컴파일러가 자동으로 넣습니다. 순서: 부모 필드 초기화 → 부모 생성자 → 자식 필드 초기화 → 자식 생성자.', { tone: 'ok' }),
      ]),
    scene('캡슐화', 'private과 getter', [['a', '외부 코드', -6, 0, 'person', 0x64748b], ['b', 'getBalance()', 0, -2, 'chip', 0x16a34a, 'public'], ['c', 'balance', 4.5, 0, 'db', 0xdc2626, 'private'], ['d', '자물쇠', 0, 2, 'wall', 0x94a3b8]],
      [['a', 'b'], ['b', 'c']], [
        S('데이터(필드)를 private으로 숨기고, 공개된 메서드로만 접근하게 합니다(정보 은닉).', { code: 'class Account {\n  private int balance;\n  public int getBalance() { return balance; }\n}' }),
        { send: { from: 'a', to: 'c', label: 'acc.balance', fate: 'blocked' }, say: '외부에서 private 필드에 바로 접근하면 컴파일 오류입니다.', tone: 'bad' },
        { send: { from: 'a', to: 'b', label: 'getBalance()' } },
        { send: { from: 'b', to: 'c', label: '읽기' } },
        { send: { from: 'c', to: 'a', label: '1000', color: 'good' } },
        S('메서드를 거치면 값 검사·권한 확인을 끼워 넣을 수 있습니다. 접근 제어자 범위: public > protected > (default) > private.', { tone: 'ok' }),
      ]),
    scene('추상 클래스', 'new 할 수 없음', [['a', '코드', -6, 0, 'person', 0x64748b], ['b', 'Shape (abstract)', -0.5, -2, 'box', 0xa855f7, 'area() 미구현'], ['c', 'Circle', -0.5, 2, 'box', 0x2563eb, 'area() 구현'], ['d', 'Circle 객체', 5, 2, 'box', 0x16a34a]],
      [['b', 'c', 'muted', 'extends']], [
        S('추상 클래스는 몸체 없는 추상 메서드를 가질 수 있고, 직접 객체를 만들 수 없습니다.', { code: 'abstract class Shape { abstract double area(); }', set: { d: { hidden: true } } }),
        { send: { from: 'a', to: 'b', label: 'new Shape()', fate: 'blocked' }, say: '추상 클래스는 new 할 수 없습니다(컴파일 오류).', tone: 'bad' },
        { send: { from: 'a', to: 'c', label: 'new Circle()' } },
        { set: { d: { hidden: false } }, send: { from: 'c', to: 'd', label: '생성', color: 'good' } },
        S('자식이 추상 메서드를 모두 구현해야 객체를 만들 수 있습니다. 인터페이스는 구현(implements)할 메서드 목록이고 여러 개를 구현할 수 있습니다.', { tone: 'ok' }),
      ]),
    scene('static', '모든 객체가 공유', [['a', '객체 1', -5, -2, 'box', 0x16a34a, 'count++'], ['b', '객체 2', -5, 0, 'box', 0x16a34a, 'count++'], ['c', '객체 3', -5, 2, 'box', 0x16a34a, 'count++'], ['d', 'static count', 2, 0, 'db', 0xf59e0b, '클래스에 하나']],
      [['a', 'd'], ['b', 'd'], ['c', 'd']], [
        S('static 필드는 객체마다 따로 있지 않고 클래스에 하나만 있어 모든 객체가 같이 씁니다.', { code: 'static int count = 0;\nCounter() { count++; }', set: { d: { sub: 'count = 0' } } }),
        { send: { from: 'a', to: 'd', label: '+1' }, set: { d: { sub: 'count = 1' } } },
        { send: { from: 'b', to: 'd', label: '+1' }, set: { d: { sub: 'count = 2' } } },
        { send: { from: 'c', to: 'd', label: '+1' }, set: { d: { sub: 'count = 3' } } },
        S('객체를 3개 만들면 count는 3. 인스턴스 필드였다면 각자 1이었을 것입니다. static 메서드는 객체 없이 클래스명.메서드()로 부릅니다.', { tone: 'ok' }),
      ]),
  ] }],
});

// ───────────────────────── E-R 다이어그램 ─────────────────────────

export const erLab = flowLab({
  title: 'E-R 다이어그램 3D', en: '개체 □ · 관계 ◇ · 속성 ○ · 대응 관계', height: 470,
  hint: '장면을 누르면 E-R 다이어그램이 기호 하나씩 만들어지고, 마지막에 테이블로 바뀌는 과정까지 보여 줍니다.',
  nodes: pool('E-R 다이어그램의 기호입니다. 파란 상자 = 개체(사각형), 보라 칩 = 관계(마름모), 초록 원판 = 속성(타원).'),
  groups: [{ name: '장면', hue: 200, items: [
    scene('기본 기호', '학생 수강 과목', [['a', '학생', -4.5, 0, 'box', 0x2563eb, '개체 □'], ['b', '수강', 0, 0, 'chip', 0xa855f7, '관계 ◇'], ['c', '과목', 4.5, 0, 'box', 0x2563eb, '개체 □'], ['d', '학번', -6.5, -2.6, 'disk', 0x16a34a, '기본키(밑줄)'], ['e', '이름', -3, -2.6, 'disk', 0x16a34a, '속성 ○'], ['f', '과목코드', 3, -2.6, 'disk', 0x16a34a, '기본키(밑줄)'], ['g', '성적', 0, -2.6, 'disk', 0x16a34a, '관계의 속성']],
      [['a', 'b', 'muted', 'N'], ['b', 'c', 'muted', 'M'], ['a', 'd'], ['a', 'e'], ['c', 'f'], ['b', 'g']], [
        S('피터 첸의 E-R 모델: 저장할 대상(개체), 그들 사이의 관계, 각자의 속성을 그림으로 나타냅니다.', { set: { b: { hidden: true }, d: { hidden: true }, e: { hidden: true }, f: { hidden: true }, g: { hidden: true } } }),
        { flash: [['a', 'c'], 'accent'], say: '사각형 = 개체(Entity): 학생, 과목.' },
        { set: { b: { hidden: false } }, mark: [{ at: 'b', label: '◇ 관계', color: 'accent' }], say: '마름모 = 관계(Relationship): 학생이 과목을 "수강한다".' },
        { set: { d: { hidden: false }, e: { hidden: false }, f: { hidden: false } }, say: '타원 = 속성(Attribute). 밑줄 친 속성이 기본키(학번, 과목코드).' },
        { set: { g: { hidden: false } }, say: '성적은 학생에도 과목에도 속하지 않고 "수강" 관계에 붙는 속성입니다.' },
        S('선 위의 N, M은 대응 관계(카디널리티): 학생 한 명이 여러 과목, 한 과목을 여러 학생 → N:M.', { tone: 'ok' }),
      ]),
    scene('대응 관계', '1:1 · 1:N · N:M', [['a', '사원', -4.5, -2.6, 'box', 0x2563eb], ['b', '배정', 0, -2.6, 'chip', 0xa855f7], ['c', '사물함', 4.5, -2.6, 'box', 0x2563eb], ['d', '부서', -4.5, 0, 'box', 0x2563eb], ['e', '소속', 0, 0, 'chip', 0xa855f7], ['f', '사원', 4.5, 0, 'box', 0x2563eb], ['g', '학생', -4.5, 2.6, 'box', 0x2563eb], ['h', '수강', 0, 2.6, 'chip', 0xa855f7], ['i', '과목', 4.5, 2.6, 'box', 0x2563eb]],
      [['a', 'b', 'muted', '1'], ['b', 'c', 'muted', '1'], ['d', 'e', 'muted', '1'], ['e', 'f', 'muted', 'N'], ['g', 'h', 'muted', 'N'], ['h', 'i', 'muted', 'M']], [
        { send: { from: 'a', to: 'c', label: '하나씩' }, say: '1:1 — 사원 한 명에 사물함 하나, 사물함 하나에 사원 한 명.', wait: 1200 },
        { send: { from: 'd', to: 'f', label: '여러 명', many: 3 }, say: '1:N — 부서 하나에 사원 여럿, 사원은 한 부서에만.', wait: 1200 },
        { send: [{ from: 'g', to: 'i', label: '여러 과목', many: 2 }, { from: 'i', to: 'g', label: '여러 학생', many: 2 }], say: 'N:M — 학생 여럿 ↔ 과목 여럿. 테이블로 바꿀 때 관계 자체가 별도 테이블(수강)이 됩니다.', wait: 1400 },
      ]),
    scene('테이블로 변환', '논리적 설계', [['a', '학생', -5, -1.6, 'box', 0x2563eb], ['b', '수강', 0, -1.6, 'chip', 0xa855f7], ['c', '과목', 5, -1.6, 'box', 0x2563eb], ['d', '학생 테이블', -5, 2.2, 'db', 0x16a34a, '학번 PK, 이름'], ['e', '수강 테이블', 0, 2.2, 'db', 0xf59e0b, '학번 FK, 과목코드 FK, 성적'], ['f', '과목 테이블', 5, 2.2, 'db', 0x16a34a, '과목코드 PK']],
      [['a', 'b', 'muted', 'N'], ['b', 'c', 'muted', 'M']], [
        S('개념적 설계(E-R)를 논리적 설계(관계 스키마)로 바꿉니다.', { set: { d: { hidden: true }, e: { hidden: true }, f: { hidden: true } } }),
        { set: { d: { hidden: false }, f: { hidden: false } }, send: [{ from: 'a', to: 'd', label: '개체 → 테이블' }, { from: 'c', to: 'f', label: '개체 → 테이블' }] },
        { set: { e: { hidden: false } }, send: { from: 'b', to: 'e', label: 'N:M 관계 → 테이블', color: 'warn' }, link: [['e', 'd', 'warn', 'FK'], ['e', 'f', 'warn', 'FK']] },
        S('N:M 관계는 양쪽 기본키를 외래키로 가진 새 테이블이 됩니다. 1:N 관계는 N쪽 테이블에 외래키를 넣으면 됩니다.', { tone: 'ok' }),
      ]),
  ] }],
});

// ───────────────────────── 파일 편성 ─────────────────────────

const rec = (i: number, x: number): NodeSpec => [String.fromCharCode(97 + i), `레코드 ${[10, 20, 30, 40, 50, 60][i]}`, x, 0, 'box', 0x64748b];
export const fileOrgLab = flowLab({
  title: '파일 편성 3D', en: '순차 · 색인 순차 · 직접(해싱)', height: 450,
  hint: '같은 레코드 50을 세 가지 방식으로 찾아봅니다. 몇 번 만에 도착하는지 비교하세요.',
  nodes: pool('파일에 저장된 레코드 또는 색인입니다.'),
  groups: [{ name: '찾기: 키 50', hue: 210, items: [
    scene('순차 파일', 'Sequential', [['i', '찾는 프로그램', -7, 2.6, 'person', 0x2563eb], rec(0, -5), rec(1, -3), rec(2, -1), rec(3, 1), rec(4, 3), rec(5, 5)],
      [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f']], [
        S('레코드를 키 순서대로 연속해서 저장합니다. 찾을 때는 처음부터 차례로 읽습니다.', { code: '순차 접근: 10 → 20 → 30 → 40 → 50' }),
        { travel: { path: ['i', 'a', 'b', 'c', 'd', 'e'], label: '50?', color: 'warn', notes: ['10 아님', '20 아님', '30 아님', '40 아님', '50 찾음! (5번 읽음)'] } },
        S('저장 효율이 좋고 일괄 처리에 빠르지만, 특정 레코드 하나를 찾거나 중간에 끼워 넣기는 느립니다.', { tone: 'ok' }),
      ]),
    scene('색인 순차 (ISAM)', 'Index + Sequential', [['i', '찾는 프로그램', -7, 2.6, 'person', 0x2563eb], ['g', '색인: ~30 | ~60', -5, -2.4, 'doc', 0xf59e0b, '색인 구역'], rec(0, -3, ), rec(1, -1), rec(2, 1), rec(3, 3), rec(4, 5), rec(5, 7)],
      [['g', 'a', 'muted', '~30'], ['g', 'd', 'muted', '~60'], ['a', 'b'], ['b', 'c'], ['d', 'e'], ['e', 'f']], [
        S('색인(목차)을 먼저 보고 해당 구역으로 간 뒤, 그 안에서 순차로 찾습니다. 순차·직접 접근 모두 가능합니다.', { code: '색인 → 구역 → 순차' }),
        { travel: { path: ['i', 'g', 'd', 'e'], label: '50?', color: 'warn', notes: ['색인: 50은 "~60" 구역', '구역 시작 40', '50 찾음! (3번 읽음)'] } },
        S('기본 구역 + 색인 구역 + 오버플로 구역으로 이루어집니다. 새 레코드가 끼어들 자리가 없으면 오버플로 구역에 들어갑니다.', { tone: 'ok' }),
      ]),
    scene('직접 파일 (해싱)', 'Direct', [['i', '찾는 프로그램', -7, 2.6, 'person', 0x2563eb], ['g', 'h(50) = 주소 4', -4, -2.4, 'chip', 0xa855f7, '해시 함수'], rec(0, -3), rec(1, -1), rec(2, 1), rec(3, 3), rec(4, 5), rec(5, 7)],
      [['i', 'g'], ['g', 'e', 'warn', '바로']], [
        S('키를 해시 함수에 넣어 저장 주소를 계산하고, 그 주소로 바로 갑니다.', { code: 'address = h(50)' }),
        { travel: { path: ['i', 'g', 'e'], label: '50?', color: 'warn', notes: ['해시 함수로 주소 계산', '주소 4로 직행 — 50 찾음! (1번 읽음)'] } },
        S('가장 빠르지만 충돌 처리가 필요하고, 키 순서대로 읽는 순차 처리에는 맞지 않습니다.', { tone: 'ok' }),
      ]),
  ] }],
});

// ───────────────────────── 데이터 신기술 ─────────────────────────

export const dataNewLab = flowLab({
  title: '데이터 신기술 3D', en: '하둡 맵리듀스 · 블록체인', height: 460,
  hint: '맵리듀스는 일을 나눠 처리하고 합치는 과정, 블록체인은 블록 하나를 고쳤을 때 사슬이 깨지는 모습을 보여 줍니다.',
  nodes: pool('분산 처리 노드 또는 블록입니다.'),
  groups: [{ name: '장면', hue: 160, items: [
    scene('맵리듀스', 'MapReduce', [['a', '큰 파일', -7, 0, 'doc', 0x64748b, '"사과 배 사과 …"'], ['b', '노드 1 (Map)', -2.5, -2.6, 'server', 0x2563eb], ['c', '노드 2 (Map)', -2.5, 0, 'server', 0x2563eb], ['d', '노드 3 (Map)', -2.5, 2.6, 'server', 0x2563eb], ['e', 'Reduce: 사과', 3, -1.4, 'server', 0x16a34a], ['f', 'Reduce: 배', 3, 1.4, 'server', 0x16a34a], ['g', '결과', 7, 0, 'db', 0xf59e0b]],
      [['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e'], ['b', 'f'], ['c', 'e'], ['c', 'f'], ['d', 'e'], ['d', 'f'], ['e', 'g'], ['f', 'g']], [
        S('하둡은 큰 데이터를 여러 컴퓨터에 나눠 저장(HDFS)하고 나눠 처리(맵리듀스)합니다. 예: 단어 세기.', { code: 'Map: (단어, 1)\nReduce: 단어별 합계' }),
        { send: { from: 'a', to: ['b', 'c', 'd'], label: '조각' }, say: '파일을 조각내 여러 노드에 나눠 줍니다.' },
        { mark: [{ at: 'b', label: '(사과,1)(배,1)', color: 'accent' }, { at: 'c', label: '(사과,1)(사과,1)', color: 'accent' }, { at: 'd', label: '(배,1)(사과,1)', color: 'accent' }], say: 'Map: 각 노드가 동시에 자기 조각에서 (단어, 1) 쌍을 만듭니다.' },
        { send: [{ from: 'b', to: 'e', label: '사과' }, { from: 'c', to: 'e', label: '사과×2' }, { from: 'd', to: 'e', label: '사과' }, { from: 'b', to: 'f', label: '배' }, { from: 'd', to: 'f', label: '배' }], say: '셔플: 같은 단어끼리 같은 Reduce 노드로 모읍니다.' },
        { mark: [{ at: 'e', label: '사과 = 4', color: 'good' }, { at: 'f', label: '배 = 2', color: 'good' }], say: 'Reduce: 모인 값을 합칩니다.' },
        { send: [{ from: 'e', to: 'g', label: '사과 4' }, { from: 'f', to: 'g', label: '배 2' }] },
        S('나눠서(Map) 동시에 처리하고 모아서 합치므로(Reduce) 컴퓨터를 늘리면 빨라집니다(수평 확장).', { tone: 'ok' }),
      ]),
    scene('블록체인', '위·변조 방지', [['a', '블록 1', -6, 0, 'box', 0x2563eb, '해시 a1f'], ['b', '블록 2', -2, 0, 'box', 0x2563eb, '이전 a1f · 해시 7c2'], ['c', '블록 3', 2, 0, 'box', 0x2563eb, '이전 7c2 · 해시 e90'], ['d', '블록 4', 6, 0, 'box', 0x2563eb, '이전 e90 · 해시 4b8'], ['e', '참여자들', 0, 3, 'cloud', 0x16a34a, '모두 같은 장부를 가짐']],
      [['a', 'b', 'good', '해시 연결'], ['b', 'c', 'good', '해시 연결'], ['c', 'd', 'good', '해시 연결']], [
        S('각 블록은 이전 블록의 해시값을 담고 있어 사슬처럼 이어집니다. 장부는 여러 참여자가 똑같이 나눠 가집니다(분산 원장).'),
        { set: { b: { color: 0xdc2626, sub: '거래 금액 조작! 해시 7c2 → 9d1' } }, flash: [['b'], 'bad'], say: '누군가 블록 2의 거래 내용을 고치면 블록 2의 해시가 바뀝니다.', tone: 'bad' },
        { link: [['b', 'c', 'bad', '불일치!'], ['c', 'd', 'bad', '다시 계산해야']], set: { c: { color: 0xf59e0b }, d: { color: 0xf59e0b } }, say: '블록 3이 기억하는 "이전 해시 7c2"와 맞지 않아 사슬이 끊어집니다. 뒤의 모든 블록을 다시 계산해야 합니다.', tone: 'bad' },
        { send: { from: 'e', to: 'b', label: '다른 장부와 비교', color: 'bad', fate: 'blocked' }, say: '게다가 다른 참여자들의 장부와 다르므로 거부됩니다.', tone: 'bad' },
        S('그래서 블록체인은 위·변조가 사실상 불가능합니다. 비트코인 같은 암호화폐, 이력 추적에 씁니다.', { tone: 'ok' }),
      ]),
  ] }],
});

// GoF 디자인 패턴 23가지를 3D로: 패턴마다 객체(노드)를 세우고, 실제 호출·생성·전달이 어떻게 오가는지 패킷으로 보여 준다.
import { flowLab, type FLink, type FNode, type FScenario, type FStep, type Shape, type Tone } from './flow';

type NodeSpec = [id: string, name: string, x: number, z: number, shape?: Shape, color?: Tone, sub?: string];
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const C = { client: 0x64748b, cls: 0x2563eb, obj: 0x16a34a, abs: 0xa855f7, new: 0xf59e0b } as const;

/** 패턴 하나: 쓰는 노드만 보이게 하고 나머지는 숨긴다 */
function pat(name: string, tip: string, nodes: NodeSpec[], links: FLink[], steps: FStep[]): FScenario {
  const set: FScenario['set'] = Object.fromEntries(IDS.map((id) => [id, { hidden: true }]));
  for (const [id, n, x, z, shape, color, sub] of nodes) set![id] = { hidden: false, name: n, at: [x, z], shape: shape ?? 'box', color: color ?? C.cls, sub, scale: 1 };
  return { name, tip, set, links, steps };
}
const say = (text: string, extra: Partial<FStep> = {}): FStep => ({ say: text, wait: Math.min(2200, 700 + text.length * 16), ...extra });

const CREATIONAL: FScenario[] = [
  pat('Singleton', '인스턴스를 하나만', [['a', '클라이언트 A', -5, 2, 'person', C.client], ['b', '클라이언트 B', 0, 2.6, 'person', C.client], ['c', '클라이언트 C', 5, 2, 'person', C.client], ['d', 'Config', 0, -1.6, 'box', C.cls, 'private 생성자'], ['e', '유일한 객체', 3.8, -2.2, 'db', C.obj]],
    [['a', 'd'], ['b', 'd'], ['c', 'd'], ['d', 'e', 'muted', 'instance']],
    [
      say('생성자를 private으로 막고, getInstance()로만 객체를 얻게 합니다.', { code: 'Config.getInstance()', set: { e: { hidden: true } } }),
      { send: { from: 'a', to: 'd', label: 'getInstance()' }, say: 'A가 처음 요청: 아직 객체가 없으므로 새로 만듭니다.' },
      { set: { e: { hidden: false } }, mark: [{ at: 'e', label: 'new (한 번만)', color: 'warn' }], wait: 900 },
      { send: { from: 'd', to: 'a', label: '같은 객체', color: 'good' } },
      { send: [{ from: 'b', to: 'd', label: 'getInstance()' }, { from: 'c', to: 'd', label: 'getInstance()' }], say: 'B와 C의 요청에는 이미 만든 객체를 그대로 돌려줍니다.' },
      { send: [{ from: 'd', to: 'b', label: '같은 객체', color: 'good' }, { from: 'd', to: 'c', label: '같은 객체', color: 'good' }] },
      say('결과: 어디서 요청하든 객체는 하나뿐(전역 접근점). 설정·로그·DB 연결 풀처럼 하나만 있어야 하는 것에 씁니다.', { tone: 'ok' }),
    ]),
  pat('Factory Method', '생성을 서브클래스에 맡김', [['a', '클라이언트', -5.5, 0, 'person', C.client], ['b', 'Creator', -1.5, -1.6, 'box', C.abs, '추상: create()'], ['c', '피자가게(뉴욕)', -1.5, 1.8, 'box', C.cls, 'create() 재정의'], ['d', '뉴욕 피자', 3.6, 1.8, 'box', C.obj]],
    [['a', 'b'], ['b', 'c', 'muted', '상속'], ['c', 'd']],
    [
      say('상위 클래스는 "만든다"는 틀만 정하고, 어떤 객체를 만들지는 하위 클래스가 결정합니다.', { code: 'PizzaStore store = new NYStore();\nstore.order();', set: { d: { hidden: true } } }),
      { send: { from: 'a', to: 'b', label: 'order()' }, say: '클라이언트는 상위 타입(Creator)에만 의존합니다.' },
      { send: { from: 'b', to: 'c', label: 'create()' }, say: '실제 생성은 하위 클래스가 재정의한 create()(팩토리 메서드)가 합니다.' },
      { set: { d: { hidden: false } }, mark: [{ at: 'd', label: 'new 뉴욕 피자', color: 'warn' }] },
      { send: { from: 'd', to: 'a', label: '피자', color: 'good' } },
      say('다른 가게(시카고)를 추가해도 클라이언트 코드는 그대로 — 생성 코드를 서브클래스로 분리(가상 생성자).', { tone: 'ok' }),
    ]),
  pat('Abstract Factory', '관련 객체 묶음을 통째로', [['a', '클라이언트', -6, 0, 'person', C.client], ['b', '윈도 팩토리', -1.8, -1.8, 'box', C.cls], ['c', '맥 팩토리', -1.8, 1.8, 'box', C.cls], ['d', '버튼', 3, -1.8, 'box', C.obj], ['e', '체크박스', 5.8, -1.8, 'box', C.obj], ['f', '버튼', 3, 1.8, 'box', C.new], ['g', '체크박스', 5.8, 1.8, 'box', C.new]],
    [['a', 'b'], ['a', 'c'], ['b', 'd'], ['b', 'e'], ['c', 'f'], ['c', 'g']],
    [
      say('서로 관련된 객체들(제품군)을 구체 클래스를 몰라도 한꺼번에 만들게 하는 인터페이스입니다.', { code: 'GUIFactory f = new WinFactory();\nf.createButton(); f.createCheckbox();', set: { d: { hidden: true }, e: { hidden: true }, f: { hidden: true }, g: { hidden: true } } }),
      { send: { from: 'a', to: 'b', label: '윈도 부품 주세요' } },
      { send: [{ from: 'b', to: 'd', label: 'new' }, { from: 'b', to: 'e', label: 'new' }], set: { d: { hidden: false, name: '윈도 버튼' }, e: { hidden: false, name: '윈도 체크박스' } }, say: '윈도 팩토리는 윈도 모양 부품만 일관되게 만듭니다.' },
      { send: { from: 'a', to: 'c', label: '맥 부품 주세요' }, say: '팩토리만 바꾸면 제품군 전체가 바뀝니다.' },
      { send: [{ from: 'c', to: 'f', label: 'new' }, { from: 'c', to: 'g', label: 'new' }], set: { f: { hidden: false, name: '맥 버튼' }, g: { hidden: false, name: '맥 체크박스' } } },
      say('윈도 버튼과 맥 체크박스가 섞이는 일이 없습니다. (팩토리 메서드는 객체 하나, 추상 팩토리는 관련 객체 묶음)', { tone: 'ok' }),
    ]),
  pat('Builder', '단계별로 조립', [['a', 'Director', -5.5, 0, 'person', C.client, '조립 순서'], ['b', 'Builder', -1.2, 0, 'box', C.cls], ['c', '집 (Product)', 4.5, 0, 'box', C.obj, '조립 중']],
    [['a', 'b'], ['b', 'c']],
    [
      say('복잡한 객체를 단계별로 조립합니다. 같은 조립 순서로 다른 표현(나무집/돌집)을 만들 수 있습니다.', { code: 'builder.buildWall().buildRoof().buildWindow();\nHouse h = builder.getResult();' }),
      { send: { from: 'a', to: 'b', label: 'buildWall()' } }, { send: { from: 'b', to: 'c', label: '벽', color: 'warn' }, set: { c: { sub: '벽' } } },
      { send: { from: 'a', to: 'b', label: 'buildRoof()' } }, { send: { from: 'b', to: 'c', label: '지붕', color: 'warn' }, set: { c: { sub: '벽 · 지붕' } } },
      { send: { from: 'a', to: 'b', label: 'buildWindow()' } }, { send: { from: 'b', to: 'c', label: '창문', color: 'warn' }, set: { c: { sub: '벽 · 지붕 · 창문 ✔' } } },
      say('생성 과정(Director)과 표현(Builder)을 분리해, 부품이 많은 객체도 읽기 쉽게 만듭니다.', { tone: 'ok' }),
    ]),
  pat('Prototype', '복제해서 만들기', [['a', '클라이언트', -5.5, 0, 'person', C.client], ['b', '원본 몬스터', -1, -1.4, 'box', C.cls, '체력 100'], ['c', '복제본', 4, 1.4, 'box', C.new, '체력 100']],
    [['a', 'b'], ['b', 'c', 'muted', 'clone()']],
    [
      say('비용이 큰 생성 대신, 원본 객체를 복제(clone)해서 새 객체를 만듭니다.', { code: 'Monster m2 = original.clone();', set: { c: { hidden: true } } }),
      { send: { from: 'a', to: 'b', label: 'clone()' } },
      { set: { c: { hidden: false } }, send: { from: 'b', to: 'c', label: '복사', color: 'warn' }, say: '원본의 상태를 그대로 복사한 새 객체가 생겼습니다.' },
      { set: { c: { sub: '체력 50 (수정)' } }, flash: [['c'], 'warn'], say: '복제본을 고쳐도 원본(체력 100)은 그대로입니다(깊은 복사의 경우).', tone: 'ok' },
    ]),
];

const STRUCTURAL: FScenario[] = [
  pat('Adapter', '인터페이스 변환', [['a', '클라이언트', -6, 0, 'person', C.client, '220V 플러그'], ['b', 'Adapter', -1, 0, 'chip', C.new, '변환기'], ['c', '기존 기기', 4.5, 0, 'box', C.cls, '110V 전용']],
    [['a', 'b'], ['b', 'c']],
    [
      say('맞지 않는 인터페이스를 중간에서 변환해, 기존 클래스를 고치지 않고 함께 쓰게 합니다.', { code: 'Target t = new Adapter(new OldDevice());\nt.request();' }),
      { send: { from: 'a', to: 'c', label: 'request()', fate: 'blocked' }, say: '바로 부르면 인터페이스가 달라 쓸 수 없습니다.', tone: 'bad' },
      { send: { from: 'a', to: 'b', label: 'request()' }, say: '클라이언트는 자신이 아는 request()를 어댑터에 부릅니다.' },
      { send: { from: 'b', to: 'c', label: 'specificRequest()' }, say: '어댑터가 기존 기기의 메서드 이름·형식으로 바꿔 호출합니다.' },
      { send: { from: 'c', to: 'a', label: '결과', color: 'good' } },
      say('돼지코(변환 플러그)와 같습니다. 클래스 어댑터(상속)와 객체 어댑터(합성)가 있습니다.', { tone: 'ok' }),
    ]),
  pat('Bridge', '기능과 구현을 분리', [['a', '리모컨', -4.5, -1.8, 'box', C.abs, '기능 계층'], ['b', '고급 리모컨', -4.5, 1.8, 'box', C.cls, '+ mute()'], ['c', 'TV', 3.5, -1.8, 'box', C.obj, '구현 계층'], ['d', '라디오', 3.5, 1.8, 'box', C.obj]],
    [['a', 'b', 'muted', '상속'], ['a', 'c', 'warn', '다리'], ['c', 'd', 'muted', '같은 인터페이스']],
    [
      say('기능의 계층(리모컨 종류)과 구현의 계층(기기 종류)을 다리로 연결해 따로따로 확장합니다.', { code: 'Remote r = new Remote(new TV());\nr.power();' }),
      { send: { from: 'a', to: 'c', label: 'on()' }, say: '리모컨은 구현 객체(TV)를 가지고(합성) 그에게 일을 맡깁니다.' },
      { link: [['a', 'd', 'warn', '다리']], unlink: [['a', 'c']], say: '구현을 라디오로 바꿔 끼워도 리모컨 코드는 그대로입니다.' },
      { send: { from: 'a', to: 'd', label: 'on()' } },
      say('리모컨 2종 × 기기 2종을 상속으로 만들면 4개 클래스, 브리지는 2 + 2개. 조합 폭발을 막습니다.', { tone: 'ok' }),
    ]),
  pat('Composite', '부분-전체를 같은 방식으로', [['a', '클라이언트', -6.5, 0, 'person', C.client], ['b', '폴더 /', -3, 0, 'box', C.cls], ['c', '폴더 사진', 0.5, -1.8, 'box', C.cls], ['d', 'a.txt 3KB', 0.5, 1.8, 'doc', C.obj], ['e', 'b.jpg 5KB', 4.2, -2.8, 'doc', C.obj], ['f', 'c.jpg 4KB', 4.2, -0.6, 'doc', C.obj]],
    [['a', 'b'], ['b', 'c'], ['b', 'd'], ['c', 'e'], ['c', 'f']],
    [
      say('개별 객체(파일)와 복합 객체(폴더)를 같은 인터페이스로 다뤄 트리 구조를 만듭니다.', { code: 'root.getSize();   // 폴더든 파일이든 같은 메서드' }),
      { send: { from: 'a', to: 'b', label: 'getSize()' } },
      { send: [{ from: 'b', to: 'c', label: 'getSize()' }, { from: 'b', to: 'd', label: 'getSize()' }], say: '폴더는 자식들에게 같은 요청을 그대로 넘깁니다(재귀).' },
      { send: [{ from: 'c', to: 'e', label: 'getSize()' }, { from: 'c', to: 'f', label: 'getSize()' }] },
      { send: [{ from: 'e', to: 'c', label: '5', color: 'good' }, { from: 'f', to: 'c', label: '4', color: 'good' }, { from: 'd', to: 'b', label: '3', color: 'good' }] },
      { send: { from: 'c', to: 'b', label: '9', color: 'good' } },
      { send: { from: 'b', to: 'a', label: '12KB', color: 'good' } },
      say('클라이언트는 상대가 파일인지 폴더인지 신경 쓰지 않습니다. 메뉴·조직도·그림판의 그룹 도형도 같은 구조입니다.', { tone: 'ok' }),
    ]),
  pat('Decorator', '기능을 겹겹이 덧붙임', [['a', '클라이언트', -6.5, 0, 'person', C.client], ['b', '시럽', -2.8, 0, 'box', C.new, '+500'], ['c', '우유', 0.6, 0, 'box', C.new, '+500'], ['d', '커피', 4, 0, 'box', C.cls, '3000']],
    [['a', 'b'], ['b', 'c', 'muted', '감쌈'], ['c', 'd', 'muted', '감쌈']],
    [
      say('객체를 장식 객체로 감싸 기능을 동적으로 추가합니다. 상속 없이 조합으로 확장합니다.', { code: 'Beverage b = new Syrup(new Milk(new Coffee()));\nb.cost();' }),
      { send: { from: 'a', to: 'b', label: 'cost()' } }, { send: { from: 'b', to: 'c', label: 'cost()' } }, { send: { from: 'c', to: 'd', label: 'cost()' }, say: '요청이 가장 안쪽 객체까지 전달됩니다.' },
      { send: { from: 'd', to: 'c', label: '3000', color: 'good' } }, { send: { from: 'c', to: 'b', label: '3500', color: 'good' }, say: '돌아오면서 각 장식이 자기 몫을 더합니다.' },
      { send: { from: 'b', to: 'a', label: '4000', color: 'good' } },
      say('우유·시럽을 몇 겹이든 순서대로 감쌀 수 있습니다. 자바의 new BufferedReader(new FileReader(…))가 대표 예.', { tone: 'ok' }),
    ]),
  pat('Facade', '복잡한 하위 시스템에 단순한 창구', [['a', '클라이언트', -6.5, 0, 'person', C.client], ['b', '홈시어터 Facade', -2.2, 0, 'box', C.new, 'watchMovie()'], ['c', '앰프', 3, -2.6, 'box', C.cls], ['d', '프로젝터', 3, 0, 'box', C.cls], ['e', '플레이어', 3, 2.6, 'box', C.cls]],
    [['a', 'b'], ['b', 'c'], ['b', 'd'], ['b', 'e']],
    [
      say('복잡한 여러 클래스를 하나의 단순한 인터페이스(창구) 뒤에 숨깁니다.', { code: 'theater.watchMovie();' }),
      { send: { from: 'a', to: 'b', label: 'watchMovie()' }, say: '클라이언트는 한 번만 부릅니다.' },
      { send: [{ from: 'b', to: 'c', label: 'on()' }, { from: 'b', to: 'd', label: 'on()' }, { from: 'b', to: 'e', label: 'play()' }], say: '퍼사드가 하위 시스템들을 알맞은 순서로 대신 부릅니다.' },
      say('하위 시스템과의 결합도가 낮아집니다. 은행 창구 직원 한 명이 내부 여러 부서 일을 대신 처리하는 것과 같습니다.', { tone: 'ok' }),
    ]),
  pat('Flyweight', '공유로 메모리 절약', [['a', '나무 1', -5, -2, 'box', C.client, '위치 (1,2)'], ['b', '나무 2', -5, 0, 'box', C.client, '위치 (5,3)'], ['c', '나무 3', -5, 2, 'box', C.client, '위치 (8,1)'], ['d', 'Factory', -0.8, 0, 'box', C.cls, '캐시'], ['e', '소나무 모양', 4, 0, 'db', C.obj, '텍스처·모델 (공유)']],
    [['a', 'd'], ['b', 'd'], ['c', 'd'], ['d', 'e']],
    [
      say('같은 데이터(내적 상태)는 하나만 만들어 여러 객체가 공유하고, 다른 부분(외적 상태: 위치)만 따로 가집니다.', { code: 'TreeType t = factory.get("소나무");', set: { e: { hidden: true } } }),
      { send: { from: 'a', to: 'd', label: 'get(소나무)' } },
      { set: { e: { hidden: false } }, mark: [{ at: 'e', label: '처음만 생성', color: 'warn' }] },
      { send: [{ from: 'b', to: 'd', label: 'get(소나무)' }, { from: 'c', to: 'd', label: 'get(소나무)' }], say: '이미 있는 소나무 모양을 그대로 돌려줍니다.' },
      { send: [{ from: 'e', to: 'a', label: '공유', color: 'good' }, { from: 'e', to: 'b', label: '공유', color: 'good' }, { from: 'e', to: 'c', label: '공유', color: 'good' }] },
      say('나무 10만 그루도 무거운 모양 데이터는 하나 — 메모리를 크게 아낍니다. 자바의 String 상수 풀과 비슷합니다.', { tone: 'ok' }),
    ]),
  pat('Proxy', '대리인이 접근을 제어', [['a', '클라이언트', -6, 0, 'person', C.client], ['b', 'Proxy', -1.2, 0, 'chip', C.new, '대리인'], ['c', '실제 이미지', 4.5, 0, 'server', C.cls, '무거움']],
    [['a', 'b'], ['b', 'c']],
    [
      say('실제 객체 대신 대리 객체를 세워 접근을 제어합니다(지연 생성·접근 권한·캐시·원격).', { code: 'Image img = new ImageProxy("big.jpg");\nimg.display();', set: { c: { hidden: true } } }),
      { send: { from: 'a', to: 'b', label: 'display()' }, say: '클라이언트는 실제 객체와 똑같은 인터페이스로 프록시를 부릅니다.' },
      { set: { c: { hidden: false } }, mark: [{ at: 'c', label: '필요할 때 생성', color: 'warn' }], say: '무거운 실제 객체는 정말 필요할 때 처음 만듭니다(가상 프록시).' },
      { send: { from: 'b', to: 'c', label: 'display()' } },
      { send: { from: 'c', to: 'a', label: '그림', color: 'good' } },
      say('권한 확인(보호 프록시), 결과 저장(캐시 프록시), 다른 컴퓨터의 객체 대리(원격 프록시)도 같은 구조입니다.', { tone: 'ok' }),
    ]),
];

const BEHAVIORAL: FScenario[] = [
  pat('Chain of Resp.', '처리할 수 있는 객체까지 전달', [['a', '요청: 휴가 5일', -6.5, 0, 'doc', C.client], ['b', '팀장', -2.8, 0, 'person', C.cls, '3일까지'], ['c', '부장', 0.9, 0, 'person', C.cls, '7일까지'], ['d', '사장', 4.6, 0, 'person', C.cls, '전부']],
    [['a', 'b'], ['b', 'c', 'muted', 'next'], ['c', 'd', 'muted', 'next']],
    [
      say('요청을 처리할 수 있는 객체가 나올 때까지 사슬을 따라 넘깁니다. 보내는 쪽은 누가 처리할지 모릅니다.', { code: 'teamLead.handle(request);' }),
      { send: { from: 'a', to: 'b', label: '5일' }, mark: [{ at: 'b', label: '권한 밖 → 다음', color: 'bad' }] },
      { send: { from: 'b', to: 'c', label: '5일' }, mark: [{ at: 'c', label: '승인!', color: 'good' }] },
      say('부장이 처리하고 사슬이 끝납니다. 처리자를 추가·순서 변경해도 요청자 코드는 그대로입니다(예: 예외 처리, 필터 체인).', { tone: 'ok' }),
    ]),
  pat('Command', '요청을 객체로 캡슐화', [['a', '리모컨 버튼', -6, 0, 'phone', C.client, 'Invoker'], ['b', '켜기 명령', -1.5, 0, 'doc', C.new, 'execute() · undo()'], ['c', '전등', 3.8, 0, 'box', C.cls, 'Receiver']],
    [['a', 'b'], ['b', 'c']],
    [
      say('요청 자체를 객체로 만들어 매개변수화·대기열·기록·되돌리기(undo)를 할 수 있게 합니다.', { code: 'button.setCommand(new LightOnCommand(light));\nbutton.press();' }),
      { send: { from: 'a', to: 'b', label: 'execute()' }, say: '버튼은 무슨 일이 일어나는지 모르고 명령 객체의 execute()만 부릅니다.' },
      { send: { from: 'b', to: 'c', label: 'on()' }, set: { c: { color: 0xfacc15, sub: '켜짐' } } },
      { send: { from: 'a', to: 'b', label: 'undo()', color: 'warn' }, say: '명령 객체가 이전 상태를 기억하므로 되돌릴 수 있습니다.' },
      { send: { from: 'b', to: 'c', label: 'off()', color: 'warn' }, set: { c: { color: 0x2563eb, sub: '꺼짐' } } },
      say('명령을 큐에 쌓거나(작업 예약) 기록해 두고 다시 실행(매크로)할 수도 있습니다.', { tone: 'ok' }),
    ]),
  pat('Interpreter', '문법 규칙을 클래스로', [['a', '"1 + 2 × 3"', -6.5, 0, 'doc', C.client], ['b', '+ (덧셈식)', -2, 0, 'chip', C.abs], ['c', '1 (숫자)', 1.5, -2, 'chip', C.obj], ['d', '× (곱셈식)', 1.5, 2, 'chip', C.abs], ['e', '2', 5, 1, 'chip', C.obj], ['f', '3', 5, 3, 'chip', C.obj]],
    [['a', 'b'], ['b', 'c'], ['b', 'd'], ['d', 'e'], ['d', 'f']],
    [
      say('언어의 문법 규칙 하나하나를 클래스로 표현하고, 문장을 그 객체들의 트리로 만들어 해석합니다.', { code: 'expr.interpret();  // SQL·정규식 해석기' }),
      { send: { from: 'a', to: 'b', label: 'interpret()' } },
      { send: [{ from: 'b', to: 'c', label: 'interpret()' }, { from: 'b', to: 'd', label: 'interpret()' }] },
      { send: [{ from: 'd', to: 'e', label: '?' }, { from: 'd', to: 'f', label: '?' }] },
      { send: { from: 'd', to: 'b', label: '6', color: 'good' } }, { send: { from: 'c', to: 'b', label: '1', color: 'good' } },
      { send: { from: 'b', to: 'a', label: '7', color: 'good' }, say: '각 노드가 자기 규칙대로 계산해 결과를 올려 보냅니다.', tone: 'ok' },
    ]),
  pat('Iterator', '내부 구조를 몰라도 차례로', [['a', '클라이언트', -6.5, 0, 'person', C.client], ['b', 'Iterator', -2.4, 0, 'chip', C.new, 'hasNext · next'], ['c', '1', 1.8, 0, 'box', C.obj], ['d', '2', 3.6, 0, 'box', C.obj], ['e', '3', 5.4, 0, 'box', C.obj]],
    [['a', 'b'], ['c', 'd', 'muted'], ['d', 'e', 'muted']],
    [
      say('컬렉션의 내부 구조(배열·리스트·트리)를 드러내지 않고 요소를 하나씩 차례로 꺼냅니다.', { code: 'Iterator it = list.iterator();\nwhile (it.hasNext()) it.next();' }),
      { send: { from: 'a', to: 'b', label: 'next()' } }, { send: { from: 'c', to: 'a', label: '1', color: 'good' }, flash: [['c'], 'warn'] },
      { send: { from: 'a', to: 'b', label: 'next()' } }, { send: { from: 'd', to: 'a', label: '2', color: 'good' }, flash: [['d'], 'warn'] },
      { send: { from: 'a', to: 'b', label: 'next()' } }, { send: { from: 'e', to: 'a', label: '3', color: 'good' }, flash: [['e'], 'warn'] },
      { send: { from: 'a', to: 'b', label: 'hasNext()' } }, { send: { from: 'b', to: 'a', label: 'false', color: 'bad' } },
      say('자바의 for-each도 내부에서 반복자를 씁니다. 순회 방법이 바뀌어도 클라이언트 코드는 같습니다.', { tone: 'ok' }),
    ]),
  pat('Mediator', '중재자가 대신 연결', [['a', '비행기 A', -5, -2.2, 'box', C.client], ['b', '비행기 B', -5, 2.2, 'box', C.client], ['c', '관제탑', 0, 0, 'server', C.new, 'Mediator'], ['d', '비행기 C', 5, -2.2, 'box', C.client], ['e', '비행기 D', 5, 2.2, 'box', C.client]],
    [['a', 'c'], ['b', 'c'], ['d', 'c'], ['e', 'c']],
    [
      say('객체들이 서로 직접 통신하지 않고 중재자를 통해서만 소통하게 해, N:N 관계를 1:N으로 줄입니다.', { code: 'tower.request(planeA, "착륙");' }),
      { send: { from: 'a', to: 'c', label: '착륙 요청' } },
      { send: [{ from: 'c', to: 'b', label: '대기' }, { from: 'c', to: 'd', label: '대기' }, { from: 'c', to: 'e', label: '대기' }], say: '관제탑이 다른 비행기들에게 필요한 지시를 대신 전달합니다.' },
      { send: { from: 'c', to: 'a', label: '착륙 허가', color: 'good' } },
      say('비행기끼리는 서로를 몰라도 됩니다(결합도 감소). 채팅방 서버, GUI 대화상자도 같은 구조입니다.', { tone: 'ok' }),
    ]),
  pat('Memento', '상태를 저장했다가 복원', [['a', '문서 (Originator)', -4.5, 0, 'doc', C.cls, '내용: 안녕'], ['b', '스냅숏 (Memento)', 0.5, -1.6, 'box', C.new], ['c', '되돌리기 목록', 4.8, 0, 'db', C.client, 'Caretaker']],
    [['a', 'c'], ['b', 'c', 'muted']],
    [
      say('캡슐화를 깨지 않고 객체의 상태를 저장해 두었다가 나중에 그 상태로 되돌립니다(Ctrl+Z).', { code: 'Memento m = doc.save();\n…\ndoc.restore(m);', set: { b: { hidden: true } } }),
      { set: { b: { hidden: false, sub: '"안녕"' } }, send: { from: 'a', to: 'c', label: 'save()', color: 'warn' }, say: '현재 상태를 메멘토 객체에 담아 보관자에게 맡깁니다.' },
      { set: { a: { sub: '내용: 안녕 세상!!' } }, flash: [['a'], 'warn'], say: '문서를 더 고쳤습니다.' },
      { send: { from: 'c', to: 'a', label: 'restore()', color: 'good' }, set: { a: { sub: '내용: 안녕' } }, say: '메멘토를 돌려주면 예전 상태로 복원됩니다.' },
      say('보관자는 메멘토의 내용을 들여다보지 않습니다(캡슐화 유지). 게임 세이브, 트랜잭션 롤백과 같은 생각입니다.', { tone: 'ok' }),
    ]),
  pat('Observer', '상태 변화를 구독자에게 알림', [['a', '유튜브 채널', -4, 0, 'server', C.cls, 'Subject'], ['b', '구독자 1', 3, -2.6, 'person', C.client], ['c', '구독자 2', 3, 0, 'person', C.client], ['d', '구독자 3', 3, 2.6, 'person', C.client]],
    [['a', 'b'], ['a', 'c'], ['a', 'd']],
    [
      say('한 객체의 상태가 바뀌면 그 객체를 구독(등록)한 객체들에게 자동으로 알립니다. 일대다 의존.', { code: 'channel.subscribe(user);\nchannel.upload();  // → notify()' }),
      { mark: [{ at: 'a', label: '새 영상 업로드!', color: 'warn' }] },
      { send: { from: 'a', to: ['b', 'c', 'd'], label: 'update()', color: 'good' }, say: 'notify()가 등록된 모든 구독자의 update()를 부릅니다(브로드캐스트).' },
      { unlink: [['a', 'd']], set: { d: { color: 0xcbd5e1, sub: '구독 취소' } }, say: '구독을 취소하면 더 이상 알림을 받지 않습니다.' },
      { send: { from: 'a', to: ['b', 'c'], label: 'update()', color: 'good' } },
      say('발행자는 구독자가 누구인지 몰라도 됩니다(느슨한 결합). 이벤트 리스너, MVC의 모델-뷰가 대표 예.', { tone: 'ok' }),
    ]),
  pat('State', '상태에 따라 행동이 바뀜', [['a', '자판기', -4, 0, 'box', C.cls, 'Context'], ['b', '동전 없음', 1.5, -2.2, 'chip', C.new], ['c', '동전 있음', 1.5, 0, 'chip', 0xcbd5e1], ['d', '품절', 1.5, 2.2, 'chip', 0xcbd5e1]],
    [['a', 'b', 'warn', '현재 상태']],
    [
      say('객체의 내부 상태를 별도 상태 객체로 만들고, 상태가 바뀌면 행동도 그 상태 객체가 정합니다. if/switch 문이 사라집니다.', { code: 'machine.pressButton();  // state.pressButton()' }),
      { send: { from: 'a', to: 'b', label: '버튼' }, mark: [{ at: 'b', label: '"동전을 넣으세요"', color: 'bad' }] },
      { send: { from: 'a', to: 'b', label: '동전 투입' }, unlink: [['a', 'b']], link: [['a', 'c', 'warn', '현재 상태']], set: { b: { color: 0xcbd5e1 }, c: { color: 0xf59e0b } }, say: '동전을 넣으면 현재 상태 객체가 "동전 있음"으로 바뀝니다.' },
      { send: { from: 'a', to: 'c', label: '버튼' }, mark: [{ at: 'c', label: '음료 나옴!', color: 'good' }] },
      say('같은 버튼(같은 메서드)인데 상태 객체에 따라 다르게 동작합니다. 전략 패턴과 구조가 같지만, 상태는 스스로 바뀝니다.', { tone: 'ok' }),
    ]),
  pat('Strategy', '알고리즘을 갈아 끼움', [['a', '결제 (Context)', -4, 0, 'box', C.cls], ['b', '카드 결제', 2, -2.2, 'chip', C.new], ['c', '계좌 이체', 2, 0, 'chip', 0xcbd5e1], ['d', '포인트', 2, 2.2, 'chip', 0xcbd5e1]],
    [['a', 'b', 'warn', '전략']],
    [
      say('같은 일을 하는 여러 알고리즘을 캡슐화해 두고, 실행 중에 바꿔 끼울 수 있게 합니다.', { code: 'payment.setStrategy(new CardStrategy());\npayment.pay(10000);' }),
      { send: { from: 'a', to: 'b', label: 'pay(1만)' }, mark: [{ at: 'b', label: '카드 승인', color: 'good' }] },
      { unlink: [['a', 'b']], link: [['a', 'd', 'warn', '전략']], set: { b: { color: 0xcbd5e1 }, d: { color: 0xf59e0b } }, code: 'payment.setStrategy(new PointStrategy());', say: '전략 객체만 바꿉니다.' },
      { send: { from: 'a', to: 'd', label: 'pay(1만)' }, mark: [{ at: 'd', label: '포인트 차감', color: 'good' }] },
      say('pay() 호출 코드는 그대로인데 동작이 바뀝니다. 정렬 비교자(Comparator), 압축 방식 선택이 대표 예. 상태 패턴과 달리 클라이언트가 고릅니다.', { tone: 'ok' }),
    ]),
  pat('Template Method', '뼈대는 상위, 세부는 하위', [['a', '음료 만들기', -3.5, -1.6, 'box', C.abs, '물 끓이기 → 우리기 → 붓기'], ['b', '커피', -3.5, 2, 'box', C.cls, '우리기 = 필터로 내림'], ['c', '물 끓이기', 2.5, -2.6, 'chip', 0x64748b, '공통'], ['d', '우리기 ?', 2.5, 0, 'chip', C.new, '하위가 채움'], ['e', '컵에 붓기', 2.5, 2.6, 'chip', 0x64748b, '공통']],
    [['a', 'b', 'muted', '상속'], ['a', 'c'], ['a', 'd'], ['a', 'e']],
    [
      say('알고리즘의 순서(뼈대)는 상위 클래스의 템플릿 메서드가 정하고, 바뀌는 단계만 하위 클래스가 재정의합니다.', { code: 'abstract class Beverage {\n  final void make() { boil(); brew(); pour(); }\n  abstract void brew();\n}' }),
      { send: { from: 'a', to: 'c', label: '1. boil()' } },
      { send: { from: 'a', to: 'd', label: '2. brew()' }, say: '추상 단계 brew()는 하위 클래스(커피)가 구현한 것으로 실행됩니다.' },
      { set: { d: { name: '필터로 내림', color: C.obj } }, send: { from: 'b', to: 'd', label: '구현', color: 'warn' } },
      { send: { from: 'a', to: 'e', label: '3. pour()' } },
      say('홍차 클래스는 brew()만 "티백 담그기"로 바꾸면 됩니다. 순서를 하위가 바꿀 수 없게 make()는 final로 둡니다.', { tone: 'ok' }),
    ]),
  pat('Visitor', '구조는 그대로, 연산을 밖에서 추가', [['a', '세금 계산 Visitor', -5, 0, 'person', C.new], ['b', '책', 1.5, -2.4, 'box', C.obj, 'accept(v)'], ['c', '술', 1.5, 0, 'box', C.obj, 'accept(v)'], ['d', '담배', 1.5, 2.4, 'box', C.obj, 'accept(v)']],
    [['a', 'b'], ['a', 'c'], ['a', 'd']],
    [
      say('요소 클래스를 고치지 않고 새로운 연산(세금 계산, 출력 …)을 방문자 객체로 추가합니다.', { code: 'for (Item i : cart) i.accept(taxVisitor);' }),
      { send: { from: 'a', to: 'b', label: 'visit(책)' }, mark: [{ at: 'b', label: '세금 0%', color: 'good' }] },
      { send: { from: 'a', to: 'c', label: 'visit(술)' }, mark: [{ at: 'c', label: '세금 72%', color: 'warn' }] },
      { send: { from: 'a', to: 'd', label: 'visit(담배)' }, mark: [{ at: 'd', label: '세금 70%', color: 'warn' }] },
      say('요소가 accept(visitor)로 방문자를 받아들이고, 방문자의 visit(자기 타입)을 부릅니다(이중 디스패치). 할인 계산을 추가하려면 방문자만 하나 더 만듭니다.', { tone: 'ok' }),
    ]),
];

export const gofLab = flowLab({
  title: 'GoF 디자인 패턴 3D', en: '패턴마다 객체가 실제로 어떻게 협력하는지', height: 480,
  hint: '패턴 단추를 누르면 그 패턴의 객체들이 나타나 실제 호출·생성·전달이 오갑니다. 노드를 누르면 설명이 나옵니다.',
  nodes: IDS.map((id, i): FNode => ({ id, name: id, at: [i * 1.5 - 5, 0], hidden: true, info: { title: '패턴 속 객체', body: '패턴을 구성하는 클래스·객체입니다. 회색 사람은 클라이언트(사용하는 쪽), 파랑은 클래스, 초록은 만들어진 객체, 주황은 패턴이 새로 끼워 넣은 객체, 보라는 추상 클래스입니다.' } })),
  groups: [
    { name: '생성 패턴', en: 'Creational · 5', hue: 210, items: CREATIONAL },
    { name: '구조 패턴', en: 'Structural · 7', hue: 150, items: STRUCTURAL },
    { name: '행위 패턴', en: 'Behavioral · 11', hue: 30, items: BEHAVIORAL },
  ],
});

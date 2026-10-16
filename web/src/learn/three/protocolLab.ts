// 프로토콜의 기본 요소(구문·의미·타이밍)와 기능(단편화, 캡슐화, 흐름 제어, 오류 제어, 동기화, 순서 제어, 주소 지정, 다중화, 경로 제어)을
// 송신 측·수신 측 사이로 패킷이 오가는 장면으로 보여 준다.
import { flowLab, type FLink, type FNode, type FScenario, type FStep, type Shape, type Tone } from './flow';

type NodeSpec = [id: string, name: string, x: number, z: number, shape?: Shape, color?: Tone, sub?: string];
const POOL = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
function sc(name: string, tip: string, nodes: NodeSpec[], links: FLink[], steps: FStep[]): FScenario {
  const set: FScenario['set'] = Object.fromEntries(POOL.map((id) => [id, { hidden: true }]));
  for (const [id, n, x, z, shape, color, sub] of nodes) set![id] = { hidden: false, name: n, at: [x, z], shape: shape ?? 'pc', color: color ?? 0x2563eb, sub, scale: 1 };
  return { name, tip, set, links, steps };
}
const S = (text: string, extra: Partial<FStep> = {}): FStep => ({ say: text, wait: Math.min(2400, 800 + text.length * 16), ...extra });
const TX: NodeSpec = ['a', '송신 측', -5.5, 0, 'pc', 0x2563eb];
const RX: NodeSpec = ['b', '수신 측', 5.5, 0, 'pc', 0x16a34a];

const ELEMENTS: FScenario[] = [
  sc('구문', 'Syntax: 무엇을', [TX, RX], [['a', 'b']], [
    S('구문은 데이터의 형식·부호화·신호 레벨 약속입니다. "어떤 모양으로 보낼지".', { code: '[목적지 | 출발지 | 길이 | 데이터 | FCS]' }),
    { send: { from: 'a', to: 'b', label: '[헤더|데이터|FCS]' }, mark: [{ at: 'b', label: '약속한 형식 → 해석 성공', color: 'good' }], say: '정해진 칸 순서대로 보내면 받는 쪽이 각 칸을 정확히 읽어 냅니다.' },
    { send: { from: 'a', to: 'b', label: '[데이터|헤더?]', color: 'bad', fate: 'blocked' }, say: '형식이 약속과 다르면 받는 쪽은 어디가 주소이고 어디가 데이터인지 알 수 없습니다.', tone: 'bad' },
  ]),
  sc('의미', 'Semantics: 어떤 뜻으로', [TX, RX], [['a', 'b']], [
    S('의미는 제어 정보·오류 처리의 약속입니다. 같은 비트라도 "무슨 뜻인지"를 정합니다.', { code: 'ACK = 잘 받았음 / NAK = 다시 보내 줘' }),
    { send: { from: 'a', to: 'b', label: '프레임 1' } },
    { send: { from: 'b', to: 'a', label: 'ACK', color: 'good' }, mark: [{ at: 'a', label: '"잘 받았구나" → 다음 전송', color: 'good' }] },
    { send: { from: 'a', to: 'b', label: '프레임 2' } },
    { send: { from: 'b', to: 'a', label: 'NAK', color: 'bad' }, mark: [{ at: 'a', label: '"손상됐구나" → 다시 전송', color: 'warn' }], say: '같은 신호를 양쪽이 같은 뜻으로 이해해야 올바르게 대응합니다.' },
  ]),
  sc('타이밍', 'Timing: 언제', [TX, ['b', '수신 측', 5.5, 0, 'pc', 0x16a34a, '느림: 1초에 1개']], [['a', 'b']], [
    S('타이밍은 속도 맞춤과 순서의 약속입니다. "언제, 얼마나 빨리 보낼지".'),
    { send: { from: 'a', to: 'b', label: '데이터', many: 5, ms: 700 }, mark: [{ at: 'b', label: '너무 빨라서 넘침!', color: 'bad' }], say: '받는 쪽 속도를 무시하고 몰아 보내면 처리하지 못하고 버려집니다.', tone: 'bad' },
    { send: { from: 'a', to: 'b', label: '데이터 1' }, wait: 600, say: '정한 속도에 맞춰 하나씩 보내면 모두 처리됩니다.' },
    { send: { from: 'a', to: 'b', label: '데이터 2' }, wait: 600 },
    { send: { from: 'a', to: 'b', label: '데이터 3' }, mark: [{ at: 'b', label: '모두 처리', color: 'good' }], tone: 'ok' },
  ]),
];

const FUNCTIONS: FScenario[] = [
  sc('단편화와 재조립', 'Fragmentation', [TX, ['c', '라우터', 0, 0, 'router', 0x64748b, '한 번에 1500바이트까지'], RX], [['a', 'c'], ['c', 'b']], [
    S('보낼 데이터가 망이 한 번에 실어 나를 수 있는 크기(MTU)보다 크면 작은 조각으로 나눕니다(단편화).', { code: '4000바이트 → 1500 + 1500 + 1000' }),
    { send: { from: 'a', to: 'c', label: '4000B (너무 큼)', color: 'warn' }, mark: [{ at: 'c', label: '조각내기', color: 'warn' }] },
    { send: [{ from: 'c', to: 'b', label: '조각 1/3' }, { from: 'c', to: 'b', label: '조각 2/3', ms: 1400 }, { from: 'c', to: 'b', label: '조각 3/3', ms: 1700 }], say: '각 조각에는 몇 번째 조각인지 표시가 붙어 따로 전달됩니다.' },
    { mark: [{ at: 'b', label: '재조립 → 4000B', color: 'good' }], say: '받는 쪽은 조각을 순서대로 이어 붙여 원래 데이터로 되돌립니다(재조립).', tone: 'ok' },
  ]),
  sc('캡슐화', 'Encapsulation', [TX, RX], [['a', 'b']], [
    S('캡슐화는 데이터에 주소·제어 정보(헤더)를 덧붙이는 것입니다. 편지를 봉투에 넣고 주소를 쓰는 것과 같습니다.', { code: '데이터 → [TCP|데이터] → [IP|TCP|데이터] → [MAC|IP|TCP|데이터|FCS]' }),
    { mark: [{ at: 'a', label: '데이터', color: 'accent' }], wait: 900 },
    { mark: [{ at: 'a', label: '[TCP 헤더 | 데이터]', color: 'accent' }], say: '전송 계층이 포트 번호·순서 번호가 든 TCP 헤더를 붙입니다.' },
    { mark: [{ at: 'a', label: '[IP | TCP | 데이터]', color: 'accent' }], say: '네트워크 계층이 출발지·목적지 IP 주소를 붙입니다.' },
    { mark: [{ at: 'a', label: '[MAC | IP | TCP | 데이터 | FCS]', color: 'accent' }], say: '데이터 링크 계층이 MAC 주소와 오류 검사용 FCS를 붙입니다. 이제 봉투가 완성됐습니다.' },
    { send: { from: 'a', to: 'b', label: '프레임', ms: 1500 } },
    { mark: [{ at: 'b', label: '헤더를 하나씩 벗김 → 데이터', color: 'good' }], say: '받는 쪽은 아래 계층부터 헤더를 하나씩 확인하고 떼어 냅니다(역캡슐화).', tone: 'ok' },
  ]),
  sc('흐름 제어', 'Flow Control', [TX, ['b', '수신 측', 5.5, 0, 'pc', 0x16a34a, '버퍼 3칸']], [['a', 'b']], [
    S('흐름 제어는 받는 쪽이 감당할 수 있는 만큼만 보내도록 양을 조절하는 것입니다. 대표 방법: 슬라이딩 윈도우.', { code: '윈도우 크기 = 3' }),
    { send: { from: 'a', to: 'b', label: '1 2 3', many: 3, ms: 900 }, say: '윈도우 크기(3)만큼은 ACK를 기다리지 않고 연속으로 보냅니다.' },
    { send: { from: 'a', to: 'b', label: '4?', fate: 'blocked', color: 'warn' }, mark: [{ at: 'a', label: '윈도우가 꽉 참 → 대기', color: 'warn' }] },
    { send: { from: 'b', to: 'a', label: 'ACK 3 (빈칸 3)', color: 'good' }, say: '받는 쪽이 처리하고 ACK를 보내면 윈도우가 앞으로 밀려 다시 보낼 수 있습니다.' },
    { send: { from: 'a', to: 'b', label: '4 5 6', many: 3, ms: 900 }, tone: 'ok', say: '정지-대기(1개씩)보다 빠르면서도 받는 쪽이 넘치지 않습니다.' },
  ]),
  sc('오류 제어', 'Error Control', [TX, RX], [['a', 'b']], [
    S('오류 제어는 전송 중 바뀌거나 사라진 데이터를 찾아내고(검출) 바로잡는(정정·재전송) 것입니다.', { code: '패리티 · CRC · 체크섬 → ARQ 재전송 / 해밍 코드 정정' }),
    { send: { from: 'a', to: 'b', label: '프레임 1', color: 'bad' }, mark: [{ at: 'b', label: 'FCS 불일치 → 손상!', color: 'bad' }], say: '잡음으로 비트가 바뀌었습니다. 받는 쪽이 함께 온 FCS(CRC)를 다시 계산해 보니 맞지 않습니다.', tone: 'bad' },
    { send: { from: 'b', to: 'a', label: 'NAK', color: 'bad' } },
    { send: { from: 'a', to: 'b', label: '프레임 1 (재전송)', color: 'good' }, mark: [{ at: 'b', label: '정상', color: 'good' }], say: '다시 받아 오류를 바로잡았습니다(후진 오류 수정, ARQ).', tone: 'ok' },
  ]),
  sc('동기화', 'Synchronization', [TX, ['b', '수신 측', 5.5, 0, 'pc', 0x16a34a, '시계가 어긋남']], [['a', 'b']], [
    S('동기화는 보내는 쪽과 받는 쪽의 타이밍(시작 시점·비트 간격·상태)을 서로 맞추는 것입니다. 박자를 맞추고 나서 연주를 시작하는 것과 같습니다.'),
    { send: { from: 'a', to: 'b', label: '1 0 1 1 0', color: 'warn' }, mark: [{ at: 'b', label: '"1 1 0 0 1"? 잘못 읽음', color: 'bad' }], say: '받는 쪽이 비트를 읽는 박자가 어긋나 있으면 같은 신호를 엉뚱하게 읽습니다.', tone: 'bad' },
    { send: { from: 'a', to: 'b', label: '10101010 (동기 신호)', color: 'accent' }, mark: [{ at: 'b', label: '박자·시작점 맞춤', color: 'accent' }], set: { b: { sub: '송신 측과 시계 맞춤' } }, say: '데이터 앞에 정해진 동기 신호(프리앰블, 동기 문자 SYN, 플래그 01111110)를 보내 시작점과 박자를 맞춥니다.' },
    { send: { from: 'a', to: 'b', label: '1 0 1 1 0', color: 'good' }, mark: [{ at: 'b', label: '"1 0 1 1 0" 정확히', color: 'good' }], say: '이제 같은 박자로 읽어 정확히 받습니다. TCP의 3-way handshake도 서로의 시작 번호를 맞추는 동기화입니다.', tone: 'ok' },
  ]),
  sc('순서 제어', 'Sequencing', [TX, ['c', '경로 A', 0, -2.4, 'router', 0x64748b], ['d', '경로 B (느림)', 0, 2.4, 'router', 0x64748b], RX], [['a', 'c'], ['a', 'd'], ['c', 'b'], ['d', 'b']], [
    S('패킷마다 순서 번호를 붙여, 서로 다른 길로 와서 뒤섞여 도착해도 받는 쪽이 원래 순서로 정렬하게 합니다.'),
    { send: [{ from: 'a', to: 'd', label: '#1' }, { from: 'a', to: 'c', label: '#2' }, { from: 'a', to: 'c', label: '#3', ms: 1400 }] },
    { send: [{ from: 'c', to: 'b', label: '#2' }, { from: 'c', to: 'b', label: '#3', ms: 1300 }, { from: 'd', to: 'b', label: '#1', ms: 2400 }], mark: [{ at: 'b', label: '도착: 2, 3, 1', color: 'warn' }], say: '#1이 느린 길로 가서 가장 늦게 도착했습니다.' },
    { mark: [{ at: 'b', label: '번호순 정렬 → 1, 2, 3', color: 'good' }], say: '순서 번호를 보고 1, 2, 3으로 다시 맞춥니다. 빠진 번호가 있으면 다시 요청할 수도 있습니다.', tone: 'ok' },
  ]),
  sc('주소 지정', 'Addressing', [TX, ['c', '스위치', 0, 0, 'switch', 0x64748b], ['d', 'PC B', 5, -2.6, 'pc', 0x94a3b8, '10.0.0.2'], ['e', 'PC C', 5, 0, 'pc', 0x16a34a, '10.0.0.3'], ['f', 'PC D', 5, 2.6, 'pc', 0x94a3b8, '10.0.0.4']], [['a', 'c'], ['c', 'd'], ['c', 'e'], ['c', 'f']], [
    S('보내는 쪽과 받는 쪽의 주소를 붙여, 여러 대 중 정확한 상대에게 전달되게 합니다.', { code: '목적지: 10.0.0.3' }),
    { send: { from: 'a', to: 'c', label: '목적지 10.0.0.3' } },
    { send: { from: 'c', to: 'e', label: '목적지 10.0.0.3', color: 'good' }, mark: [{ at: 'e', label: '내 주소! 받음', color: 'good' }], say: '주소가 맞는 PC C만 받습니다. 주소 체계: MAC(데이터 링크), IP(네트워크), 포트(전송).', tone: 'ok' },
  ]),
  sc('다중화', 'Multiplexing', [['a', '웹', -6, -2.6, 'chip', 0x2563eb], ['c', '메일', -6, 0, 'chip', 0xf59e0b], ['d', '게임', -6, 2.6, 'chip', 0xa855f7], ['e', '회선 하나', -1, 0, 'router', 0x64748b, '다중화기'], ['f', '서버', 5, 0, 'server', 0x16a34a, '포트로 나눔']], [['a', 'e'], ['c', 'e'], ['d', 'e'], ['e', 'f']], [
    S('다중화는 여러 통신이 하나의 회선을 함께 나눠 쓰게 하는 것입니다.', { code: '웹:80 · 메일:25 · 게임:7777 → 한 회선' }),
    { send: [{ from: 'a', to: 'e', label: '웹' }, { from: 'c', to: 'e', label: '메일' }, { from: 'd', to: 'e', label: '게임' }] },
    { send: [{ from: 'e', to: 'f', label: '웹', color: 0x2563eb }, { from: 'e', to: 'f', label: '메일', color: 0xf59e0b, ms: 1400 }, { from: 'e', to: 'f', label: '게임', color: 0xa855f7, ms: 1700 }], say: '시간을 쪼개거나(TDM) 주파수를 나눠(FDM) 한 회선에 번갈아 싣습니다.' },
    { mark: [{ at: 'f', label: '포트 번호로 다시 나눔', color: 'good' }], say: '받는 쪽은 포트 번호를 보고 각 프로그램에 나눠 줍니다(역다중화).', tone: 'ok' },
  ]),
  sc('경로 제어', 'Routing', [TX, ['c', '라우터 1', -1.5, -2.4, 'router', 0x64748b], ['d', '라우터 2', -1.5, 2.4, 'router', 0x64748b], ['e', '라우터 3', 2.5, 0, 'router', 0x64748b], RX], [['a', 'c', 'muted', '빠름'], ['a', 'd', 'muted', '막힘'], ['c', 'e'], ['d', 'e'], ['e', 'b']], [
    S('경로 제어(라우팅)는 목적지까지 가는 여러 길 중 가장 좋은 길을 골라 보내는 것입니다.'),
    { flash: [['d'], 'bad'], say: '라우터 2 쪽 길은 혼잡합니다.', tone: 'bad', wait: 800 },
    { travel: { path: ['a', 'c', 'e', 'b'], label: '패킷', color: 'good', notes: ['라우터 1: 라우팅 테이블을 보고 빠른 길로', '라우터 3: 목적지 쪽으로 다음 홉 결정', '도착'] } },
    S('라우터가 라우팅 테이블(RIP는 홉 수, OSPF는 링크 비용)을 보고 다음 경로를 고릅니다. 고장 난 길은 피해 갑니다.', { tone: 'ok' }),
  ]),
];

export const protocolLab = flowLab({
  title: '프로토콜 3D', en: '기본 요소 3가지 · 기능 9가지', height: 460,
  hint: '요소나 기능 단추를 누르면 송신 측·수신 측 사이에서 실제로 무슨 일이 일어나는지 장면으로 보여 줍니다.',
  nodes: POOL.map((id, i): FNode => ({ id, name: id, at: [i - 3, 0], hidden: true, info: { title: '통신 장비', body: '송신 측이 보낸 데이터가 프로토콜 약속에 따라 처리되는 모습을 보여 줍니다.' } })),
  groups: [
    { name: '기본 요소', en: 'Elements', hue: 210, items: ELEMENTS },
    { name: '기능', en: 'Functions', hue: 30, items: FUNCTIONS },
  ],
});

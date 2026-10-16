// OSI 7계층: 데이터 캡슐이 계층 사이를 실제로 통과하며 헤더가 붙고(캡슐화), 전기 신호로 건너가,
// 받는 쪽에서 계층을 하나씩 올라가며 헤더가 떨어진다(역캡슐화).
// 계층을 누르면 지금 위치에서 그 계층까지 한 칸씩 진행한다.
import { el } from '../../view/stage';
import { detailBox, frame, lerp, linear, nameHits, player, svg, tween, type Viz } from '../core';
import { LAYER_SCENE, OSI_SCENES } from './osiScenes';
import { openModal } from '../modal';

interface Layer { n: number; ko: string; en: string; pdu: string; protos: string; devices: string; role: string }

export const OSI: Layer[] = [
  { n: 7, ko: '응용', en: 'Application', pdu: '데이터', protos: 'HTTP · FTP · SMTP · DNS · Telnet · SNMP · DHCP', devices: '게이트웨이', role: '사용자가 쓰는 응용 프로그램(웹 브라우저, 메일)에 네트워크 서비스를 제공한다.' },
  { n: 6, ko: '표현', en: 'Presentation', pdu: '데이터', protos: 'JPEG · MPEG · ASCII · EBCDIC · SSL/TLS(암호화)', devices: '-', role: '데이터 형식을 통일한다: 코드 변환(인코딩), 암호화·복호화, 압축.' },
  { n: 5, ko: '세션', en: 'Session', pdu: '데이터', protos: 'NetBIOS · RPC · SQL 세션', devices: '-', role: '양쪽의 대화(세션)를 열고, 유지하고, 닫는다. 동기점(체크포인트)을 두어 끊기면 거기서 다시 시작한다.' },
  { n: 4, ko: '전송', en: 'Transport', pdu: '세그먼트', protos: 'TCP · UDP', devices: 'L4 스위치(부하 분산)', role: '종단 간(End-to-End) 신뢰성 있는 전송. 포트 번호로 프로그램을 찾고, 순서·흐름·오류를 제어한다.' },
  { n: 3, ko: '네트워크', en: 'Network', pdu: '패킷', protos: 'IP · ICMP · IGMP · ARP · RARP · RIP · OSPF', devices: '라우터 · L3 스위치', role: '논리 주소(IP)를 붙이고, 목적지까지 갈 경로를 고른다(라우팅).' },
  { n: 2, ko: '데이터 링크', en: 'Data Link', pdu: '프레임', protos: 'Ethernet · HDLC · PPP · Wi-Fi · MAC', devices: '스위치 · 브리지 · 랜카드', role: '바로 이웃한 장비 사이에 프레임을 전달한다. 물리 주소(MAC), 오류 검출(FCS/CRC), 흐름 제어.' },
  { n: 1, ko: '물리', en: 'Physical', pdu: '비트', protos: 'RS-232C · UTP · 광케이블 · 전기 신호', devices: '허브 · 리피터 · 케이블', role: '0과 1(비트)을 전기·빛·전파 신호로 바꿔 실제로 흘려보낸다. 전압, 커넥터 핀 같은 규격을 정한다.' },
];

const TCPIP = [
  { name: '응용', from: 7, to: 5 }, { name: '전송', from: 4, to: 4 },
  { name: '인터넷', from: 3, to: 3 }, { name: '네트워크 액세스', from: 2, to: 1 },
];

// 캡슐 조각: 데이터와 계층별 헤더 (layer: 어느 계층이 붙이는가)
// OSI 참조 모델에서는 7~2계층이 각자 헤더를 붙인다: AH·PH·SH(응용·표현·세션), TCP(전송), IP(네트워크), MAC+FCS(데이터 링크)
// name: 조각의 이름, has: 안에 담긴 정보 (캡슐 조각을 누르거나 범례에서 보여 준다)
const SEG: Record<string, { label: string; w: number; layer: number; name: string; en: string; has: string; tail?: boolean }> = {
  data: { label: 'DATA', w: 40, layer: 7, name: '데이터', en: 'Data (Payload)', has: '실제로 보내려는 내용. 예: 웹 브라우저의 요청 "GET /index.html"' },
  enc: { label: '🔒DATA', w: 44, layer: 6, name: '암호화된 데이터', en: 'Encrypted Data', has: '표현 계층이 암호화·압축한 데이터. 중간에서 엿봐도 내용을 알 수 없다' },
  ah: { label: 'AH', w: 24, layer: 7, name: '응용 헤더', en: 'Application Header', has: '어떤 응용 서비스(HTTP, FTP …)의 어떤 요청인지 같은 응용 계층의 제어 정보' },
  ph: { label: 'PH', w: 24, layer: 6, name: '표현 헤더', en: 'Presentation Header', has: '데이터를 어떤 형식으로 바꿨는지: 문자 코드(UTF-8), 암호화 방식(TLS), 압축 방식' },
  sh: { label: 'SH', w: 24, layer: 5, name: '세션 헤더', en: 'Session Header', has: '세션(대화) 번호, 대화 방식(반이중·전이중), 동기점(체크포인트) 번호' },
  tcp: { label: 'TCP', w: 32, layer: 4, name: 'TCP 헤더 (전송 헤더)', en: 'Transport Header', has: '출발지·목적지 포트 번호(어느 프로그램인지), 순서 번호(seq), 확인 번호(ack), 창 크기' },
  ip: { label: 'IP', w: 24, layer: 3, name: 'IP 헤더 (네트워크 헤더)', en: 'Network Header', has: '출발지·목적지 IP 주소(어느 컴퓨터인지), TTL(거쳐 갈 수 있는 라우터 수)' },
  mac: { label: 'MAC', w: 34, layer: 2, name: 'MAC 헤더 (데이터 링크 헤더)', en: 'Data Link Header', has: '출발지·목적지 MAC 주소(바로 다음 장비의 랜카드 주소). 장비를 지날 때마다 바뀐다' },
  fcs: { label: 'FCS', w: 28, layer: 2, name: 'FCS 트레일러', en: 'Frame Check Sequence', has: '오류 검사용 CRC 값. 프레임 맨 뒤에 붙어서 헤더가 아니라 트레일러라 한다', tail: true },
};

// 그림 크기: 계층 칸(이름표 + 데이터가 지나가는 통로) 7개, 칸 사이에는 캡슐이 지나가는 틈
const W = 940, SW = 432, LW = 190, RH = 38, GAP = 14, Y0 = 30;
const SX = 6, RX = W - SW - 6;
const rowY = (n: number) => Y0 + (7 - n) * (RH + GAP);
const midY = (n: number) => rowY(n) + RH / 2;
const laneX = (side: 'L' | 'R') => (side === 'L' ? SX : RX) + LW + (SW - LW) / 2;
const labelX = (side: 'L' | 'R') => (side === 'L' ? SX : RX) + LW / 2;
const BOTTOM = rowY(1) + RH;
const WIRE_Y = BOTTOM + 34;
const H = WIRE_Y + 26;
const UP = ['sh', 'ph', 'ah', 'enc'];   // 5~7계층이 만든 부분
const FRAME = ['mac', 'ip', 'tcp', ...UP, 'fcs'];

export function osiViz(): Viz {
  const { root, body } = frame('OSI 7계층과 캡슐화', 'Open Systems Interconnection Reference Model');
  const tools = el('div', 'viz-tools');
  const tcpBtn = el('button', '', 'TCP/IP 4계층과 비교');
  tools.append(tcpBtn, el('span', 'muted small', '외우기: 아래부터 "물·데·네·전·세·표·응" / Please Do Not Throw Sausage Pizza Away'));

  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'osi-svg', role: 'img', 'aria-label': 'OSI 7계층 그림' });
  const detail = detailBox('계층을 누르면 데이터가 그 계층까지 내려가거나 올라가는 모습을 보여 줍니다. 캡슐 조각(DATA, AH …)이나 장비를 누르면 무엇인지 예시 애니메이션 팝업으로 설명합니다.');

  s.append(svg('text', { x: SX + SW / 2, y: 18, class: 'osi-side' }, '보내는 쪽 (PC A) — 위에서 아래로 캡슐화'),
    svg('text', { x: RX + SW / 2, y: 18, class: 'osi-side' }, '받는 쪽 (PC B) — 아래에서 위로 역캡슐화'));

  // ── 계층 칸 ──
  const rows: { side: 'L' | 'R'; n: number; g: SVGGElement }[] = [];
  for (const side of ['L', 'R'] as const) {
    const x = side === 'L' ? SX : RX;
    for (const L of OSI) {
      const y = rowY(L.n);
      const g = svg('g', { class: `osi-row osi-l${L.n}`, tabindex: 0, role: 'button', 'aria-label': `${side === 'L' ? '보내는 쪽' : '받는 쪽'} ${L.n}계층 ${L.ko} 계층으로` });
      const protos = `${L.en} · ${L.protos}`;
      g.append(
        svg('rect', { x, y, width: SW, height: RH, rx: 8, class: 'osi-box' }),
        svg('rect', { x: x + LW, y: y + 4, width: SW - LW - 5, height: RH - 8, rx: 6, class: 'osi-lane' }),
        svg('text', { x: x + 10, y: y + 27, class: 'osi-num' }, String(L.n)),
        svg('text', { x: x + 30, y: y + 16, class: 'osi-ko' }, `${L.ko} 계층`),
        svg('text', { x: x + LW - 8, y: y + 16, class: 'osi-pdu', 'text-anchor': 'end' }, L.pdu),
        svg('text', { x: x + 30, y: y + 31, class: 'osi-proto' }, protos.length > 32 ? `${protos.slice(0, 31)}…` : protos),
      );
      g.addEventListener('click', () => void goLayer(side, L));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void goLayer(side, L); } });
      s.append(g);
      rows.push({ side, n: L.n, g });
    }
  }

  // ── TCP/IP 4계층 괄호 (두 기둥 사이) ──
  const tcpip = svg('g', { class: 'osi-tcpip', visibility: 'hidden' });
  for (const t of TCPIP) {
    const y1 = rowY(t.from) + 2, y2 = rowY(t.to) + RH - 2, bx = SX + SW + 10, my = (y1 + y2) / 2;
    tcpip.append(svg('path', { d: `M${bx} ${y1} H${bx + 8} V${y2} H${bx}`, class: 'osi-brace' }),
      svg('text', { x: bx + 22, y: my, class: 'osi-tcpip-t', transform: `rotate(90 ${bx + 22} ${my})` }, t.name));
  }
  s.append(tcpip);
  tcpBtn.addEventListener('click', () => {
    const on = tcpip.getAttribute('visibility') === 'hidden';
    tcpip.setAttribute('visibility', on ? 'visible' : 'hidden');
    tcpBtn.classList.toggle('on', on);
    if (on) detail.show('TCP/IP 4계층과 OSI 7계층', 'OSI의 응용·표현·세션(7~5)은 TCP/IP의 응용 계층 하나로, 데이터 링크·물리(2~1)는 네트워크 액세스 계층 하나로 묶인다. 전송(4)과 네트워크(3)는 TCP/IP의 전송·인터넷 계층에 해당한다.', 'OSI는 이론 모델, TCP/IP는 실제 인터넷이 쓰는 모델');
  });

  // ── 전선과 장비 ──
  const xL = laneX('L'), xR = laneX('R');
  const wireD = `M${xL} ${BOTTOM} V${WIRE_Y} H${xR} V${BOTTOM}`;
  const wire = svg('path', { d: wireD, class: 'osi-wire' });
  const spark = svg('path', { d: wireD, class: 'osi-spark' });
  s.append(wire, spark);
  const devs = [
    { x: xL + (xR - xL) * 0.25, name: '허브', layer: 1, note: '허브(1계층): 받은 전기 신호를 그대로 키워 모든 포트로 내보낸다. 주소를 보지 않는다.' },
    { x: xL + (xR - xL) * 0.5, name: '스위치', layer: 2, note: '스위치(2계층): 프레임의 MAC 주소를 보고 목적지가 연결된 포트로만 보낸다.' },
    { x: xL + (xR - xL) * 0.75, name: '라우터', layer: 3, note: '라우터(3계층): 패킷의 IP 주소를 보고 목적지 네트워크로 가는 다음 경로를 고른다.' },
  ];
  const devG = devs.map((d) => {
    const g = svg('g', { class: 'osi-dev' });
    g.append(svg('rect', { x: d.x - 38, y: WIRE_Y - 12, width: 76, height: 24, rx: 6 }),
      svg('text', { x: d.x, y: WIRE_Y + 4, 'text-anchor': 'middle' }, `${d.name} L${d.layer}`));
    g.addEventListener('click', () => {
      openModal(`${d.name} (${d.layer}계층 장비)`, [OSI_SCENES[{ 허브: 'hub', 스위치: 'switch', 라우터: 'router' }[d.name]!]!(), d.note]);
    });
    s.append(g);
    return g;
  });

  // ── 캡슐 ──
  const capWrap = svg('g', { class: 'osi-capwrap' });
  const cap = svg('g', { class: 'osi-cap' });
  const flyLayer = svg('g');
  const bits = svg('g', { class: 'osi-bits' });
  capWrap.append(cap);
  s.append(capWrap, flyLayer, bits);
  let segs: string[] = [];
  let side: 'L' | 'R' = 'L';
  let capY = midY(7);
  const widthOf = (keys: string[]) => keys.reduce((a, k) => a + SEG[k]!.w, 0);
  /** keys 순서로 칸을 놓았을 때 i번째 칸의 왼쪽 x (캡슐 가운데 기준) */
  const segX = (keys: string[], i: number) => -widthOf(keys) / 2 + widthOf(keys.slice(0, i));
  const segEl = (k: string, x: number, extra = '') => {
    const sg = SEG[k]!;
    const g = svg('g', { class: `osi-seg osi-l${sg.layer}${extra}` });
    g.append(svg('title', {}, `${sg.label}: ${sg.name} — ${sg.has}`), svg('rect', { x, y: -11, width: sg.w - 2, height: 22, rx: 4 }), svg('text', { x: x + (sg.w - 2) / 2, y: 4, 'text-anchor': 'middle' }, sg.label));
    return g;
  };
  /** 캡슐 조각 설명: 무엇인지, 안에 무엇이 있는지, 누가 붙이고 떼는지 */
  const showSeg = (k: string) => {
    const sg = SEG[k]!;
    const L = OSI.find((x) => x.n === sg.layer)!;
    const who = k === 'data' ? '보내는 쪽 응용 프로그램이 만들고, 받는 쪽 응용 프로그램이 받는다.'
      : k === 'enc' ? '보내는 쪽 6계층(표현)이 암호화하고, 받는 쪽 6계층이 복호화한다.'
        : `보내는 쪽 ${L.n}계층(${L.ko})이 ${sg.tail ? '뒤에' : '앞에'} 붙이고, 받는 쪽 ${L.n}계층이 확인한 뒤 떼어 낸다. 다른 계층은 이 조각을 그냥 짐으로 나른다.`;
    openModal(`${sg.label} — ${sg.name}`, [OSI_SCENES[k]!(), sg.has, el('p', 'muted small', who)], sg.en);
    legend.querySelectorAll('.osi-chip').forEach((c) => c.classList.toggle('picked', (c as HTMLElement).dataset.k === k));
  };
  /** 그림 아래 범례: 지금 캡슐이 어떤 조각들로 이루어졌는지 풀어 쓴다 */
  const legend = el('div', 'osi-legend');
  const paintLegend = (keys: string[], fresh: string[] = []) => {
    legend.replaceChildren();
    if (!keys.length) { legend.append(el('span', 'muted small', '캡슐 구성: ▶ 재생을 누르거나 계층을 누르면, 지금 데이터가 어떤 조각들로 싸여 있는지 여기에 풀어 씁니다.')); return; }
    legend.append(el('span', 'osi-legend-h', '지금 캡슐 (앞 → 뒤)'));
    for (const k of keys) {
      const sg = SEG[k]!;
      const c = el('button', `osi-chip osi-l${sg.layer}${fresh.includes(k) ? ' fresh' : ''}`);
      c.dataset.k = k;
      c.append(el('b', '', sg.label), el('span', '', `${sg.name} · ${k === 'data' || k === 'enc' ? '내용' : `${sg.layer}계층`}`));
      c.addEventListener('click', () => showSeg(k));
      legend.append(c);
    }
  };
  const drawCap = (keys: string[], fresh: string[] = []) => {
    segs = keys;
    cap.replaceChildren(...keys.map((k, i) => {
      const g = segEl(k, segX(keys, i));
      g.addEventListener('click', () => showSeg(k));
      return g;
    }));
    paintLegend(keys, fresh);
  };
  const place = () => capWrap.setAttribute('transform', `translate(${laneX(side)} ${capY})`);
  const glow = (sd: 'L' | 'R' | null, n: number) => { for (const r of rows) r.g.classList.toggle('active', r.side === sd && r.n === n); };
  const devOn = (k: number) => devG.forEach((g, j) => g.classList.toggle('active', j === k));
  let speed = 1;
  const T = (ms: number, instant: boolean) => (instant ? 0 : ms * speed);

  /** 헤더 조각이 계층 이름표에서 날아와 캡슐에 붙는다 (away면 캡슐에서 이름표로 날아가 사라진다) */
  const fly = async (k: string, from: { x: number; y: number }, to: { x: number; y: number }, instant: boolean, away: boolean) => {
    if (instant) return;
    const g = segEl(k, -SEG[k]!.w / 2, ' flying');
    flyLayer.append(g);
    await tween(T(650, false), (t) => {
      const x = lerp(from.x, to.x, t), y = lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * 24;
      g.setAttribute('transform', `translate(${x} ${y}) scale(${away ? 1 - t * 0.4 : 0.6 + t * 0.4})`);
      g.setAttribute('opacity', String(away ? 1 - t * t : Math.min(1, t * 2)));
    }).done;
    g.remove();
  };

  /** 보내는 쪽: 위 계층에서 n계층으로 틈을 지나 내려오고, n계층이 붙이는 조각(add)을 단다 */
  const down = (n: number, keys: string[], add: string[], after?: () => Promise<void>) => async (instant: boolean) => {
    side = 'L';
    bits.replaceChildren(); devOn(-1);
    capWrap.setAttribute('visibility', 'visible');
    glow('L', n);
    const fromY = capY;
    await tween(T(520, instant), (t) => { capY = lerp(fromY, midY(n), t); place(); }).done;
    capY = midY(n); place();
    await Promise.all(add.map((k) => fly(k, { x: labelX('L'), y: midY(n) },
      { x: laneX('L') + segX(keys, keys.indexOf(k)) + SEG[k]!.w / 2, y: midY(n) }, instant, false)));
    drawCap(keys, instant ? [] : add);
    if (!instant) for (const k of add) cap.children[keys.indexOf(k)]?.classList.add('pop');
    if (!instant && after) await after();
  };
  /** 받는 쪽: 아래 계층에서 n계층으로 올라오고, n계층이 붙였던 조각을 떼어 이름표로 돌려보낸다 */
  const up = (n: number, keys: string[]) => async (instant: boolean) => {
    side = 'R';
    bits.replaceChildren(); devOn(-1);
    capWrap.setAttribute('visibility', 'visible');
    glow('R', n);
    const fromY = n === 1 ? BOTTOM + 6 : capY;
    await tween(T(520, instant), (t) => { capY = lerp(fromY, midY(n), t); place(); }).done;
    capY = midY(n); place();
    const old = segs;
    const gone = old.filter((k) => !keys.includes(k));
    drawCap(keys);
    await Promise.all(gone.map((k) => fly(k, { x: laneX('R') + segX(old, old.indexOf(k)) + SEG[k]!.w / 2, y: midY(n) }, { x: labelX('R'), y: midY(n) }, instant, true)));
  };
  /** 세션 계층: 데이터 사이에 동기점(체크포인트) 깃발이 꽂힌다 */
  const syncPoints = async () => {
    const enc = cap.children[segs.indexOf('enc')];
    if (!enc) return;
    const x0 = segX(segs, segs.indexOf('enc'));
    const w = SEG.enc!.w;
    const flags = svg('g', { class: 'osi-sync' });
    [0.2, 0.75].forEach((f, i) => {
      const fx = x0 + w * f;
      const g = svg('g');
      g.append(svg('line', { x1: fx, y1: -11, x2: fx, y2: -24 }), svg('path', { d: `M${fx} -24 l8 3 l-8 3 z` }), svg('text', { x: fx + 9, y: -14 }, String(i + 1)));
      g.setAttribute('opacity', '0');
      flags.append(g);
    });
    const cap1 = svg('text', { x: widthOf(segs) / 2 + 6, y: 4, class: 'osi-sync-cap' }, '◀ 동기점(체크포인트)');
    cap1.setAttribute('opacity', '0');
    flags.append(cap1);
    cap.append(flags);
    const gs = [...flags.children] as SVGGElement[];
    for (const g of gs) await tween(T(380, false), (t) => g.setAttribute('opacity', String(t))).done;
  };
  const BIT = '10110010011101';
  const wireRun = async (instant: boolean) => {
    glow(null, 0);
    capWrap.setAttribute('visibility', 'hidden');
    const len = wire.getTotalLength();
    bits.replaceChildren();
    const nodes = [...BIT].map((b) => { const t = svg('text', { class: `osi-bit b${b}`, 'text-anchor': 'middle' }, b); bits.append(t); return t; });
    const stops = devs.map((d) => (WIRE_Y - BOTTOM) + (d.x - xL));
    spark.classList.add('on');
    await tween(T(3000, instant), (t) => {
      const head = lerp(0, len + BIT.length * 12, t);
      nodes.forEach((n, k) => {
        const p = wire.getPointAtLength(Math.max(0, Math.min(len, head - k * 12)));
        n.setAttribute('x', String(p.x)); n.setAttribute('y', String(p.y + 4));
      });
      devOn(stops.findIndex((d) => head - BIT.length * 12 < d + 36 && head > d - 36));
    }, linear).done;
    spark.classList.remove('on');
    bits.replaceChildren(); devOn(-1);
  };
  const toBits = async (instant: boolean) => {
    // 물리 계층: 프레임 전체가 0과 1로 바뀐다
    await down(1, FRAME, [])(instant);
    if (instant) return;
    cap.querySelectorAll('text').forEach((t) => { t.textContent = [...t.textContent!].map((c) => (c.charCodeAt(0) % 2 ? '1' : '0')).join(''); });
  };

  type Step = { t: string; b: string; side: 'L' | 'R' | null; n: number; run: (instant: boolean) => Promise<void> };
  const steps: Step[] = [
    { side: 'L', n: 7, t: '7 응용 계층 — 데이터와 응용 헤더(AH)', b: '웹 브라우저가 "GET /index.html" 요청 데이터를 만들고, 응용 계층 헤더(AH)를 붙인다. OSI 참조 모델에서는 7계층부터 2계층까지 각 계층이 자기 헤더를 하나씩 붙인다.', run: down(7, ['ah', 'data'], ['ah', 'data']) },
    { side: 'L', n: 6, t: '6 표현 계층 — 암호화·압축 + 표현 헤더(PH)', b: '데이터를 보내기 좋은 형식으로 바꾼다(🔒 암호화, 압축, 코드 변환). 어떤 형식으로 바꿨는지 알리는 표현 헤더(PH)를 붙인다.', run: down(6, ['ph', 'ah', 'enc'], ['ph', 'enc']) },
    { side: 'L', n: 5, t: '5 세션 계층 — 세션 헤더(SH)와 동기점', b: '세션 헤더(SH)를 붙인다. 대화 방식(반이중·전이중)과 동기점(체크포인트)을 정해, 큰 데이터를 보내다 끊기면 마지막 동기점부터 다시 보낼 수 있게 한다. (실제 인터넷 TCP/IP에서는 이 일을 응용 프로그램이 맡아 SH가 따로 없다)', run: down(5, ['sh', 'ph', 'ah', 'enc'], ['sh'], syncPoints) },
    { side: 'L', n: 4, t: '4 전송 계층 — TCP 헤더가 붙는다', b: '전송 계층 이름표에서 TCP 헤더(포트 번호·순서 번호)가 날아와 앞에 붙는다. 이제 이름은 "세그먼트".', run: down(4, ['tcp', ...UP], ['tcp']) },
    { side: 'L', n: 3, t: '3 네트워크 계층 — IP 헤더가 붙는다', b: '출발지·목적지 IP 주소를 담은 IP 헤더가 붙는다. 이름은 "패킷". 라우터는 이 IP를 보고 길을 정한다.', run: down(3, ['ip', 'tcp', ...UP], ['ip']) },
    { side: 'L', n: 2, t: '2 데이터 링크 계층 — MAC 헤더와 FCS', b: '다음 장비의 MAC 주소를 담은 헤더가 앞에, 오류 검사용 FCS(CRC)가 뒤에 붙는다(뒤에 붙는 것은 트레일러). 이름은 "프레임".', run: down(2, FRAME, ['mac', 'fcs']) },
    { side: 'L', n: 1, t: '1 물리 계층 — 비트로 바꾸기', b: '프레임 전체가 0과 1의 비트가 된다. 물리 계층은 헤더를 붙이지 않고, 랜카드가 비트를 전압의 높낮이(전기 신호)로 만들어 케이블에 흘려보낸다.', run: toBits },
    { side: null, n: 0, t: '전송 매체 — 전기 신호가 흐른다', b: '신호가 허브(1계층: 그대로 증폭), 스위치(2계층: MAC을 보고 포트 선택), 라우터(3계층: IP를 보고 경로 선택)를 지나 목적지로 간다.', run: wireRun },
    { side: 'R', n: 1, t: '1 물리 계층 — 신호를 비트로', b: '받는 쪽 랜카드가 전기 신호를 다시 비트로 읽고, 프레임으로 모은다.', run: up(1, FRAME) },
    { side: 'R', n: 2, t: '2 데이터 링크 계층 — MAC 헤더와 FCS를 뗀다 (역캡슐화)', b: '목적지 MAC이 내 것인지 확인하고, FCS로 오류를 검사한 뒤 MAC 헤더와 FCS를 떼어 낸다. 남은 것은 패킷.', run: up(2, ['ip', 'tcp', ...UP]) },
    { side: 'R', n: 3, t: '3 네트워크 계층 — IP 헤더를 뗀다', b: '목적지 IP가 내 주소인지 확인하고 IP 헤더를 떼어 낸다. 남은 것은 세그먼트.', run: up(3, ['tcp', ...UP]) },
    { side: 'R', n: 4, t: '4 전송 계층 — 포트로 프로그램 찾기', b: 'TCP 헤더의 포트 번호로 어느 프로그램(웹 서버 80/443)에 줄지 정하고, 순서를 맞춘 뒤 헤더를 뗀다.', run: up(4, UP) },
    { side: 'R', n: 5, t: '5 세션 계층 — 세션 헤더(SH)를 뗀다', b: 'SH를 보고 어느 세션(대화)의 데이터인지, 어느 동기점까지 받았는지 확인한 뒤 떼어 낸다.', run: up(5, ['ph', 'ah', 'enc']) },
    { side: 'R', n: 6, t: '6 표현 계층 — PH를 떼고 복호화', b: 'PH에 적힌 형식대로 암호와 압축을 풀어, 응용 프로그램이 읽을 수 있는 데이터로 되돌린다.', run: up(6, ['ah', 'data']) },
    { side: 'R', n: 7, t: '7 응용 계층 — AH를 떼고 데이터 도착', b: '웹 서버가 "GET /index.html" 요청을 받는다. 내려갈 때 붙인 헤더를 올라오며 차례로 뗀 것이 역캡슐화다.', run: up(7, ['data']) },
  ];

  const reset = () => {
    glow(null, 0); devOn(-1);
    bits.replaceChildren(); flyLayer.replaceChildren();
    drawCap([]);
    side = 'L'; capY = midY(7) - RH; place();
    capWrap.setAttribute('visibility', 'hidden');
    detail.reset();
  };
  const layerInfo = (L: Layer) => {
    const dl = el('dl', 'osi-info');
    for (const [k, v] of [['역할', L.role], ['프로토콜', L.protos], ['장비', L.devices], ['전송 단위(PDU)', L.pdu]] as const) dl.append(el('dt', '', k), el('dd', '', v));
    return dl;
  };
  const pl = player({
    steps: steps.length,
    go: async (k, instant) => {
      const st = steps[k]!;
      if (!instant) {
        const L = OSI.find((x) => x.n === st.n);
        const box = el('div');
        box.append(el('p', '', st.b));
        // 이 단계에서 무슨 일이 일어나는지 보여 주는 예시 장면 (누르면 펼친다)
        const open = el('button', 'scene-open', '🎬 예시 애니메이션으로 보기');
        open.addEventListener('click', () => showStepScene(k));
        box.append(open);
        if (L) box.append(layerInfo(L));
        detail.show(st.t, box, L ? `${L.n}계층 ${L.ko} 계층 · ${L.en}` : undefined);
      }
      await st.run(instant);
    },
    reset,
    label: (k) => steps[k]!.t.split(' — ')[0]!,
    delay: 700,
  });
  reset();

  /** 계층을 누르면: 지금 위치에서 그 계층까지 한 칸씩 진행한다 (팝업은 띄우지 않고 아래 설명 칸에 안내한다) */
  async function goLayer(sd: 'L' | 'R', L: Layer) {
    const k = steps.findIndex((st) => st.side === sd && st.n === L.n);
    for (const r of rows) r.g.classList.toggle('picked', r.side === sd && r.n === L.n);
    speed = Math.abs(k - pl.at()) > 3 ? 0.55 : 1;
    await pl.jump(k);
    speed = 1;
  }

  /** k단계에서 일어나는 일을 장면 팝업으로 (설명 칸의 🎬 단추를 눌렀을 때) */
  function showStepScene(k: number) {
    const st = steps[k]!;
    const L = OSI.find((x) => x.n === st.n);
    const key = st.n ? LAYER_SCENE[st.n]! : 'hub';
    openModal(st.t, [OSI_SCENES[key]!(), st.b, ...(L ? [layerInfo(L)] : [])], L ? `${L.n}계층 ${L.ko} 계층 · ${L.en}` : undefined);
  }

  const scroll = el('div', 'viz-scroll');
  scroll.append(s);
  body.append(tools, pl.el, scroll, legend, detail.el);
  return {
    el: root,
    focus(names) {
      // 정답 계층에 파란 점선 테두리와 "정답" 표시
      s.querySelectorAll('.osi-ring').forEach((x) => x.remove());
      for (const r of rows) {
        const L = OSI.find((x) => x.n === r.n)!;
        const hit = nameHits([`${L.ko} 계층`, L.ko, L.en, `${L.en} Layer`], names);
        r.g.classList.toggle('focus', hit);
        if (!hit || r.side !== 'L') continue;
        const ring = svg('g', { class: 'osi-ring' });
        ring.append(svg('rect', { x: SX - 3, y: rowY(L.n) - 3, width: SW + 6, height: RH + 6, rx: 10 }),
          svg('text', { x: SX + SW + 6, y: midY(L.n) + 4 }, '◀ 정답'));
        s.append(ring);
      }
    },
    dispose: () => pl.dispose(),
  };
}

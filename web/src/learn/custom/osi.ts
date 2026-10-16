// OSI 7계층: 계층 그림(한글·영문·프로토콜·장비·PDU) + 캡슐화 → 전기 신호 → 역캡슐화 애니메이션.
import { el } from '../../view/stage';
import { detailBox, frame, lerp, linear, nameHits, player, svg, tween, type Viz } from '../core';

interface Layer { n: number; ko: string; en: string; pdu: string; protos: string; devices: string; role: string }

export const OSI: Layer[] = [
  { n: 7, ko: '응용', en: 'Application', pdu: '데이터', protos: 'HTTP · FTP · SMTP · DNS · Telnet · SNMP · DHCP', devices: '게이트웨이', role: '사용자가 쓰는 응용 프로그램(웹 브라우저, 메일)에 네트워크 서비스를 제공한다.' },
  { n: 6, ko: '표현', en: 'Presentation', pdu: '데이터', protos: 'JPEG · MPEG · ASCII · EBCDIC · SSL/TLS(암호화)', devices: '-', role: '데이터 형식을 통일한다: 코드 변환(인코딩), 암호화·복호화, 압축.' },
  { n: 5, ko: '세션', en: 'Session', pdu: '데이터', protos: 'NetBIOS · RPC · SQL 세션', devices: '-', role: '양쪽의 대화(세션)를 열고, 유지하고, 닫는다. 동기점(체크포인트)을 두어 끊기면 거기서 다시 시작한다.' },
  { n: 4, ko: '전송', en: 'Transport', pdu: '세그먼트', protos: 'TCP · UDP', devices: 'L4 스위치(부하 분산)', role: '종단 간(End-to-End) 신뢰성 있는 전송. 포트 번호로 프로그램을 찾고, 순서·흐름·오류를 제어한다.' },
  { n: 3, ko: '네트워크', en: 'Network', pdu: '패킷', protos: 'IP · ICMP · IGMP · ARP · RARP · RIP · OSPF', devices: '라우터 · L3 스위치', role: '논리 주소(IP)를 붙이고, 목적지까지 갈 경로를 고른다(라우팅).' },
  { n: 2, ko: '데이터 링크', en: 'Data Link', pdu: '프레임', protos: 'Ethernet · HDLC · PPP · Wi-Fi(802.11) · MAC', devices: '스위치 · 브리지 · 랜카드', role: '바로 이웃한 장비 사이에 프레임을 전달한다. 물리 주소(MAC), 오류 검출(FCS/CRC), 흐름 제어.' },
  { n: 1, ko: '물리', en: 'Physical', pdu: '비트', protos: 'RS-232C · UTP 케이블 · 광케이블 · 전기 신호', devices: '허브 · 리피터 · 케이블', role: '0과 1(비트)을 전기·빛·전파 신호로 바꿔 실제로 흘려보낸다. 전압, 커넥터 핀 같은 규격을 정한다.' },
];

const TCPIP = [
  { name: '응용', en: 'Application', from: 7, to: 5 },
  { name: '전송', en: 'Transport', from: 4, to: 4 },
  { name: '인터넷', en: 'Internet', from: 3, to: 3 },
  { name: '네트워크 액세스', en: 'Network Access', from: 2, to: 1 },
];

// 캡슐 조각: 데이터와 계층별 헤더
const SEG: Record<string, { label: string; w: number; layer: number }> = {
  data: { label: 'DATA', w: 64, layer: 7 },
  enc: { label: '🔒DATA', w: 72, layer: 6 },
  tcp: { label: 'TCP', w: 46, layer: 4 },
  ip: { label: 'IP', w: 40, layer: 3 },
  mac: { label: 'MAC', w: 48, layer: 2 },
  fcs: { label: 'FCS', w: 42, layer: 2 },
};

const W = 940, LX = 46, RX = 644, SW = 290, Y0 = 46, RH = 58, GAP = 6;
const rowY = (n: number) => Y0 + (7 - n) * (RH + GAP);
const LANE = (LX + SW + RX) / 2;
const WIRE_Y = rowY(1) + RH + 52;

export function osiViz(): Viz {
  const { root, body } = frame('OSI 7계층과 캡슐화', 'Open Systems Interconnection Reference Model');
  const tools = el('div', 'viz-tools');
  const tcpBtn = el('button', '', 'TCP/IP 4계층과 비교');
  const mn = el('span', 'muted small', '외우기: 아래부터 "물·데·네·전·세·표·응" / Please Do Not Throw Sausage Pizza Away');
  tools.append(tcpBtn, mn);

  const s = svg('svg', { viewBox: `0 0 ${W} ${WIRE_Y + 44}`, class: 'osi-svg', role: 'img', 'aria-label': 'OSI 7계층 그림' });
  const detail = detailBox('계층을 누르면 역할·프로토콜·장비를 보여 줍니다. ▶ 재생을 누르면 데이터가 계층을 내려가며 캡슐에 싸이고, 전기 신호로 건너가 다시 풀리는 과정을 봅니다.');

  // ── 두 컴퓨터의 계층 기둥 ──
  const rows: { side: 'L' | 'R'; n: number; g: SVGGElement }[] = [];
  const titles = [svg('text', { x: LX + SW / 2, y: 28, class: 'osi-side' }, '보내는 쪽 (PC A)'), svg('text', { x: RX + SW / 2, y: 28, class: 'osi-side' }, '받는 쪽 (PC B)')];
  s.append(...titles);
  for (const side of ['L', 'R'] as const) {
    const x = side === 'L' ? LX : RX;
    for (const L of OSI) {
      const y = rowY(L.n);
      const g = svg('g', { class: `osi-row osi-l${L.n}`, tabindex: 0, role: 'button', 'aria-label': `${L.n}계층 ${L.ko} 계층` });
      g.append(
        svg('rect', { x, y, width: SW, height: RH, rx: 9, class: 'osi-box' }),
        svg('text', { x: x + 16, y: y + 36, class: 'osi-num' }, String(L.n)),
        svg('text', { x: x + 44, y: y + 25, class: 'osi-ko' }, `${L.ko} 계층`),
        svg('text', { x: x + 44 + (L.ko.length + 3) * 15, y: y + 25, class: 'osi-en' }, L.en),
        svg('text', { x: x + 44, y: y + 45, class: 'osi-proto' }, L.protos.length > 30 ? `${L.protos.slice(0, 29)}…` : L.protos),
        svg('text', { x: x + SW - 10, y: y + 45, class: 'osi-pdu', 'text-anchor': 'end' }, L.pdu),
      );
      g.addEventListener('click', () => showLayer(L));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showLayer(L); } });
      s.append(g);
      rows.push({ side, n: L.n, g });
    }
  }

  // ── TCP/IP 4계층 괄호 (켜고 끄기) ──
  const tcpip = svg('g', { class: 'osi-tcpip' });
  for (const t of TCPIP) {
    const y1 = rowY(t.from) + 3, y2 = rowY(t.to) + RH - 3;
    tcpip.append(svg('path', { d: `M${LX - 8} ${y1} H${LX - 16} V${y2} H${LX - 8}`, class: 'osi-brace' }));
    const tx = svg('text', { x: LX - 24, y: (y1 + y2) / 2, class: 'osi-tcpip-t', transform: `rotate(-90 ${LX - 24} ${(y1 + y2) / 2})` }, t.name);
    tcpip.append(tx);
  }
  tcpip.setAttribute('visibility', 'hidden');
  s.append(tcpip);
  tcpBtn.addEventListener('click', () => {
    const on = tcpip.getAttribute('visibility') === 'hidden';
    tcpip.setAttribute('visibility', on ? 'visible' : 'hidden');
    tcpBtn.classList.toggle('on', on);
    if (on) detail.show('TCP/IP 4계층과 OSI 7계층', 'OSI의 응용·표현·세션(7~5)은 TCP/IP의 응용 계층 하나로, 데이터 링크·물리(2~1)는 네트워크 액세스 계층 하나로 묶인다. 전송(4)과 네트워크(3)는 TCP/IP에서 전송·인터넷 계층에 해당한다.', 'OSI는 이론 모델, TCP/IP는 실제 인터넷이 쓰는 모델');
  });

  // ── 전선과 장비 ──
  const xL = LX + SW / 2, xR = RX + SW / 2, yB = rowY(1) + RH;
  const wire = svg('path', { d: `M${xL} ${yB} V${WIRE_Y} H${xR} V${yB}`, class: 'osi-wire' });
  const spark = svg('path', { d: `M${xL} ${yB} V${WIRE_Y} H${xR} V${yB}`, class: 'osi-spark' });
  s.append(wire, spark);
  const devs = [
    { x: LANE - 170, name: '허브', layer: 1, note: '허브(1계층): 받은 전기 신호를 그대로 키워 모든 포트로 내보낸다. 주소를 보지 않는다.' },
    { x: LANE, name: '스위치', layer: 2, note: '스위치(2계층): 프레임의 MAC 주소를 보고, 목적지가 연결된 포트로만 보낸다.' },
    { x: LANE + 170, name: '라우터', layer: 3, note: '라우터(3계층): 패킷의 IP 주소를 열어 보고, 목적지 네트워크로 가는 다음 경로를 고른다.' },
  ];
  const devG = devs.map((d) => {
    const g = svg('g', { class: 'osi-dev' });
    g.append(svg('rect', { x: d.x - 40, y: WIRE_Y - 15, width: 80, height: 30, rx: 7 }),
      svg('text', { x: d.x, y: WIRE_Y + 5, 'text-anchor': 'middle' }, `${d.name} L${d.layer}`));
    g.addEventListener('click', () => detail.show(`${d.name} (${d.layer}계층 장비)`, d.note));
    s.append(g);
    return g;
  });

  // ── 캡슐 ──
  const cap = svg('g', { class: 'osi-cap' });
  const capLabel = svg('text', { class: 'osi-cap-label', 'text-anchor': 'middle' });
  const link = svg('line', { class: 'osi-link' });
  const bits = svg('g', { class: 'osi-bits' });
  s.append(link, cap, capLabel, bits);

  let segs: string[] = [];
  let capX = LANE, capY = rowY(7) + RH / 2;
  const drawCap = (keys: string[], pop?: string) => {
    segs = keys;
    cap.replaceChildren();
    const total = keys.reduce((a, k) => a + SEG[k]!.w, 0);
    let x = -total / 2;
    for (const k of keys) {
      const sg = SEG[k]!;
      const g = svg('g', { class: `osi-seg osi-l${sg.layer}${k === pop ? ' pop' : ''}` });
      g.append(svg('rect', { x, y: -15, width: sg.w - 2, height: 30, rx: 5 }), svg('text', { x: x + (sg.w - 2) / 2, y: 5, 'text-anchor': 'middle' }, sg.label));
      cap.append(g);
      x += sg.w;
    }
  };
  const place = (x: number, y: number, label: string, side: 'L' | 'R' | null) => {
    capX = x; capY = y;
    cap.setAttribute('transform', `translate(${x} ${y})`);
    capLabel.setAttribute('x', String(x));
    capLabel.setAttribute('y', String(y - 22));
    capLabel.textContent = label;
    if (side) {
      const ex = side === 'L' ? LX + SW : RX;
      link.setAttribute('x1', String(ex)); link.setAttribute('y1', String(y));
      const total = segs.reduce((a, k) => a + SEG[k]!.w, 0);
      link.setAttribute('x2', String(side === 'L' ? x - total / 2 : x + total / 2)); link.setAttribute('y2', String(y));
      link.setAttribute('visibility', 'visible');
    } else link.setAttribute('visibility', 'hidden');
  };
  const glow = (side: 'L' | 'R' | null, n: number) => {
    for (const r of rows) r.g.classList.toggle('active', r.side === side && r.n === n);
  };
  const devOn = (k: number) => devG.forEach((g, j) => g.classList.toggle('active', j === k));

  const move = (toX: number, toY: number, label: string, side: 'L' | 'R' | null, instant: boolean, ms = 600) => {
    const fx = capX, fy = capY;
    return tween(instant ? 0 : ms, (t) => place(lerp(fx, toX, t), lerp(fy, toY, t), label, side)).done;
  };

  // ── 단계 ──
  type Step = { t: string; b: string; run: (instant: boolean) => Promise<void> };
  const sx = LANE - 40, rx = LANE + 40;
  const at = (n: number) => rowY(n) + RH / 2;
  const down = (n: number, keys: string[], pop: string | undefined, label: string) => async (i: boolean) => {
    glow('L', n); devOn(-1); bits.replaceChildren(); cap.setAttribute('visibility', 'visible');
    await move(sx, at(n), label, 'L', i);
    drawCap(keys, i ? undefined : pop);
    place(sx, at(n), label, 'L');
  };
  const up = (n: number, keys: string[], label: string) => async (i: boolean) => {
    glow('R', n); devOn(-1); bits.replaceChildren(); cap.setAttribute('visibility', 'visible');
    // 벗겨지는 헤더를 잠깐 보여 준 뒤 지운다
    if (!i && keys.length < segs.length) {
      for (const g of cap.querySelectorAll('.osi-seg')) {
        const k = segs[[...cap.children].indexOf(g)];
        if (k && !keys.includes(k)) g.classList.add('peel');
      }
      await tween(450, () => {}).done;
    }
    drawCap(keys);
    await move(rx, at(n), label, 'R', i);
  };
  const BITS = '10110010011101';
  const runWire = async (instant: boolean) => {
    glow(null, 0);
    cap.setAttribute('visibility', 'hidden');
    link.setAttribute('visibility', 'hidden');
    capLabel.textContent = '';
    const len = wire.getTotalLength();
    bits.replaceChildren();
    const nodes = [...BITS].map((b) => {
      const t = svg('text', { class: `osi-bit b${b}`, 'text-anchor': 'middle' }, b);
      bits.append(t);
      return t;
    });
    spark.classList.add('on');
    const stops = devs.map((d) => {
      // 장비 위치까지의 경로 길이
      return (yB < WIRE_Y ? WIRE_Y - yB : 0) + (d.x - xL);
    });
    const drawAt = (head: number) => {
      nodes.forEach((t, k) => {
        const p = wire.getPointAtLength(Math.max(0, Math.min(len, head - k * 13)));
        t.setAttribute('x', String(p.x));
        t.setAttribute('y', String(p.y + 4));
      });
      const k = stops.findIndex((d) => head - BITS.length * 13 < d + 40 && head > d - 40);
      devOn(k);
    };
    await tween(instant ? 0 : 3200, (t) => drawAt(lerp(0, len + BITS.length * 13, t)), linear).done;
    spark.classList.remove('on');
    bits.replaceChildren();
    devOn(-1);
  };

  const steps: Step[] = [
    { t: '7 응용 계층 — 데이터 만들기', b: '웹 브라우저가 "GET /index.html" 같은 요청 데이터를 만든다. 아직 아무 헤더도 붙지 않은 순수한 데이터다.', run: async (i) => { drawCap(['data']); await down(7, ['data'], 'data', '데이터')(i); } },
    { t: '6 표현 계층 — 암호화·압축', b: '보내기 좋은 형식으로 바꾼다. HTTPS라면 TLS로 암호화되고, 이미지라면 압축된다.', run: down(6, ['enc'], 'enc', '데이터 (암호화)') },
    { t: '5 세션 계층 — 대화 연결', b: '두 프로그램 사이의 대화(세션)를 열고 유지한다. 중간에 끊겨도 동기점부터 다시 시작할 수 있게 한다.', run: down(5, ['enc'], undefined, '데이터') },
    { t: '4 전송 계층 — TCP 헤더 붙이기 (캡슐화)', b: '포트 번호(어느 프로그램인지)와 순서 번호를 담은 TCP 헤더를 앞에 붙인다. 이제 이름은 "세그먼트".', run: down(4, ['tcp', 'enc'], 'tcp', '세그먼트') },
    { t: '3 네트워크 계층 — IP 헤더 붙이기', b: '출발지·목적지 IP 주소를 담은 IP 헤더를 붙인다. 이름은 "패킷". 라우터는 이 IP를 보고 길을 정한다.', run: down(3, ['ip', 'tcp', 'enc'], 'ip', '패킷') },
    { t: '2 데이터 링크 계층 — MAC 헤더와 FCS', b: '바로 다음 장비의 MAC 주소를 담은 헤더를 앞에, 오류 검사용 FCS(CRC)를 뒤에 붙인다. 이름은 "프레임".', run: down(2, ['mac', 'ip', 'tcp', 'enc', 'fcs'], 'mac', '프레임') },
    { t: '1 물리 계층 — 비트를 전기 신호로', b: '프레임 전체를 0과 1의 비트로 바꾼다. 랜카드가 비트를 전압의 높낮이(전기 신호)로 만들어 케이블에 흘려보낸다.', run: down(1, ['mac', 'ip', 'tcp', 'enc', 'fcs'], undefined, '비트') },
    { t: '전송 매체 — 신호가 케이블을 따라 흐른다', b: '전기 신호가 허브(1계층: 그대로 증폭), 스위치(2계층: MAC 보고 포트 선택), 라우터(3계층: IP 보고 경로 선택)를 지나 목적지로 간다.', run: runWire },
    { t: '1 물리 계층 — 신호를 비트로', b: '받는 쪽 랜카드가 전기 신호를 다시 0과 1의 비트로 읽어 낸다.', run: up(1, ['mac', 'ip', 'tcp', 'enc', 'fcs'], '비트') },
    { t: '2 데이터 링크 계층 — MAC 확인, 헤더 벗기기 (역캡슐화)', b: '목적지 MAC이 내 것인지 확인하고, FCS로 오류를 검사한 뒤 MAC 헤더와 FCS를 떼어 낸다.', run: up(2, ['ip', 'tcp', 'enc'], '패킷') },
    { t: '3 네트워크 계층 — IP 확인', b: '목적지 IP가 내 주소인지 확인하고 IP 헤더를 떼어 낸다.', run: up(3, ['tcp', 'enc'], '세그먼트') },
    { t: '4 전송 계층 — 포트로 프로그램 찾기', b: 'TCP 헤더의 포트 번호로 어느 프로그램(예: 웹 서버 80/443)에 줄지 정하고, 순서를 맞춘 뒤 헤더를 뗀다.', run: up(4, ['enc'], '데이터') },
    { t: '5 세션 계층', b: '열려 있는 세션(대화)에 데이터를 넘긴다.', run: up(5, ['enc'], '데이터') },
    { t: '6 표현 계층 — 복호화·압축 풀기', b: '암호를 풀고 압축을 풀어, 응용 프로그램이 읽을 수 있는 형식으로 되돌린다.', run: up(6, ['data'], '데이터') },
    { t: '7 응용 계층 — 데이터 도착', b: '웹 서버 프로그램이 "GET /index.html" 요청을 받는다. 내려갈 때 붙인 헤더를 올라오며 차례로 떼어 낸 것이 역캡슐화다.', run: up(7, ['data'], '데이터') },
  ];

  const reset = () => {
    glow(null, 0); devOn(-1);
    bits.replaceChildren();
    drawCap(['data']);
    cap.setAttribute('visibility', 'hidden');
    link.setAttribute('visibility', 'hidden');
    capLabel.textContent = '';
    capX = sx; capY = at(7);
    detail.reset();
  };
  const pl = player({
    steps: steps.length,
    go: async (k, instant) => {
      if (!instant) detail.show(steps[k]!.t, steps[k]!.b);
      await steps[k]!.run(instant);
    },
    reset,
    label: (k) => steps[k]!.t.split(' — ')[0]!,
    delay: 900,
  });
  reset();

  function showLayer(L: Layer) {
    const box = el('div', 'osi-info');
    const dl = el('dl');
    for (const [k, v] of [['역할', L.role], ['프로토콜', L.protos], ['장비', L.devices], ['전송 단위(PDU)', L.pdu]] as const) dl.append(el('dt', '', k), el('dd', '', v));
    box.append(dl);
    detail.show(`${L.n}계층 · ${L.ko} 계층`, box, L.en);
    for (const r of rows) r.g.classList.toggle('picked', r.n === L.n);
  }

  const scroll = el('div', 'viz-scroll');
  scroll.append(s);
  body.append(tools, pl.el, scroll, detail.el);
  return {
    el: root,
    focus(names) {
      // 정답 계층에 테두리와 "정답" 표시를 단다 (계층 색과 헷갈리지 않게 파란 점선)
      s.querySelectorAll('.osi-ring').forEach((x) => x.remove());
      for (const r of rows) {
        const L = OSI.find((x) => x.n === r.n)!;
        const hit = nameHits([`${L.ko} 계층`, L.ko, L.en, `${L.en} Layer`], names);
        r.g.classList.toggle('focus', hit);
        if (!hit) continue;
        const x = r.side === 'L' ? LX : RX, y = rowY(L.n);
        const ring = svg('g', { class: 'osi-ring' });
        ring.append(svg('rect', { x: x - 4, y: y - 4, width: SW + 8, height: RH + 8, rx: 12 }));
        if (r.side === 'L') ring.append(svg('text', { x: x + SW + 8, y: y + RH / 2 + 4 }, '◀ 정답'));
        s.append(ring);
      }
    },
    dispose: () => pl.dispose(),
  };
}

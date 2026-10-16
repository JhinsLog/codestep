// OSI 설명용 장면: 캡슐 조각·계층·장비를 누르면 "무슨 일이 일어나는지"를 짧은 애니메이션으로 보여 준다.
import { svg } from '../core';
import { scene, type SceneApi } from '../scene';

const W = 560;

/** 데이터: 사용자의 입력이 응용 프로그램에서 보낼 내용이 된다 */
const data = () => scene({
  actors: [{ id: 'u', x: 60, y: 95, icon: '👤', label: '사용자' }, { id: 'b', x: 230, y: 95, icon: '🌐', label: '웹 브라우저' }, { id: 's', x: 490, y: 95, icon: '🖥️', label: '웹 서버' }],
  links: [['b', 's', 'dash']],
  async play(s) {
    s.caption('사용자가 주소창에 주소를 입력한다');
    const t = s.token('주소 입력', 60, 140);
    await t.move(230, 140, 800);
    t.label('GET /index.html');
    s.flash('b');
    s.caption('응용 프로그램(브라우저)이 보낼 내용, 즉 "데이터"를 만든다');
    await s.wait(1100);
    await t.move(490, 140, 1300);
    await s.say('s', '요청 도착!', 'good', 1200);
    s.caption('아래 계층들은 이 데이터를 헤더로 겹겹이 포장해 나를 뿐, 내용은 응용 계층끼리만 쓴다');
  },
});

/** AH: 응용 헤더를 보고 알맞은 서비스가 처리한다 */
const ah = () => scene({
  actors: [{ id: 'b', x: 60, y: 95, icon: '🌐', label: '브라우저' }, { id: 'http', x: 480, y: 50, icon: '📄', label: 'HTTP 서비스' }, { id: 'ftp', x: 480, y: 140, icon: '📁', label: 'FTP 서비스', kind: 'dim' }],
  async play(s) {
    s.caption('응용 헤더(AH)에는 "어떤 서비스의 어떤 요청인지" 같은 응용 계층 정보가 적힌다');
    const t = s.token('AH: HTTP GET | DATA', 60, 95);
    await t.move(290, 95, 1100);
    s.caption('받는 쪽 응용 계층이 AH를 읽는다 → "HTTP 요청이네"');
    await s.wait(900);
    await t.move(480, 95 - 26, 700);
    t.label('DATA');
    s.flash('http');
    await s.say('http', 'HTTP 요청은 내가 처리', 'good', 1300);
    s.caption('AH를 읽고 알맞은 서비스에 넘긴 뒤 AH는 떼어 낸다 (FTP 서비스는 상관없다)');
  },
});

/** PH·암호화: 도청자가 가로채도 암호화되어 있으면 읽지 못한다 */
const ph = () => scene({
  actors: [{ id: 'me', x: 60, y: 112, icon: '💻', label: '내 PC' }, { id: 'bank', x: 500, y: 112, icon: '🏦', label: '은행 서버' }, { id: 'eve', x: 280, y: 32, icon: '🕵️', label: '도청자', kind: 'bad' }],
  links: [['me', 'bank']],
  async play(s) {
    s.caption('① 암호화하지 않고 보내면');
    const a = s.token('pw=1234', 60, 112, 'plain');
    await a.move(280, 112, 900);
    const copy = s.token('pw=1234', 280, 112, 'plain');
    const go = a.move(430, 112, 900);
    await copy.move(385, 32, 500);
    await s.say('eve', '비밀번호 1234 보인다!', 'bad', 1300);
    await copy.fade(300);
    await go;
    a.remove();
    s.caption('② 표현 계층(PH)이 암호화하면');
    const b = s.token('pw=1234', 60, 150, 'plain');
    await s.say('me', '🔒 TLS로 암호화', '', 900);
    b.label('🔒 x8#Qa%2!');
    b.cls('locked');
    await b.move(280, 112, 900);
    const copy2 = s.token('🔒 x8#Qa%2!', 280, 112, 'locked');
    const go2 = b.move(430, 112, 900);
    await copy2.move(395, 32, 500);
    await s.say('eve', '??? 알아볼 수 없다', 'bad', 1300);
    await copy2.fade(300);
    await go2;
    await s.say('bank', '🔑 키로 복호화', 'good', 900);
    b.label('pw=1234');
    b.cls('locked', false);
    s.caption('표현 계층은 암호화·압축·코드 변환을 하고, 어떤 방식인지 PH에 적는다. 받는 쪽은 PH를 보고 똑같이 되돌린다');
  },
});

/** SH·동기점: 끊겨도 마지막 동기점부터 다시 보낸다 */
const sh = () => scene({
  actors: [{ id: 'a', x: 60, y: 80, icon: '💻', label: '보내는 쪽' }, { id: 'b', x: 500, y: 80, icon: '🖥️', label: '받는 쪽' }],
  links: [['a', 'b']],
  async play(s) {
    s.caption('큰 파일을 6조각으로 나눠 보낸다. 세션 계층은 중간중간 동기점(체크포인트)을 찍는다');
    const got = (i: number) => s.mark(250 + i * 36, 150, `${i}`, 'got');
    const flag = (i: number, k: number) => s.mark(250 + i * 36, 128, `◆${k}`, 'flag');
    for (let i = 1; i <= 4; i++) {
      const t = s.token(`조각 ${i}`, 60, 80);
      await t.move(500, 80, 650);
      t.remove();
      got(i);
      if (i === 2 || i === 4) { flag(i, i / 2); s.caption(`동기점 ${i / 2} — 여기까지 잘 받았다고 서로 확인`); await s.wait(500); }
    }
    const t5 = s.token('조각 5', 60, 80);
    await t5.move(280, 80, 600);
    s.mark(280, 60, '⚡', 'bolt');
    s.caption('⚡ 조각 5를 보내다 연결이 끊겼다!');
    await t5.fade(400);
    await s.say('a', '처음부터? 아니, 동기점 2부터!', 'good', 1500);
    for (let i = 5; i <= 6; i++) {
      const t = s.token(`조각 ${i}`, 60, 80);
      await t.move(500, 80, 650);
      t.remove();
      got(i);
    }
    s.caption('이렇게 대화를 열고·유지하고·닫고, 동기점으로 다시 시작할 위치를 정하는 것이 세션 계층. 그 정보가 세션 헤더(SH)에 담긴다');
  },
});

/** TCP: 순서 번호로 재전송·정렬, 포트 번호로 프로그램 찾기 */
const tcp = () => scene({
  actors: [{ id: 'a', x: 55, y: 95, icon: '💻', label: '보내는 PC' }, { id: 't', x: 300, y: 95, icon: '📦', label: '받는 쪽 TCP' }, { id: 'web', x: 495, y: 45, icon: '🌐', label: '웹 서버 :80' }, { id: 'mail', x: 495, y: 145, icon: '✉️', label: '메일 :25', kind: 'dim' }],
  links: [['a', 't']],
  async play(s) {
    s.caption('TCP 헤더의 순서 번호(seq)로 빠진 조각을 찾고 순서를 맞춘다');
    const t1 = s.token('seq 1', 55, 95);
    const t2 = s.token('seq 2', 55, 95);
    const t3 = s.token('seq 3', 55, 95);
    const m1 = t1.move(250, 70, 700);
    await s.wait(250);
    const m2 = t2.move(170, 95, 450);
    await s.wait(250);
    const m3 = t3.move(250, 120, 700);
    await m2;
    s.mark(170, 80, '✕', 'x');
    await t2.fade(300);
    await m1; await m3;
    await s.say('t', '2번이 안 왔어요 (ACK 2)', 'bad', 1100);
    const ack = s.token('ACK 2', 300, 95, 'ack');
    await ack.move(55, 95, 700);
    ack.remove();
    const r2 = s.token('seq 2 (재전송)', 55, 95);
    await r2.move(250, 95, 800);
    s.caption('다시 받은 2번까지 모아 1 · 2 · 3 순서로 맞춘다');
    await Promise.all([t1.move(395, 55, 400), r2.move(395, 95, 400), t3.move(395, 135, 400)]);
    t1.remove(); t3.remove();
    r2.label('DATA → 포트 80');
    await s.wait(400);
    s.caption('포트 번호로 이 데이터를 받을 프로그램을 찾는다');
    await r2.move(495, 70, 800);
    await s.say('web', '80번, 내 거!', 'good', 1100);
    s.caption('전송 계층(TCP): 순서 번호로 신뢰성(재전송·정렬), 포트 번호로 프로그램을 구별한다');
  },
});

/** IP: 라우터가 목적지 IP를 보고 길을 고른다, TTL 감소 */
const ip = () => scene({
  actors: [{ id: 'a', x: 50, y: 95, icon: '💻', label: '1.1.1.1' }, { id: 'r1', x: 180, y: 95, icon: '🔀', label: '라우터1' }, { id: 'r2', x: 330, y: 45, icon: '🔀', label: '라우터2' }, { id: 'r3', x: 330, y: 145, icon: '🔀', label: '라우터3', kind: 'dim' }, { id: 'b', x: 495, y: 95, icon: '🖥️', label: '2.2.2.2' }],
  links: [['a', 'r1'], ['r1', 'r2'], ['r1', 'r3'], ['r2', 'b'], ['r3', 'b']],
  async play(s) {
    s.caption('IP 헤더에는 출발지·목적지 IP 주소와 TTL이 있다');
    const t = s.token('→ 2.2.2.2 · TTL 64', 50, 95);
    await t.move(180, 95, 800);
    t.label('→ 2.2.2.2 · TTL 63');
    await s.say('r1', '2.2.2.2는 위쪽 길로', '', 1000);
    await t.move(330, 45, 800);
    t.label('→ 2.2.2.2 · TTL 62');
    await s.say('r2', '목적지는 바로 옆', '', 900);
    await t.move(495, 95, 800);
    await s.say('b', '내 IP가 맞다', 'good', 1100);
    s.caption('라우터마다 목적지 IP를 보고 다음 길을 고른다(라우팅). TTL은 라우터를 지날 때마다 1씩 줄고 0이 되면 버려져 무한히 떠돌지 않는다');
  },
});

/** MAC·스위치: 목적지 MAC을 보고 그 포트로만 보낸다 */
const mac = () => scene({
  actors: [{ id: 'a', x: 60, y: 95, icon: '💻', label: 'PC A · AA' }, { id: 'sw', x: 250, y: 95, icon: '🔌', label: '스위치' }, { id: 'b', x: 470, y: 35, icon: '💻', label: 'PC B · BB' }, { id: 'c', x: 470, y: 95, icon: '💻', label: 'PC C · CC', kind: 'dim' }, { id: 'd', x: 470, y: 155, icon: '💻', label: 'PC D · DD', kind: 'dim' }],
  links: [['a', 'sw'], ['sw', 'b'], ['sw', 'c'], ['sw', 'd']],
  async play(s) {
    s.caption('MAC 헤더에는 "바로 다음 장비"의 물리 주소(MAC)가 적힌다');
    const t = s.token('목적 MAC: BB', 60, 95);
    await t.move(250, 95, 800);
    await s.say('sw', 'BB는 1번 포트에 있다', '', 1100);
    await t.move(380, 35, 800);
    s.flash('b');
    await s.say('b', '내 MAC 맞음', 'good', 900);
    s.caption('스위치는 MAC 주소표를 보고 목적지 포트로만 보낸다(C, D는 받지 않는다). MAC은 구간마다 바뀌고, IP는 끝까지 그대로다');
  },
});

/** 허브: 주소를 보지 않고 모두에게 보낸다 */
const hub = () => scene({
  actors: [{ id: 'a', x: 60, y: 95, icon: '💻', label: 'PC A' }, { id: 'h', x: 250, y: 95, icon: '🔁', label: '허브' }, { id: 'b', x: 470, y: 35, icon: '💻', label: 'PC B · BB' }, { id: 'c', x: 470, y: 95, icon: '💻', label: 'PC C' }, { id: 'd', x: 470, y: 155, icon: '💻', label: 'PC D' }],
  links: [['a', 'h'], ['h', 'b'], ['h', 'c'], ['h', 'd']],
  async play(s) {
    s.caption('허브는 주소를 보지 않는 1계층 장비');
    const t = s.token('BB에게', 60, 95);
    await t.move(250, 95, 800);
    t.remove();
    const xs = [35, 95, 155].map((y) => s.token('BB에게', 250, 95).move(385, y, 800));
    await Promise.all(xs);
    void s.say('c', '내 거 아님 → 버림', 'bad', 1300);
    void s.say('d', '내 거 아님 → 버림', 'bad', 1300);
    await s.say('b', '내 거', 'good', 1300);
    s.caption('받은 신호를 그대로 키워 모든 포트로 보낸다 → 쓸데없는 전송과 충돌이 많다. 그래서 스위치로 바뀌었다');
  },
});

/** 물리 계층: 비트가 전압 신호가 된다 */
const bits = () => scene({
  actors: [{ id: 'a', x: 55, y: 85, icon: '🔌', label: '랜카드 A' }, { id: 'b', x: 505, y: 85, icon: '🔌', label: '랜카드 B' }],
  async play(s: SceneApi) {
    s.caption('물리 계층: 1은 높은 전압, 0은 낮은 전압으로 바꿔 케이블에 흘려보낸다');
    const B = '10110010';
    const x0 = 110, step = 42, hi = 60, lo = 110;
    let d = `M${x0} ${B[0] === '1' ? hi : lo}`;
    [...B].forEach((b, i) => {
      const y = b === '1' ? hi : lo;
      d += ` V${y} H${x0 + (i + 1) * step}`;
    });
    const path = s.raw(svg('path', { d, class: 'scene-wave' }));
    const len = (path as SVGPathElement).getTotalLength();
    path.setAttribute('stroke-dasharray', `${len}`);
    path.setAttribute('stroke-dashoffset', `${len}`);
    for (let i = 0; i < B.length; i++) {
      s.mark(x0 + i * step + step / 2, 140, B[i]!, B[i] === '1' ? 'b1' : 'b0');
      path.setAttribute('stroke-dashoffset', String(len * (1 - (i + 1) / B.length)));
      await s.wait(260);
    }
    s.mark(x0 - 26, hi + 4, '높음', 'axis');
    s.mark(x0 - 26, lo + 4, '낮음', 'axis');
    await s.say('b', '전압을 읽어 10110010', 'good', 1300);
    s.caption('받는 쪽은 전압의 높낮이를 다시 0과 1로 읽는다. 광케이블은 빛의 켜짐·꺼짐, 무선은 전파를 쓴다');
  },
});

/** FCS: 오는 도중 비트가 깨지면 계산값이 달라 오류를 찾는다 */
const fcs = () => scene({
  actors: [{ id: 'a', x: 60, y: 95, icon: '💻', label: '보내는 쪽' }, { id: 'b', x: 500, y: 95, icon: '🖥️', label: '받는 쪽' }],
  links: [['a', 'b']],
  async play(s) {
    s.caption('보내는 쪽이 데이터로 계산한 검사값(CRC)을 FCS로 뒤에 붙인다');
    const t = s.token('1011 0110 | FCS 7A', 60, 95);
    await t.move(280, 95, 800);
    s.mark(280, 66, '⚡', 'bolt');
    t.label('1011 0100 | FCS 7A');
    t.cls('broken');
    s.caption('⚡ 오는 도중 잡음으로 비트 하나가 바뀌었다');
    await t.move(500, 95, 800);
    await s.say('b', '다시 계산하니 3C ≠ 7A → 오류!', 'bad', 1400);
    await t.fade(300);
    await s.say('b', '다시 보내 주세요', '', 900);
    const ok = s.token('1011 0110 | FCS 7A', 60, 95);
    await ok.move(500, 95, 1000);
    await s.say('b', '7A = 7A ✓ 정상', 'good', 1200);
    s.caption('FCS는 프레임 맨 뒤에 붙는 트레일러. 받는 쪽은 같은 계산을 해서 다르면 오류로 보고 버린다');
  },
});

void W;

/** 캡슐 조각·장비 → 장면 */
export const OSI_SCENES: Record<string, () => HTMLElement> = {
  data, ah, ph, enc: ph, sh, tcp, ip, mac, fcs, bits, hub, switch: mac, router: ip,
};
/** 계층 → 대표 장면 */
export const LAYER_SCENE: Record<number, string> = { 7: 'ah', 6: 'ph', 5: 'sh', 4: 'tcp', 3: 'ip', 2: 'mac', 1: 'bits' };

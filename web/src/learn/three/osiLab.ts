// OSI 7계층 3D: 보내는 쪽·받는 쪽 7층 탑. 캡슐(데이터 블록 줄)이 탑을 따라 내려가며 각 계층 판에서 헤더 블록이 날아와 붙고(캡슐화),
// 케이블로 비트가 흘러 허브·스위치·라우터를 지나, 받는 쪽 탑을 올라가며 헤더가 떨어진다(역캡슐화).
import { Vector3 } from 'three';
import { el } from '../../view/stage';
import { nameHits, sleep, type Viz } from '../core';
import { OSI } from '../custom/osi';
import { LAYER_SCENE, OSI_SCENES } from '../custom/osiScenes';
import { openModal } from '../modal';
import { hsl } from './adapt';
import { shapeOf } from './flow';
import type { SyncOpts, Want } from './keyed';
import { base } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

const SEG: Record<string, { label: string; w: number; layer: number; name: string; en: string; has: string; tail?: boolean }> = {
  data: { label: 'DATA', w: 40, layer: 7, name: '데이터', en: 'Data (Payload)', has: '실제로 보내려는 내용. 예: 웹 브라우저의 요청 "GET /index.html"' },
  enc: { label: '🔒DATA', w: 44, layer: 6, name: '암호화된 데이터', en: 'Encrypted Data', has: '표현 계층이 암호화·압축한 데이터. 중간에서 엿봐도 내용을 알 수 없다' },
  ah: { label: 'AH', w: 26, layer: 7, name: '응용 헤더', en: 'Application Header', has: '어떤 응용 서비스(HTTP, FTP …)의 어떤 요청인지 같은 응용 계층의 제어 정보' },
  ph: { label: 'PH', w: 26, layer: 6, name: '표현 헤더', en: 'Presentation Header', has: '데이터를 어떤 형식으로 바꿨는지: 문자 코드(UTF-8), 암호화 방식(TLS), 압축 방식' },
  sh: { label: 'SH', w: 26, layer: 5, name: '세션 헤더', en: 'Session Header', has: '세션(대화) 번호, 대화 방식(반이중·전이중), 동기점(체크포인트) 번호' },
  tcp: { label: 'TCP', w: 32, layer: 4, name: 'TCP 헤더 (전송 헤더)', en: 'Transport Header', has: '출발지·목적지 포트 번호(어느 프로그램인지), 순서 번호(seq), 확인 번호(ack), 창 크기' },
  ip: { label: 'IP', w: 26, layer: 3, name: 'IP 헤더 (네트워크 헤더)', en: 'Network Header', has: '출발지·목적지 IP 주소(어느 컴퓨터인지), TTL(거쳐 갈 수 있는 라우터 수)' },
  mac: { label: 'MAC', w: 34, layer: 2, name: 'MAC 헤더 (데이터 링크 헤더)', en: 'Data Link Header', has: '출발지·목적지 MAC 주소(바로 다음 장비의 랜카드 주소). 장비를 지날 때마다 바뀐다' },
  fcs: { label: 'FCS', w: 30, layer: 2, name: 'FCS 트레일러', en: 'Frame Check Sequence', has: '오류 검사용 CRC 값. 프레임 맨 뒤에 붙어서 헤더가 아니라 트레일러라 한다', tail: true },
};
const UP = ['sh', 'ph', 'ah', 'enc'];
const FRAME = ['mac', 'ip', 'tcp', ...UP, 'fcs'];
const TCPIP = [{ name: '응용', from: 7, to: 5 }, { name: '전송', from: 4, to: 4 }, { name: '인터넷', from: 3, to: 3 }, { name: '네트워크 액세스', from: 2, to: 1 }];
const DEVS = [{ key: 'hub', name: '허브', layer: 1, note: '허브(1계층): 받은 전기 신호를 그대로 키워 모든 포트로 내보낸다. 주소를 보지 않는다.' }, { key: 'switch', name: '스위치', layer: 2, note: '스위치(2계층): 프레임의 MAC 주소를 보고 목적지가 연결된 포트로만 보낸다.' }, { key: 'router', name: '라우터', layer: 3, note: '라우터(3계층): 패킷의 IP 주소를 보고 목적지 네트워크로 가는 다음 경로를 고른다.' }];
const BIT = '10110010011101';

const TX = -5.4, RXX = 5.4, LH = 0.72, SLW = 3.4, SLD = 2.0, CZ = 1.75, U = 0.034;
const ly = (n: number) => (n - 1) * LH;
const hue = (n: number) => 200 + (7 - n) * 22;

export function osiLab(): Viz {
  let focusFn: (names: string[]) => void = () => {};
  const inner = lab({ title: 'OSI 7계층과 캡슐화 3D', en: 'Open Systems Interconnection Reference Model', height: 520, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let segs: string[] = [];
    let side: 'L' | 'R' = 'L';
    let capN = 8;         // 캡슐이 있는 계층 (8 = 탑 위, 0 = 숨김)
    let active: { side: 'L' | 'R'; n: number } | null = null;
    let tcpip = false;
    let flags = false;
    let binary = false;
    let devOn = -1;
    let answers = new Set<number>();
    let step = -1;
    const towerX = (sd: 'L' | 'R') => (sd === 'L' ? TX : RXX);
    const segW = (key: string) => SEG[key]!.w * U;
    const capW = (keys: string[]) => keys.reduce((s, key) => s + segW(key) + 0.04, -0.04);
    const segPos = (keys: string[], i: number, sd: 'L' | 'R', n: number) => {
      const x0 = towerX(sd) - capW(keys) / 2;
      const x = x0 + keys.slice(0, i).reduce((s, key) => s + segW(key) + 0.04, 0) + segW(keys[i]!) / 2;
      return V(x, ly(n) + 0.08, CZ);
    };
    const layerInfo = (n: number): Info => {
      const L = OSI.find((x) => x.n === n)!;
      return { title: `${n}계층 ${L.ko} 계층`, sub: `${L.en} · 전송 단위 ${L.pdu}`, body: `${L.role}\n\n프로토콜: ${L.protos}\n\n장비: ${L.devices}` };
    };
    const segInfo = (key: string): Info => ({ title: `${SEG[key]!.label} — ${SEG[key]!.name}`, sub: SEG[key]!.en, body: SEG[key]!.has });
    const WIRE_Z = 3.6;
    const devX = (i: number) => TX + (RXX - TX) * (0.25 + i * 0.25);

    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      for (const sd of ['L', 'R'] as const) {
        for (const L of OSI) {
          const on = active?.side === sd && active.n === L.n;
          const ans = answers.has(L.n);
          out.push({ key: `s:${sd}:${L.n}`, kind: 'block', pos: V(towerX(sd), ly(L.n), 0), size: [SLW, LH - 0.08, SLD], color: hsl(hue(L.n), 0.55, on ? 0.48 : 0.6), text: `${L.n}  ${L.ko}`, textColor: '#ffffff', glow: on ? 0.3 : ans ? 0.2 : 0, info: layerInfo(L.n) });
          out.push({ key: `p:${sd}:${L.n}`, kind: 'sign', pos: V(towerX(sd) + (sd === 'L' ? -1 : 1) * (SLW / 2 + 1.45), ly(L.n) + 0.32, 0), runs: [{ text: `${L.n} ${L.ko}`, color: P.text, weight: 800, size: 40 }, { text: ` · ${L.pdu}`, color: P.muted, size: 34 }], height: 0.38, bg: hex(P.bg), info: layerInfo(L.n) });
          if (ans && sd === 'L') out.push({ key: `ans:${L.n}`, kind: 'sign', pos: V(towerX(sd) + SLW / 2 + 1.1, ly(L.n) + 0.32, 0), runs: [{ text: '◀ 정답', color: '#ffffff', weight: 800, size: 38 }], height: 0.38, bg: hex(P.accent) });
        }
        out.push({ key: `side:${sd}`, kind: 'sign', pos: V(towerX(sd), ly(7) + 0.95, -0.4), runs: [{ text: sd === 'L' ? '보내는 쪽 (PC A) ↓ 캡슐화' : '받는 쪽 (PC B) ↑ 역캡슐화', color: P.text, weight: 800, size: 40 }], height: 0.46, bg: hex(P.slab) });
      }
      // 케이블과 장비
      const a = V(TX, 0.05, WIRE_Z), z = V(RXX, 0.05, WIRE_Z);
      out.push({ key: 'wire', kind: 'obj', pos: a.clone().add(z).multiplyScalar(0.5), sig: 'w', make: () => w.bar(a, z, 0x64748b, 0.07, 0.9) });
      for (const sd of ['L', 'R'] as const) { const p = V(towerX(sd), 0.05, SLD / 2), q = V(towerX(sd), 0.05, WIRE_Z); out.push({ key: `drop:${sd}`, kind: 'obj', pos: p.clone().add(q).multiplyScalar(0.5), sig: 'd', make: () => w.bar(p, q, 0x64748b, 0.07, 0.9) }); }
      DEVS.forEach((d, i) => {
        out.push({ key: `dev:${d.key}`, kind: 'obj', pos: V(devX(i), 0, WIRE_Z), sig: `${devOn === i}`, make: () => shapeOf(w, d.key === 'router' ? 'router' : d.key === 'switch' ? 'switch' : 'hub', devOn === i ? P.warn : 0x475569), info: { title: `${d.name} (${d.layer}계층 장비)`, body: d.note } });
        out.push({ key: `devn:${d.key}`, kind: 'sign', pos: V(devX(i), 0.25, WIRE_Z + 0.95), runs: [{ text: `${d.name} L${d.layer}`, color: P.text, weight: 800, size: 36 }], height: 0.36, bg: hex(P.slab) });
      });
      // 캡슐
      if (capN >= 1 && capN <= 8 && segs.length) {
        const n = Math.min(7, capN);
        segs.forEach((key, i) => {
          const p = segPos(segs, i, side, n);
          if (capN === 8) p.y = ly(7) + 0.9;
          const txt = binary ? [...SEG[key]!.label].map((c) => (c.charCodeAt(0) % 2 ? '1' : '0')).join('') : SEG[key]!.label;
          out.push({ key: `c:${key}`, kind: 'block', pos: p, size: [segW(key), 0.42, 0.62], color: hsl(hue(SEG[key]!.layer), 0.7, 0.5), text: txt, textColor: '#ffffff', info: segInfo(key) });
        });
        if (flags && segs.includes('enc')) {
          const p = segPos(segs, segs.indexOf('enc'), side, n);
          for (const [j, dx] of [[1, -0.35], [2, 0.4]] as [number, number][]) out.push({ key: `flag:${j}`, kind: 'sign', pos: p.clone().add(V(dx, 0.75, 0)), runs: [{ text: `◆동기점 ${j}`, color: '#ffffff', weight: 800, size: 32 }], height: 0.3, bg: hex(P.warn) });
        }
      }
      if (tcpip) TCPIP.forEach((t, i) => {
        const y1 = ly(t.to), y2 = ly(t.from) + LH - 0.08;
        out.push({ key: `tc:${i}`, kind: 'block', pos: V(0, y1, -0.4), size: [2.6, y2 - y1, 0.12], color: hsl(30 + i * 50, 0.6, 0.55), opacity: 0.55, text: '', info: { title: `TCP/IP ${t.name} 계층`, body: `OSI ${t.from === t.to ? `${t.from}계층` : `${t.from}~${t.to}계층`}에 해당합니다.` } });
        out.push({ key: `tcl:${i}`, kind: 'sign', pos: V(0, (y1 + y2) / 2, -0.2), runs: [{ text: `TCP/IP ${t.name}`, color: '#ffffff', weight: 800, size: 36 }], height: 0.36, bg: hex(hsl(30 + i * 50, 0.6, 0.4)) });
      });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    let speed = 1;
    const ms = (x: number) => x * speed;

    // 범례: 지금 캡슐 조각을 HTML 칩으로 풀어 쓰고, 누르면 3D 장면 팝업
    function legend() {
      const chips: Node[] = [];
      const scBtn = el('button', 'lab-btn', '🎬 이 단계 예시 장면');
      scBtn.addEventListener('click', () => sceneOf(step));
      if (step >= 0) chips.push(scBtn);
      if (segs.length) chips.push(el('span', 'lab-chip muted', '지금 캡슐(앞 → 뒤):'));
      for (const key of segs) {
        const c = el('button', 'lab-chip');
        c.textContent = `${SEG[key]!.label} ${SEG[key]!.name}`;
        c.style.background = hex(hsl(hue(SEG[key]!.layer), 0.7, 0.5));
        c.style.color = '#fff';
        c.style.border = '0';
        c.style.cursor = 'pointer';
        c.addEventListener('click', () => showSeg(key));
        chips.push(c);
      }
      l.status(...chips);
    }
    function showSeg(key: string) {
      const sg = SEG[key]!;
      const L = OSI.find((x) => x.n === sg.layer)!;
      const who = key === 'data' ? '보내는 쪽 응용 프로그램이 만들고, 받는 쪽 응용 프로그램이 받는다.'
        : key === 'enc' ? '보내는 쪽 6계층(표현)이 암호화하고, 받는 쪽 6계층이 복호화한다.'
          : `보내는 쪽 ${L.n}계층(${L.ko})이 ${sg.tail ? '뒤에' : '앞에'} 붙이고, 받는 쪽 ${L.n}계층이 확인한 뒤 떼어 낸다.`;
      openModal(`${sg.label} — ${sg.name}`, [OSI_SCENES[key]!(), sg.has, el('p', 'muted small', who)], sg.en);
    }
    function sceneOf(k2: number) {
      const st = STEPS[k2];
      if (!st) return;
      const key = st.n ? LAYER_SCENE[st.n]! : 'hub';
      openModal(st.t, [OSI_SCENES[key]!(), st.b], st.n ? `${st.n}계층` : undefined);
    }
    w.onPick = (inf, o) => {
      const segKey = Object.keys(SEG).find((key) => k.get(`c:${key}`) === o);
      if (segKey) { showSeg(segKey); return; }
      const dev = DEVS.find((d) => k.get(`dev:${d.key}`) === o);
      if (dev) { openModal(`${dev.name} (${dev.layer}계층 장비)`, [OSI_SCENES[dev.key]!(), dev.note]); return; }
      for (const sd of ['L', 'R'] as const) for (const L of OSI) if (k.get(`s:${sd}:${L.n}`) === o) { void goLayer(sd, L.n); return; }
      openModal(inf.title, inf.body.split('\n\n'), inf.sub);
    };

    /** 헤더 블록이 계층 판에서 날아와 캡슐에 붙는다 */
    const down = (n: number, keys: string[], add: string[]) => async () => {
      side = 'L'; active = { side: 'L', n }; binary = false; devOn = -1;
      capN = n;
      const slab = V(TX, ly(n) + 0.3, 0);
      segs = keys;
      await draw({ ms: ms(550), arc: 0.6, spawn: (key) => (add.some((a) => key === `c:${a}`) ? slab : undefined) });
    };
    const up = (n: number, keys: string[]) => async () => {
      side = 'R'; active = { side: 'R', n }; binary = false; devOn = -1;
      capN = n;
      const gone = segs.filter((x) => !keys.includes(x));
      // 떨어지는 헤더는 계층 판으로 날아가 사라진다
      await Promise.all(gone.map((g) => { const o = k.get(`c:${g}`); return o ? w.move(o, V(RXX, ly(n) + 0.3, 0), ms(500), 0.6) : null; }));
      segs = keys;
      await draw({ ms: ms(450), exit: 'shrink' });
    };
    async function wireRun() {
      active = null; capN = 0; flags = false;
      await draw({ ms: ms(300) });
      const pts = [V(TX, 0.4, SLD / 2), V(TX, 0.4, WIRE_Z), V(RXX, 0.4, WIRE_Z), V(RXX, 0.4, SLD / 2)];
      const cubes = [...BIT].map((bit) => {
        const s = w.sign([{ text: bit, color: '#ffffff', weight: 800 }], 0.4, hex(bit === '1' ? w.pal.warn : w.pal.accent));
        s.position.copy(pts[0]!);
        root.add(s);
        b.temp.add(s);
        return s;
      });
      const path = (t: number) => {
        const lens = [pts[1]!.distanceTo(pts[0]!), pts[2]!.distanceTo(pts[1]!), pts[3]!.distanceTo(pts[2]!)];
        let d = t * lens.reduce((a, x) => a + x, 0);
        for (let i = 0; i < 3; i++) { if (d <= lens[i]!) return pts[i]!.clone().lerp(pts[i + 1]!, d / lens[i]!); d -= lens[i]!; }
        return pts[3]!.clone();
      };
      const total = ms(3200);
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const tick = () => {
          const t = Math.min(1, (performance.now() - t0) / total);
          cubes.forEach((c, i) => c.position.copy(path(Math.max(0, Math.min(1, t * 1.35 - i * 0.025)))));
          const headX = path(Math.min(1, t * 1.35)).x;
          const on = DEVS.findIndex((_d, i) => Math.abs(headX - devX(i)) < 0.9);
          if (on !== devOn) { devOn = on; void draw({ ms: 0 }); }
          if (t < 1) requestAnimationFrame(tick); else res();
        };
        tick();
      });
      for (const c of cubes) { b.temp.delete(c); w.remove(c); }
      devOn = -1;
      await draw({ ms: 0 });
    }

    const STEPS: { side: 'L' | 'R' | null; n: number; t: string; b: string; run: () => Promise<void> }[] = [
      { side: 'L', n: 7, t: '7 응용 계층 — 데이터와 응용 헤더(AH)', b: '웹 브라우저가 "GET /index.html" 요청 데이터를 만들고, 응용 계층 헤더(AH)를 붙인다. OSI 참조 모델에서는 7계층부터 2계층까지 각 계층이 자기 헤더를 하나씩 붙인다.', run: down(7, ['ah', 'data'], ['ah', 'data']) },
      { side: 'L', n: 6, t: '6 표현 계층 — 암호화·압축 + 표현 헤더(PH)', b: '데이터를 보내기 좋은 형식으로 바꾼다(🔒 암호화, 압축, 코드 변환). 어떤 형식으로 바꿨는지 알리는 표현 헤더(PH)를 붙인다.', run: down(6, ['ph', 'ah', 'enc'], ['ph', 'enc']) },
      { side: 'L', n: 5, t: '5 세션 계층 — 세션 헤더(SH)와 동기점', b: '세션 헤더(SH)를 붙인다. 대화 방식(반이중·전이중)과 동기점(체크포인트)을 정해, 큰 데이터를 보내다 끊기면 마지막 동기점부터 다시 보낼 수 있게 한다.', run: async () => { await down(5, ['sh', 'ph', 'ah', 'enc'], ['sh'])(); flags = true; await draw({ ms: ms(400) }); } },
      { side: 'L', n: 4, t: '4 전송 계층 — TCP 헤더가 붙는다', b: '전송 계층에서 TCP 헤더(포트 번호·순서 번호)가 날아와 앞에 붙는다. 이제 이름은 "세그먼트".', run: async () => { flags = false; await down(4, ['tcp', ...UP], ['tcp'])(); } },
      { side: 'L', n: 3, t: '3 네트워크 계층 — IP 헤더가 붙는다', b: '출발지·목적지 IP 주소를 담은 IP 헤더가 붙는다. 이름은 "패킷". 라우터는 이 IP를 보고 길을 정한다.', run: down(3, ['ip', 'tcp', ...UP], ['ip']) },
      { side: 'L', n: 2, t: '2 데이터 링크 계층 — MAC 헤더와 FCS', b: '다음 장비의 MAC 주소를 담은 헤더가 앞에, 오류 검사용 FCS(CRC)가 뒤에 붙는다(뒤에 붙는 것은 트레일러). 이름은 "프레임".', run: down(2, FRAME, ['mac', 'fcs']) },
      { side: 'L', n: 1, t: '1 물리 계층 — 비트로 바꾸기', b: '프레임 전체가 0과 1의 비트가 된다. 물리 계층은 헤더를 붙이지 않고, 랜카드가 비트를 전압의 높낮이(전기 신호)로 만들어 케이블에 흘려보낸다.', run: async () => { await down(1, FRAME, [])(); binary = true; await draw({ ms: ms(300) }); } },
      { side: null, n: 0, t: '전송 매체 — 전기 신호가 흐른다', b: '신호가 허브(1계층: 그대로 증폭), 스위치(2계층: MAC을 보고 포트 선택), 라우터(3계층: IP를 보고 경로 선택)를 지나 목적지로 간다.', run: wireRun },
      { side: 'R', n: 1, t: '1 물리 계층 — 신호를 비트로', b: '받는 쪽 랜카드가 전기 신호를 다시 비트로 읽고, 프레임으로 모은다.', run: async () => { side = 'R'; segs = FRAME; capN = 1; active = { side: 'R', n: 1 }; binary = true; await draw({ ms: ms(450), spawn: (key, to) => (key.startsWith('c:') ? to.clone().setY(0) : undefined) }); binary = false; await draw({ ms: ms(300) }); } },
      { side: 'R', n: 2, t: '2 데이터 링크 계층 — MAC 헤더와 FCS를 뗀다 (역캡슐화)', b: '목적지 MAC이 내 것인지 확인하고, FCS로 오류를 검사한 뒤 MAC 헤더와 FCS를 떼어 낸다. 남은 것은 패킷.', run: up(2, ['ip', 'tcp', ...UP]) },
      { side: 'R', n: 3, t: '3 네트워크 계층 — IP 헤더를 뗀다', b: '목적지 IP가 내 주소인지 확인하고 IP 헤더를 떼어 낸다. 남은 것은 세그먼트.', run: up(3, ['tcp', ...UP]) },
      { side: 'R', n: 4, t: '4 전송 계층 — 포트로 프로그램 찾기', b: 'TCP 헤더의 포트 번호로 어느 프로그램(웹 서버 80/443)에 줄지 정하고, 순서를 맞춘 뒤 헤더를 뗀다.', run: up(4, UP) },
      { side: 'R', n: 5, t: '5 세션 계층 — 세션 헤더(SH)를 뗀다', b: 'SH를 보고 어느 세션(대화)의 데이터인지, 어느 동기점까지 받았는지 확인한 뒤 떼어 낸다.', run: up(5, ['ph', 'ah', 'enc']) },
      { side: 'R', n: 6, t: '6 표현 계층 — PH를 떼고 복호화', b: 'PH에 적힌 형식대로 암호와 압축을 풀어, 응용 프로그램이 읽을 수 있는 데이터로 되돌린다.', run: up(6, ['ah', 'data']) },
      { side: 'R', n: 7, t: '7 응용 계층 — AH를 떼고 데이터 도착', b: '웹 서버가 "GET /index.html" 요청을 받는다. 내려갈 때 붙인 헤더를 올라오며 차례로 뗀 것이 역캡슐화다.', run: up(7, ['data']) },
    ];

    async function runTo(target: number) {
      if (target <= step) await reset();
      speed = target - step > 3 ? 0.5 : 1;
      for (let i = step + 1; i <= target; i++) {
        const st = STEPS[i]!;
        l.code(st.t);
        l.say(st.b, 'info');
        await st.run();
        step = i;
        legend();
        if (i < target) await sleep(ms(500));
      }
      speed = 1;
    }
    async function goLayer(sd: 'L' | 'R', n: number) { await runTo(STEPS.findIndex((st) => st.side === sd && st.n === n)); }
    async function reset() {
      for (const o of b.temp) w.remove(o);
      b.temp.clear();
      segs = []; side = 'L'; capN = 8; active = null; flags = false; binary = false; devOn = -1; step = -1;
      await draw({ exit: 'shrink', ms: 400 });
      w.fit(TX - SLW / 2 - 2.8, RXX + SLW / 2 + 2.8, -7.4, WIRE_Z + 1.2, 800, 0.42);
      legend();
      l.code('');
    }
    focusFn = (names) => {
      answers = new Set(OSI.filter((L) => nameHits([`${L.ko} 계층`, L.ko, L.en, `${L.en} Layer`], names)).map((L) => L.n));
      void draw({ ms: 300 });
    };
    void reset();
    return {
      hint: '계층 블록이나 단추를 누르면 데이터가 그 계층까지 진행합니다. 캡슐 조각(DATA, AH …)과 장비를 누르면 3D 예시 장면이 열립니다. 외우기: 아래부터 "물·데·네·전·세·표·응"',
      reset,
      groups: [
        { name: '진행', en: 'Play', hue: 210, cmds: [
          { name: '▶ 처음부터 끝까지', run: async () => { await reset(); await runTo(STEPS.length - 1); } },
          { name: '다음 단계 ▶', run: () => (step >= STEPS.length - 1 ? reset() : runTo(step + 1)) },
          { name: 'TCP/IP 4계층과 비교', run: async () => { tcpip = !tcpip; await draw({ ms: 450 }); l.say(tcpip ? 'OSI의 응용·표현·세션(7~5)은 TCP/IP의 응용 계층 하나로, 데이터 링크·물리(2~1)는 네트워크 액세스 계층 하나로 묶인다. 전송(4)·네트워크(3)는 TCP/IP의 전송·인터넷 계층.' : 'TCP/IP 비교를 숨겼습니다.', 'info'); } },
        ] },
        { name: '보내는 쪽', en: '↓ 캡슐화', hue: 200, cmds: [7, 6, 5, 4, 3, 2, 1].map((n): Cmd => ({ name: `${n} ${OSI.find((x) => x.n === n)!.ko}`, run: () => goLayer('L', n) })) },
        { name: '받는 쪽', en: '↑ 역캡슐화', hue: 150, cmds: [1, 2, 3, 4, 5, 6, 7].map((n): Cmd => ({ name: `${n} ${OSI.find((x) => x.n === n)!.ko}`, run: () => goLayer('R', n) })) },
      ],
    };
  } });
  return { el: inner.el, dispose: () => inner.dispose(), focus: (names) => { inner.focus?.(names); focusFn(names); } };
}

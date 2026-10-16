// 개발·테스트 3D 실습: 커버리지(제어 흐름 그래프 위를 테스트 케이스가 지나감), V-모델, 통합 테스트(스텁·드라이버).
import { Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import { flowLab, packet, shapeOf, type FStep } from './flow';
import type { SyncOpts, Want } from './keyed';
import { base } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

// ───────────────────────── 커버리지 ─────────────────────────

type TC = readonly [boolean, boolean];
const CASES: TC[] = [[true, true], [true, false], [false, true], [false, false]];
const KINDS: { name: string; en: string; test: (s: TC[]) => boolean; why: string }[] = [
  { name: '구문', en: 'Statement', test: (s) => s.some(([a, b]) => a && b), why: '모든 문장(X 포함)이 한 번은 실행되어야 한다 → 결정이 참인 케이스 하나면 된다.' },
  { name: '결정', en: 'Decision', test: (s) => s.some(([a, b]) => a && b) && s.some(([a, b]) => !(a && b)), why: '결정 전체(A && B)가 참·거짓을 한 번씩 가져야 한다(분기 커버리지).' },
  { name: '조건', en: 'Condition', test: (s) => s.some(([a]) => a) && s.some(([a]) => !a) && s.some(([, b]) => b) && s.some(([, b]) => !b), why: 'A와 B가 각각 참·거짓을 한 번씩 가져야 한다. 결정 결과는 따지지 않는다 → 결정 커버리지를 보장하지 않는다.' },
  { name: '조건/결정', en: 'Condition/Decision', test: (s) => KINDS[1]!.test(s) && KINDS[2]!.test(s), why: '결정 커버리지와 조건 커버리지를 함께 만족한다.' },
  { name: 'MC/DC', en: 'Modified C/D', test: (s) => { const has = (a: boolean, b: boolean) => s.some(([x, y]) => x === a && y === b); return has(true, true) && has(false, true) && has(true, false); }, why: '각 조건이 "혼자서" 결정 결과를 바꾸는 것을 보여야 한다. (참,참)과 (거짓,참)으로 A, (참,참)과 (참,거짓)으로 B.' },
  { name: '다중 조건', en: 'Multiple Condition', test: (s) => s.length === 4, why: '조건들의 모든 조합(2² = 4가지)을 시험한다. 가장 강하다.' },
];
const CFG: Record<string, [string, number, number, string]> = {
  s: ['시작', -7.2, 0, ''], A: ['A: a > 0', -4.2, 0, '조건 A'], B: ['B: b > 0', -1.0, -1.6, '조건 B'], X: ['X()', 2.3, -1.6, '결정이 참일 때만 실행'], Y: ['Y()', 4.6, 0.6, '항상 실행'], e: ['끝', 7.2, 0.6, ''],
};
const EDGES: [string, string, string][] = [['s', 'A', ''], ['A', 'B', 'A 참'], ['A', 'Y', 'A 거짓'], ['B', 'X', 'B 참'], ['B', 'Y', 'B 거짓'], ['X', 'Y', ''], ['Y', 'e', '']];

export function coverageLab(): Viz {
  return lab({ title: '커버리지 실험판 3D', en: 'if (a > 0 && b > 0) X(); Y();', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let on = [false, false, false, false];
    let seenN = new Set<string>(), seenE = new Set<string>();
    const pathOf = ([a, bb]: TC) => (a ? (bb ? ['s', 'A', 'B', 'X', 'Y', 'e'] : ['s', 'A', 'B', 'Y', 'e']) : ['s', 'A', 'Y', 'e']);
    const nodeInfo = (id: string): Info => ({ title: CFG[id]![0], sub: CFG[id]![3], body: '제어 흐름 그래프의 노드입니다. 테스트 케이스가 지나간 노드·간선은 초록색이 됩니다.' });
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      for (const [id, [name, x, z]] of Object.entries(CFG)) {
        const dec = id === 'A' || id === 'B';
        out.push({ key: `n:${id}`, kind: 'block', pos: V(x, 0, z), size: [dec ? 2.3 : 1.7, dec ? 0.6 : 0.45, 1.0], color: seenN.has(id) ? P.good : dec ? 0xa855f7 : 0x64748b, text: name, textColor: '#ffffff', info: nodeInfo(id) });
      }
      for (const [a, z, lab_] of EDGES) {
        const A = CFG[a]!, Z = CFG[z]!;
        const p = V(A[1], 0.25, A[2]), q = V(Z[1], 0.25, Z[2]);
        const d = q.clone().sub(p).normalize();
        const p0 = p.clone().add(d.clone().multiplyScalar(1.1)), p1 = q.clone().sub(d.clone().multiplyScalar(1.0));
        const c = seenE.has(`${a}${z}`) ? P.good : 0x94a3b8;
        out.push({ key: `e:${a}${z}`, kind: 'obj', pos: p0.clone().add(p1).multiplyScalar(0.5), sig: `${c}`, make: () => w.bar(p0, p1, c, 0.05, 0.9) });
        if (lab_) out.push({ key: `el:${a}${z}`, kind: 'sign', pos: p0.clone().add(p1).multiplyScalar(0.5).setY(0.45), runs: [{ text: lab_, color: P.text, weight: 700, size: 34 }], height: 0.32, bg: hex(P.bg) });
      }
      const sel = CASES.filter((_c, i) => on[i]);
      KINDS.forEach((K, i) => {
        const ok = K.test(sel);
        out.push({ key: `lamp:${i}`, kind: 'block', pos: V(-6.2 + i * 2.5, 0, 3.6), size: [2.3, ok ? 0.5 : 0.18, 0.8], color: ok ? P.good : 0x94a3b8, text: `${ok ? '●' : '○'} ${K.name}`, textColor: '#ffffff', glow: ok ? 0.25 : 0, info: { title: `${K.name} 커버리지`, sub: `${K.en}${ok ? ' · 지금 만족' : ' · 아직 부족'}`, body: K.why } });
      });
      CASES.forEach(([a, bb], i) => out.push({ key: `tc:${i}`, kind: 'sign', pos: V(-6.6 + i * 2.2, 0.3, -3.8), runs: [{ text: `TC${i + 1} `, color: on[i] ? '#ffffff' : P.text, weight: 800, size: 36 }, { text: `A${a ? '참' : '거짓'} B${bb ? '참' : '거짓'}`, color: on[i] ? '#ffffffcc' : P.muted, size: 32 }], height: 0.36, bg: hex(on[i] ? P.accent : P.slab) }));
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const recompute = () => {
      seenN = new Set(); seenE = new Set();
      CASES.forEach((c, i) => { if (!on[i]) return; const p = pathOf(c); p.forEach((id, j) => { seenN.add(id); if (j) seenE.add(`${p[j - 1]}${id}`); }); });
    };
    async function toggle(i: number) {
      on[i] = !on[i];
      const c = CASES[i]!;
      l.code(`TC${i + 1}: a = ${c[0] ? 1 : -1}, b = ${c[1] ? 1 : -1}   (A ${c[0] ? '참' : '거짓'}, B ${c[1] ? '참' : '거짓'})`);
      if (on[i]) {
        // 테스트 케이스가 흐름을 따라 지나간다
        const p = pathOf(c);
        const pk = packet(w, `TC${i + 1}`, w.pal.warn);
        pk.position.copy(V(CFG.s![1], 1, CFG.s![2]));
        root.add(pk);
        b.temp.add(pk);
        await w.pop(pk, 200);
        for (let j = 1; j < p.length; j++) {
          await w.move(pk, V(CFG[p[j]!]![1], 1, CFG[p[j]!]![2]), 520, 0.4);
          seenN.add(p[j]!); seenE.add(`${p[j - 1]}${p[j]}`);
          if (j === 1) seenN.add('s');
          await draw({ ms: 200 });
        }
        b.temp.delete(pk);
        void w.vanish(pk, 'shrink', 250);
        if (!c[0]) l.say('A가 거짓이면 && 뒤의 B는 계산하지 않고(단축 평가) 바로 Y로 갑니다. 그래도 조건 커버리지는 각 조건의 참·거짓 값을 따집니다.', 'info');
      }
      recompute();
      await draw({ ms: 400 });
      const sel = CASES.filter((_c, j) => on[j]);
      const got = KINDS.filter((K) => K.test(sel)).map((K) => K.name);
      l.say(`켜진 케이스 ${sel.length}개 → 만족: ${got.length ? got.join(', ') : '없음'}. 강도: 구문 < 결정 < 조건/결정 < MC/DC < 다중 조건`, got.length ? 'ok' : 'info');
    }
    async function preset(name: string, idx: number[]) {
      on = [false, false, false, false];
      recompute();
      await draw({ ms: 300 });
      for (const i of idx) await toggle(i);
      l.say(`${name}: ${idx.map((i) => `TC${i + 1}`).join(', ')}. ${KINDS.find((K) => K.name === name)?.why ?? ''}`, 'ok');
    }
    async function reset() { on = [false, false, false, false]; recompute(); await draw({ exit: 'shrink' }); l.code('if (a > 0 && b > 0)   // 조건 A, 조건 B\n    X();\nY();'); w.fit(-8.4, 8.4, -4.6, 4.4); }
    void reset();
    return {
      hint: '테스트 케이스를 켜면 흐름을 따라 지나가며 노드·간선이 초록으로 칠해지고, 앞쪽 램프가 만족한 커버리지를 보여 줍니다.',
      reset,
      groups: [
        { name: '테스트 케이스', en: '켜고 끄기', hue: 210, cmds: CASES.map(([a, bb], i): Cmd => ({ name: `TC${i + 1} (${a ? 'T' : 'F'},${bb ? 'T' : 'F'})`, run: () => toggle(i) })) },
        { name: '최소 조합', en: 'Minimum set', hue: 140, cmds: [
          { name: '구문', run: () => preset('구문', [0]) },
          { name: '결정', run: () => preset('결정', [0, 3]) },
          { name: '조건', run: () => preset('조건', [1, 2]) },
          { name: 'MC/DC', run: () => preset('MC/DC', [0, 1, 2]) },
        ] },
      ],
    };
  } });
}

// ───────────────────────── V-모델 ─────────────────────────

const VL: [string, string, string][] = [['req', '요구사항 분석', '사용자가 원하는 것을 정리'], ['sys', '시스템 설계', '시스템 전체 구조'], ['det', '상세 설계', '모듈 사이 인터페이스'], ['code', '코딩', '모듈 구현']];
const VR: [string, string, string][] = [['acc', '인수 테스트', '사용자의 요구를 만족하는지 사용자가 확인 (알파·베타)'], ['st', '시스템 테스트', '완성된 시스템 전체의 기능·성능을 실제와 비슷한 환경에서'], ['it', '통합 테스트', '모듈을 합치며 인터페이스 오류를 찾는다'], ['ut', '단위 테스트', '모듈 하나하나가 명세대로 동작하는지']];
export const vModelLab = flowLab({
  title: 'V-모델 3D', en: '개발 단계 ↔ 테스트 단계', height: 460,
  hint: '"V 따라가기"를 누르면 왼쪽으로 내려가며 개발하고 오른쪽으로 올라가며 짝이 되는 단계를 검증합니다.',
  nodes: [
    ...VL.map(([id, name, sub], i) => ({ id, name, sub, at: [-6.6 + i * 1.6, -2.6 + i * 1.6] as [number, number], shape: 'doc' as const, color: 0x2563eb, info: { title: name, sub: '개발', body: sub } })),
    ...VR.map(([id, name, sub], i) => ({ id, name, sub: undefined, at: [6.6 - i * 1.6, -2.6 + i * 1.6] as [number, number], shape: 'box' as const, color: 0x16a34a, info: { title: name, sub: '테스트', body: sub } })),
  ],
  links: [['req', 'sys'], ['sys', 'det'], ['det', 'code'], ['code', 'ut'], ['ut', 'it'], ['it', 'st'], ['st', 'acc'], ...VL.map(([id], i) => [id, VR[i]![0], 'ghost'] as [string, string, 'ghost'])],
  groups: [{ name: '보기', hue: 200, items: [
    { name: 'V 따라가기', steps: [
      { travel: { path: ['req', 'sys', 'det', 'code', 'ut', 'it', 'st', 'acc'], label: '', color: 'key', notes: [
        '요구사항 분석 → 시스템 설계: 무엇을 만들지 정하고 전체 구조를 잡는다',
        '상세 설계: 모듈과 인터페이스를 정한다',
        '코딩: 모듈을 구현한다 (V의 바닥)',
        '단위 테스트: 각 모듈을 상세 설계·코드 기준으로 검사 ↔ 짝: 코딩',
        '통합 테스트: 모듈 사이 인터페이스 ↔ 짝: 상세 설계',
        '시스템 테스트: 시스템 전체 ↔ 짝: 시스템 설계',
        '인수 테스트: 사용자가 요구사항대로인지 확인 ↔ 짝: 요구사항 분석',
      ] }, wait: 600 },
      { say: 'V-모델은 폭포수 모델에 테스트 단계를 짝지어 강조한 모델입니다. 왼쪽 각 단계의 산출물이 오른쪽 짝 테스트의 기준이 됩니다(검증 Verification · 확인 Validation).', tone: 'ok' },
    ] },
    { name: '짝 보기', steps: VL.map(([id, name], i): FStep => ({ send: { from: id, to: VR[i]![0], label: '기준 제공', color: 'ghost' }, say: `${name} ↔ ${VR[i]![1]}: ${VR[i]![2]}`, wait: 900 })) },
  ] }],
});

// ───────────────────────── 통합 테스트 ─────────────────────────

const MODS: [string, number, number][] = [['M', 0, -2.6], ['A', -3.4, 0], ['B', 3.4, 0], ['A1', -5, 2.6], ['A2', -1.8, 2.6], ['B1', 3.4, 2.6]];
type Role = 'real' | 'stub' | 'driver' | 'none';
const roleSet = (r: Partial<Record<string, Role>>): FStep['set'] => Object.fromEntries(MODS.map(([id]) => {
  const x = r[id] ?? 'none';
  return [id, { color: x === 'real' ? 0x2563eb : x === 'stub' ? 0xf59e0b : x === 'driver' ? 0xa855f7 : 0xcbd5e1, sub: { real: '실제 모듈', stub: '스텁 (가짜 하위)', driver: '드라이버 (가짜 상위)', none: '아직 없음' }[x], shape: x === 'stub' || x === 'driver' ? 'chip' : 'box' }];
}));
export const integrationLab = flowLab({
  title: '통합 테스트 3D', en: 'Top-down · Stub / Bottom-up · Driver', height: 470,
  hint: '방식을 고르면 어떤 모듈이 진짜(파랑)이고 어떤 자리를 스텁(주황)·드라이버(보라)가 대신하는지 단계별로 보여 줍니다.',
  nodes: MODS.map(([id, x, z]) => ({ id, name: id, sub: '아직 없음', at: [x, z] as [number, number], color: 0xcbd5e1, info: { title: `모듈 ${id}`, body: 'M이 A·B를, A가 A1·A2를, B가 B1을 호출하는 구조입니다.\n\n스텁: 아직 없는 하위 모듈 대신 정해진 값만 돌려주는 가짜 모듈(하향식).\n드라이버: 아직 없는 상위 모듈 대신 시험할 모듈을 불러 주는 가짜 모듈(상향식).' } })),
  links: [['M', 'A'], ['M', 'B'], ['A', 'A1'], ['A', 'A2'], ['B', 'B1']],
  groups: [{ name: '방식', hue: 210, items: [
    { name: '하향식 (스텁)', steps: [
      { set: roleSet({ M: 'real', A: 'stub', B: 'stub' }), say: '맨 위 M부터 시험합니다. 아직 없는 A, B 자리에 정해진 값만 돌려주는 스텁을 둡니다.', code: '하향식 1단계: M + 스텁 A, B' },
      { send: [{ from: 'M', to: 'A', label: '호출' }, { from: 'M', to: 'B', label: '호출' }], wait: 200 },
      { send: [{ from: 'A', to: 'M', label: '고정값', color: 'warn' }, { from: 'B', to: 'M', label: '고정값', color: 'warn' }], say: '스텁은 실제 계산 없이 정해 둔 값만 돌려줍니다.' },
      { set: roleSet({ M: 'real', A: 'real', B: 'stub', A1: 'stub', A2: 'stub' }), say: 'A를 진짜로 바꾸고, A가 부르는 A1, A2는 다시 스텁으로 둡니다(깊이 우선).', code: '하향식 2단계: A 통합' },
      { send: [{ from: 'A', to: 'A1', label: '호출' }, { from: 'A', to: 'A2', label: '호출' }] },
      { set: roleSet({ M: 'real', A: 'real', B: 'stub', A1: 'real', A2: 'real' }), say: 'A1, A2를 실제로 바꾸며 인터페이스를 검사합니다.', code: '하향식 3단계: A1, A2 통합' },
      { set: roleSet({ M: 'real', A: 'real', B: 'real', A1: 'real', A2: 'real', B1: 'real' }), say: '스텁이 모두 실제 모듈로 바뀌면 끝. 장점: 주요 제어 흐름을 일찍 확인. 단점: 스텁을 많이 만들어야 함.', tone: 'ok', code: '하향식 완료' },
    ] },
    { name: '상향식 (드라이버)', steps: [
      { set: roleSet({ A1: 'real', A2: 'real', B1: 'real', A: 'driver', B: 'driver' }), say: '가장 아래 모듈(A1, A2, B1)부터 시험합니다. 이들을 불러 줄 상위 자리에 드라이버를 둡니다. 묶음을 클러스터라 합니다.', code: '상향식 1단계: 클러스터 + 드라이버' },
      { send: [{ from: 'A', to: 'A1', label: '시험 호출', color: 0xa855f7 }, { from: 'A', to: 'A2', label: '시험 호출', color: 0xa855f7 }, { from: 'B', to: 'B1', label: '시험 호출', color: 0xa855f7 }] },
      { send: [{ from: 'A1', to: 'A', label: '결과' }, { from: 'A2', to: 'A', label: '결과' }, { from: 'B1', to: 'B', label: '결과' }], say: '드라이버가 테스트 데이터를 넣고 결과를 받아 확인합니다.' },
      { set: roleSet({ A1: 'real', A2: 'real', B1: 'real', A: 'real', B: 'real', M: 'driver' }), say: '드라이버를 실제 A, B로 바꾸고, 그 위 M 자리에는 다시 드라이버를 둡니다.', code: '상향식 2단계' },
      { set: roleSet({ A1: 'real', A2: 'real', B1: 'real', A: 'real', B: 'real', M: 'real' }), say: '마지막으로 M을 결합하면 끝. 장점: 아래쪽 핵심 기능을 철저히, 스텁이 필요 없다. 단점: 전체 흐름은 늦게 확인.', tone: 'ok', code: '상향식 완료' },
    ] },
  ] }],
});

// ───────────────────────── 클라우드 ─────────────────────────

const LAYERS = ['응용 프로그램', '데이터', '런타임', '미들웨어', '운영체제', '가상화', '서버', '저장소', '네트워크'];
const MODELS = [
  { name: '온프레미스', en: 'On-Premises', user: 9, desc: '자체 전산실: 하드웨어부터 응용 프로그램까지 모두 직접 관리합니다.' },
  { name: 'IaaS', en: 'Infrastructure as a Service', user: 5, desc: '서버·저장소·네트워크(+가상화)를 빌립니다. 운영체제부터는 사용자가 설치·관리. 예: AWS EC2' },
  { name: 'PaaS', en: 'Platform as a Service', user: 2, desc: '운영체제·런타임·미들웨어까지 제공. 사용자는 응용 프로그램과 데이터만. 예: Google App Engine' },
  { name: 'SaaS', en: 'Software as a Service', user: 0, desc: '완성된 소프트웨어를 인터넷으로 씁니다. 사용자가 관리할 것이 없습니다. 예: Gmail, Microsoft 365' },
];

export function cloudLab(): Viz {
  return lab({ title: '클라우드 서비스 모델 3D', en: 'On-Premises · IaaS · PaaS · SaaS', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    let shownUser = MODELS.map(() => 9);
    let cur = -1;
    const CX = (m: number) => -5.4 + m * 3.6;
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      MODELS.forEach((m, mi) => {
        LAYERS.forEach((ly, i) => {
          const user = i < shownUser[mi]!;
          out.push({ key: `c:${mi}:${i}`, kind: 'block', pos: V(CX(mi), (LAYERS.length - 1 - i) * 0.42, 0), size: [3.1, 0.38, 1.4], color: user ? 0x2563eb : 0xf59e0b, text: ly, textColor: '#ffffff', glow: mi === cur ? 0.15 : 0, info: { title: `${m.name}: ${ly}`, sub: user ? '사용자가 관리' : '클라우드 업체가 관리', body: m.desc } });
        });
        out.push({ key: `h:${mi}`, kind: 'sign', pos: V(CX(mi), LAYERS.length * 0.42 + 0.45, 0), runs: [{ text: m.name, color: P.text, weight: 800 }], height: 0.52, bg: hex(mi === cur ? P.pend : P.slab), info: { title: m.name, sub: m.en, body: m.desc } });
      });
      out.push({ key: 'k1', kind: 'sign', pos: V(-3.2, 0.3, 1.6), runs: [{ text: '■ 사용자가 관리', color: '#2563eb', weight: 800, size: 38 }], height: 0.4 });
      out.push({ key: 'k2', kind: 'sign', pos: V(3.2, 0.3, 1.6), runs: [{ text: '■ 클라우드 업체가 관리', color: '#f59e0b', weight: 800, size: 38 }], height: 0.4 });
      out.push({ key: 'user', kind: 'obj', pos: V(-8.4, 0, 0), make: () => shapeOf(w, 'person', 0x2563eb), info: { title: '사용자', body: '파란 층은 사용자가 직접 설치·관리해야 하는 부분입니다.' } });
      out.push({ key: 'vendor', kind: 'obj', pos: V(8.4, 0, 0), make: () => shapeOf(w, 'cloud', 0xf59e0b), info: { title: '클라우드 업체', body: '주황 층은 업체가 관리해 줍니다. 위쪽으로 갈수록(SaaS) 업체가 맡는 부분이 커집니다.' } });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    async function show(mi: number) {
      cur = mi;
      const m = MODELS[mi]!;
      l.code(`${m.name} (${m.en})`);
      shownUser[mi] = 9;
      await draw({ ms: 300 });
      for (let u = 8; u >= m.user; u--) { shownUser[mi] = u; await draw({ ms: 160 }); }
      l.say(`${m.name}: ${m.desc} 사용자가 관리하는 층 ${m.user}개 / 업체가 관리하는 층 ${9 - m.user}개.`, 'ok');
    }
    async function reset() { cur = -1; shownUser = MODELS.map((m) => m.user); await draw({ exit: 'shrink', spawn: (key, to) => (key.startsWith('c:') ? to.clone().add(V(0, 4, 0)) : undefined), ms: 700 }); w.fit(-9.4, 9.4, -2.8, 2.6); }
    void reset();
    return {
      hint: '모델 단추를 누르면 그 탑에서 업체가 맡는 층(주황)이 아래부터 차오릅니다. 블록을 누르면 설명이 나옵니다.',
      reset,
      groups: [
        { name: '모델', en: 'Service model', hue: 30, cmds: MODELS.map((m, i): Cmd => ({ name: m.name, tip: m.en, run: () => show(i) })) },
        { name: '비교', hue: 210, cmds: [{ name: '차례로 비교', run: async () => { for (let i = 0; i < MODELS.length; i++) { await show(i); await sleep(1400); } } }] },
      ],
    };
  } });
}

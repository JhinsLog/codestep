// 정규화 3D 실습: 한 칸에 여러 값 → 1NF(행으로 펼침) → 2NF(부분 종속 떼어 냄) → 3NF(이행 종속 떼어 냄),
// BCNF·4NF 예시, 이상 현상(삽입·삭제·갱신)을 정규화 전후에 해 본다. 표 위의 곡선 화살표가 함수 종속이다.
import { ConeGeometry, Group, Mesh, MeshBasicMaterial, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import type { Want } from './keyed';
import { base, bounceRow, colOf, dropIn, flashAll, hopAll, rowOf } from './kit';
import { lab } from './lab';
import { HH, V3, Y0, tLayout, tableWants, type TCol, type TView } from './tables';
import { hex, type Info, type World } from './world';

interface NRow { id: string; v: Record<string, string | null>; src?: [string, string] }
interface NTable { key: string; name: string; cols: TCol[]; rows: NRow[]; x: number; src?: string }
type FdKind = 'full' | 'partial' | 'trans' | 'bad' | 'mvd';
interface Fd { t: string; from: string[]; to: string; kind: FdKind }
interface Stage { id: string; tables: NTable[]; fds: Fd[] }

const INFO: Record<string, Info> = {
  full: { title: '완전 함수 종속', sub: 'Full Functional Dependency', body: '기본키 "전체"가 있어야 값이 정해지는 종속입니다. 예: (학번, 과목) → 성적. 정규화가 끝난 표에는 이것만 남습니다.' },
  partial: { title: '부분 함수 종속', sub: 'Partial Dependency → 2NF에서 제거', body: '복합 기본키의 "일부"만으로 정해지는 속성. 예: 키가 (학번, 과목)인데 학번만으로 이름·학과가 정해진다. 학번이 여러 행에 반복되니 이름·학과도 반복 저장됩니다.' },
  trans: { title: '이행 함수 종속', sub: 'Transitive Dependency → 3NF에서 제거', body: '학번 → 학과 → 학과장처럼 키가 아닌 속성을 거쳐 정해지는 속성. 학과장이 학과마다 반복 저장되어 갱신 이상이 생깁니다.' },
  bad: { title: 'BCNF 위반', sub: '결정자가 후보키가 아님', body: '교수 → 과목인데 교수는 후보키가 아닙니다. BCNF는 "모든 결정자가 후보키"여야 합니다.' },
  mvd: { title: '다치 종속', sub: 'Multi-Valued Dependency → 4NF에서 제거', body: '과목 하나에 교수 여러 명, 교재 여러 권이 서로 상관없이 붙어 있으면, 모든 조합을 행으로 저장해야 해서 중복이 폭발합니다. 과목 ↠ 교수, 과목 ↠ 교재.' },
  unf: { title: '비정규 릴레이션', sub: '한 칸에 여러 값', body: '과목 칸에 "DB, OS"처럼 값이 두 개 들어 있습니다. 원자값이 아니므로 제1정규형이 아닙니다.' },
};

const C = (name: string, w: number, key?: TCol['key']): TCol => ({ name, w, key });
const R = (id: string, v: Record<string, string | null>, src?: [string, string]): NRow => ({ id, v, src });
const S = (학번: string, 이름: string, 학과: string, 학과장: string, 과목: string, 성적: string) => ({ 학번, 이름, 학과, 학과장, 과목, 성적 });

function stages(): Record<string, Stage> {
  const all = [C('학번', 1.15), C('이름', 1.25), C('학과', 1.15), C('학과장', 1.3), C('과목', 1.45), C('성적', 1.25)];
  const k2 = [C('학번', 1.15, 'pk'), C('이름', 1.25), C('학과', 1.15), C('학과장', 1.3), C('과목', 1.3, 'pk'), C('성적', 1.15)];
  const one = [
    R('r1', S('1001', '김철수', '컴공', '박교수', 'DB', 'A')), R('r1b', S('1001', '김철수', '컴공', '박교수', 'OS', 'B'), ['e', 'r1']),
    R('r2', S('1002', '이영희', '경영', '최교수', 'DB', 'B')),
    R('r3', S('1003', '박민수', '컴공', '박교수', 'OS', 'A')), R('r3b', S('1003', '박민수', '컴공', '박교수', 'NW', 'C'), ['e', 'r3']),
  ];
  const enr = (x: number): NTable => ({ key: 'e', name: '수강', x, cols: [C('학번', 1.15, 'pk'), C('과목', 1.3, 'pk'), C('성적', 1.15)], rows: one.map((r) => R(r.id, { 학번: r.v['학번']!, 과목: r.v['과목']!, 성적: r.v['성적']! })) });
  const stu = (cols: TCol[], x: number, src: string): NTable => ({ key: 's', name: '학생', x, src, cols, rows: [['s1', 'r1', '1001', '김철수', '컴공', '박교수'], ['s2', 'r2', '1002', '이영희', '경영', '최교수'], ['s3', 'r3', '1003', '박민수', '컴공', '박교수']].map(([id, r, a, b, c, d]) => R(id!, { 학번: a!, 이름: b!, 학과: c!, 학과장: d! }, src === 'e' ? ['e', r!] : ['s', id!])) });
  return {
    UNF: { id: 'UNF', fds: [], tables: [{ key: 'e', name: '수강', x: 0, cols: [C('학번', 1.15, 'pk'), ...all.slice(1)], rows: [
      R('r1', S('1001', '김철수', '컴공', '박교수', 'DB, OS', 'A, B')), R('r2', S('1002', '이영희', '경영', '최교수', 'DB', 'B')), R('r3', S('1003', '박민수', '컴공', '박교수', 'OS, NW', 'A, C'))] }] },
    '1NF': { id: '1NF', tables: [{ key: 'e', name: '수강', x: 0, cols: k2, rows: one }], fds: [
      { t: 'e', from: ['학번', '과목'], to: '성적', kind: 'full' }, { t: 'e', from: ['학번'], to: '이름', kind: 'partial' }, { t: 'e', from: ['학번'], to: '학과', kind: 'partial' }, { t: 'e', from: ['학과'], to: '학과장', kind: 'trans' }] },
    '2NF': { id: '2NF', tables: [stu([C('학번', 1.15, 'pk'), C('이름', 1.25), C('학과', 1.15), C('학과장', 1.3)], -3.2, 'e'), enr(3.6)], fds: [
      { t: 'e', from: ['학번', '과목'], to: '성적', kind: 'full' }, { t: 's', from: ['학번'], to: '이름', kind: 'full' }, { t: 's', from: ['학번'], to: '학과', kind: 'full' }, { t: 's', from: ['학과'], to: '학과장', kind: 'trans' }] },
    '3NF': { id: '3NF', tables: [
      { key: 'd', name: '학과', x: -6.3, src: 's', cols: [C('학과', 1.15, 'pk'), C('학과장', 1.3)], rows: [R('d1', { 학과: '컴공', 학과장: '박교수' }, ['s', 's1']), R('d2', { 학과: '경영', 학과장: '최교수' }, ['s', 's2'])] },
      stu([C('학번', 1.15, 'pk'), C('이름', 1.25), C('학과', 1.15, 'fk')], -1.6, 's'), enr(3.7)], fds: [
      { t: 'e', from: ['학번', '과목'], to: '성적', kind: 'full' }, { t: 's', from: ['학번'], to: '이름', kind: 'full' }, { t: 's', from: ['학번'], to: '학과', kind: 'full' }, { t: 'd', from: ['학과'], to: '학과장', kind: 'full' }] },
    BC0: { id: 'BC0', tables: [{ key: 'b', name: '수강지도', x: 0, cols: [C('학번', 1.2, 'pk'), C('과목', 1.2, 'pk'), C('교수', 1.4)], rows: [
      R('b1', { 학번: '1001', 과목: 'DB', 교수: '김교수' }), R('b2', { 학번: '1002', 과목: 'DB', 교수: '김교수' }), R('b3', { 학번: '1001', 과목: 'OS', 교수: '이교수' }), R('b4', { 학번: '1003', 과목: 'DB', 교수: '박교수' })] }], fds: [
      { t: 'b', from: ['학번', '과목'], to: '교수', kind: 'full' }, { t: 'b', from: ['교수'], to: '과목', kind: 'bad' }] },
    BC1: { id: 'BC1', tables: [
      { key: 'b', name: '수강', x: -2.4, cols: [C('학번', 1.2, 'pk'), C('교수', 1.4, 'pk')], rows: [R('b1', { 학번: '1001', 교수: '김교수' }), R('b2', { 학번: '1002', 교수: '김교수' }), R('b3', { 학번: '1001', 교수: '이교수' }), R('b4', { 학번: '1003', 교수: '박교수' })] },
      { key: 'p', name: '교수과목', x: 3, src: 'b', cols: [C('교수', 1.4, 'pk'), C('과목', 1.2)], rows: [R('p1', { 교수: '김교수', 과목: 'DB' }, ['b', 'b1']), R('p2', { 교수: '이교수', 과목: 'OS' }, ['b', 'b3']), R('p3', { 교수: '박교수', 과목: 'DB' }, ['b', 'b4'])] }], fds: [
      { t: 'p', from: ['교수'], to: '과목', kind: 'full' }] },
    M0: { id: 'M0', tables: [{ key: 'm', name: '강좌', x: 0, cols: [C('과목', 1.2, 'pk'), C('교수', 1.3, 'pk'), C('교재', 1.3, 'pk')], rows: [
      R('m1', { 과목: 'DB', 교수: '김교수', 교재: 'A책' }), R('m2', { 과목: 'DB', 교수: '김교수', 교재: 'B책' }), R('m3', { 과목: 'DB', 교수: '박교수', 교재: 'A책' }), R('m4', { 과목: 'DB', 교수: '박교수', 교재: 'B책' })] }], fds: [
      { t: 'm', from: ['과목'], to: '교수', kind: 'mvd' }, { t: 'm', from: ['과목'], to: '교재', kind: 'mvd' }] },
    M1: { id: 'M1', tables: [
      { key: 'm', name: '담당', x: -2.6, cols: [C('과목', 1.2, 'pk'), C('교수', 1.3, 'pk')], rows: [R('m1', { 과목: 'DB', 교수: '김교수' }), R('m3', { 과목: 'DB', 교수: '박교수' })] },
      { key: 'n', name: '교재', x: 2.6, src: 'm', cols: [C('과목', 1.2, 'pk'), C('교재', 1.3, 'pk')], rows: [R('n1', { 과목: 'DB', 교재: 'A책' }, ['m', 'm1']), R('n2', { 과목: 'DB', 교재: 'B책' }, ['m', 'm2'])] }], fds: [] },
  };
}

/** 머리 블록 위로 솟는 곡선 화살표 */
function arc(w: World, a: Vector3, b: Vector3, color: number, h: number, dbl = false): Group {
  const g = new Group();
  const mid = a.clone().add(b).multiplyScalar(0.5).setY(a.y + h);
  const curve = new QuadraticBezierCurve3(a, mid, b);
  const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  g.add(new Mesh(new TubeGeometry(curve, 28, 0.035, 6), mat));
  const head = (t: number) => {
    const cone = new Mesh(new ConeGeometry(0.11, 0.26, 10), mat.clone());
    const p = curve.getPoint(t), d = curve.getTangent(t);
    cone.position.copy(p);
    cone.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
    g.add(cone);
  };
  head(1);
  if (dbl) head(0.86);
  void w;
  return g;
}

export function normLab(): Viz {
  return lab({ title: '정규화 3D', en: 'UNF → 1NF → 2NF → 3NF · BCNF · 4NF · Anomaly', height: 500, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const ST = stages();
    let st: Stage = structuredClone(ST.UNF!);
    let showFd = true;
    let hi = new Map<string, number>();
    const P = () => w.pal;
    const fdColor = (kind: FdKind) => ({ full: P().good, partial: P().warn, trans: P().bad, bad: P().bad, mvd: 0xa855f7 }[kind]);
    const views = (): TView[] => st.tables.map((t) => ({ key: t.key, name: t.name, cols: t.cols, rows: t.rows, x: t.x, z: 0, hi, noName: true,
      info: st.id === 'UNF' ? INFO.unf : undefined }));
    function want(): Want[] {
      const out: Want[] = [];
      for (const v of views()) {
        out.push(...tableWants(w, v));
        const L = tLayout(v);
        out.push({ key: `${v.key}:tag`, kind: 'sign', pos: V3(v.x, 0.25, L.z1 + 0.55), runs: [{ text: v.name, color: P().text, weight: 800, size: 40 }], height: 0.42, bg: hex(P().slab) });
      }
      if (showFd) {
        const by = new Map(views().map((v) => [v.key, v]));
        const count = new Map<string, number>();
        for (const f of st.fds) {
          const v = by.get(f.t);
          if (!v) continue;
          const L = tLayout(v);
          const xi = (c: string) => L.xs[v.cols.findIndex((x) => x.name === c)]!;
          const to = V3(xi(f.to), Y0 + HH + 0.05, -0.12);
          f.from.forEach((c, j) => {
            const from = V3(xi(c), Y0 + HH + 0.05, -0.12 + j * 0.0);
            const n = (count.get(f.t) ?? 0) + 1;
            count.set(f.t, n);
            const h = 0.45 + Math.abs(to.x - from.x) * 0.16 + (n % 3) * 0.12;
            const color = fdColor(f.kind);
            out.push({ key: `fd:${f.t}:${f.from.join('+')}>${f.to}:${c}`, kind: 'obj', pos: V3(0, 0, 0), sig: `${from.toArray()}|${to.toArray()}|${h}|${color}`, make: () => arc(w, from, to, color, h, f.kind === 'mvd'), info: INFO[f.kind] });
          });
        }
      }
      return out;
    }
    const draw = (o = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const fit = () => {
      let x0 = Infinity, x1 = -Infinity, z1 = 0;
      for (const v of views()) { const L = tLayout(v); x0 = Math.min(x0, L.x0); x1 = Math.max(x1, L.x1); z1 = Math.max(z1, L.z1); }
      w.fit(x0 - 0.5, x1 + 0.5, -2.4, z1 + 1);
    };
    const legend = () => {
      const chip = (t: string, c: number) => { const s = document.createElement('span'); s.className = 'lab-chip'; s.style.background = hex(c); s.style.color = '#fff'; s.textContent = t; return s; };
      l.status(chip(`지금: ${{ UNF: '비정규형', '1NF': '제1정규형', '2NF': '제2정규형', '3NF': '제3정규형', BC0: 'BCNF 위반', BC1: 'BCNF', M0: '4NF 위반', M1: '제4정규형' }[st.id]}`, P().accent),
        chip('완전 종속', P().good), chip('부분 종속', P().warn), chip('이행 종속', P().bad), chip('다치 종속', 0xa855f7));
    };

    /** 다음 단계로: 새 표의 블록은 원래 있던 블록 자리에서 날아온다 */
    async function become(id: string, ms = 900) {
      const pos = new Map(k.keys().map((kk) => [kk, k.get(kk)!.position.clone()]));
      const next = structuredClone(ST[id]!);
      const tabs = new Map(next.tables.map((t) => [t.key, t]));
      st = next;
      hi = new Map();
      const spawn = (key: string) => {
        const m = /^(\w+):(h|c):(?:(\w+):)?(.+)$/.exec(key);
        if (!m) return undefined;
        const t = tabs.get(m[1]!);
        if (!t) return undefined;
        if (m[2] === 'h') return pos.get(`${t.src ?? t.key}:h:${m[4]}`);
        const r = t.rows.find((x) => x.id === m[3]);
        const src = r?.src ?? [t.key, r?.id ?? ''];
        return pos.get(`${src[0]}:c:${src[1]}:${m[4]}`) ?? pos.get(`${t.src ?? t.key}:c:${src[1]}:${m[4]}`);
      };
      await draw({ spawn, arc: 1.2, ms });
      legend();
      fit();
    }

    const order = ['UNF', '1NF', '2NF', '3NF'];
    async function step(to: string) {
      if (st.id === 'UNF' && to === '1NF') {
        l.code('-- 1NF: 모든 속성 값을 원자값으로\n-- "DB, OS" → 두 행으로 나눈다');
        await flashAll(w, [...colOf(k, 'e', '과목', false), ...colOf(k, 'e', '성적', false)].filter((o) => /,/.test((o.userData.top as { text: string } | undefined)?.text ?? '')), P().bad, 900);
        await become('1NF');
        l.say('여러 값이 든 칸을 행으로 펼쳐 원자값만 남겼습니다(1NF). 이제 기본키는 (학번, 과목). 그런데 학번만으로 이름·학과가 정해지는 부분 종속(주황)이 보입니다.', 'ok');
      } else if (st.id === '1NF' && to === '2NF') {
        l.code('-- 2NF: 부분 함수 종속 제거\n학생(학번, 이름, 학과, 학과장)\n수강(학번, 과목, 성적)');
        await hopAll(w, ['학번', '이름', '학과', '학과장'].flatMap((c) => colOf(k, 'e', c)), 0.4, 600);
        await become('2NF');
        l.say('학번에만 종속된 이름·학과(·학과장)를 학생 테이블로 떼어 냈습니다(2NF). 중복이던 김철수·박민수 행이 하나로 합쳐졌습니다. 아직 학번 → 학과 → 학과장 이행 종속(빨강)이 남았습니다.', 'ok');
      } else if (st.id === '2NF' && to === '3NF') {
        l.code('-- 3NF: 이행 함수 종속 제거\n학과(학과, 학과장)\n학생(학번, 이름, 학과)');
        await hopAll(w, [...colOf(k, 's', '학과'), ...colOf(k, 's', '학과장')], 0.4, 600);
        await become('3NF');
        l.say('학과 → 학과장을 학과 테이블로 떼어 냈습니다(3NF). 컴공-박교수가 한 번만 저장됩니다. 남은 화살표는 모두 기본키 전체에서 나오는 완전 종속(초록)입니다.', 'ok');
      }
    }
    async function goStage(to: string) {
      const ci = order.indexOf(st.id), ti = order.indexOf(to);
      if (ci < 0 || ti < ci) {
        l.code('');
        st = structuredClone(ST[to]!);
        hi = new Map();
        await draw({ exit: 'shrink', ms: 500 });
        legend();
        fit();
        l.say(`${to} 상태로 돌아왔습니다.`, 'info');
        return;
      }
      for (let i = ci + 1; i <= ti; i++) { await step(order[i]!); if (i < ti) await sleep(1200); }
      if (ci === ti) l.say(`이미 ${to}입니다.`, 'info');
    }

    const tableWith = (col: string) => st.tables.find((t) => t.cols.some((c) => c.name === col));
    async function ensureUnfolded() {
      if (!order.includes(st.id)) { st = structuredClone(ST['1NF']!); await draw({ exit: 'shrink' }); legend(); fit(); }
      if (st.id === 'UNF') await step('1NF');
    }

    async function reset() {
      st = structuredClone(ST.UNF!);
      hi = new Map();
      showFd = true;
      await draw({ exit: 'shrink' });
      legend();
      fit();
    }
    void reset();

    return {
      hint: '정규화 ▸ 1NF → 2NF → 3NF 순서로 눌러 표가 어떻게 쪼개지는지 보세요. 곡선 화살표는 함수 종속(누르면 설명).',
      reset,
      groups: [
        { name: '정규화', en: 'Normalize', hue: 215, cmds: [
          { name: '비정규형', run: () => reset().then(() => { l.code(''); l.say('과목·성적 칸에 값이 여러 개 들어 있는 비정규 릴레이션입니다.', 'info'); }) },
          { name: '1NF', tip: '원자값', run: () => goStage('1NF') },
          { name: '2NF', tip: '부분 종속 제거', run: () => goStage('2NF') },
          { name: '3NF', tip: '이행 종속 제거', run: () => goStage('3NF') },
          { name: 'BCNF', sub: [
            { name: '위반 표 보기', run: async () => {
              l.code('수강지도(학번, 과목, 교수)\n-- 교수 → 과목 (교수 한 명은 한 과목만)');
              st = structuredClone(ST.BC0!);
              await draw({ exit: 'shrink', ms: 600 });
              legend(); fit();
              l.say('3NF이지만 교수 → 과목(빨강)에서 결정자 교수가 후보키가 아닙니다 → BCNF 위반. 김교수-DB가 반복 저장됩니다. "분해하기"를 눌러 보세요.', 'bad');
            } },
            { name: '분해하기', run: async () => {
              if (st.id !== 'BC0') { st = structuredClone(ST.BC0!); await draw({ exit: 'shrink', ms: 500 }); await sleep(400); }
              l.code('-- BCNF: 모든 결정자가 후보키가 되도록\n수강(학번, 교수)\n교수과목(교수, 과목)');
              await hopAll(w, [...colOf(k, 'b', '교수'), ...colOf(k, 'b', '과목')], 0.4, 600);
              await become('BC1');
              l.say('교수 → 과목을 따로 떼어 내니 결정자 교수가 교수과목 테이블의 기본키가 됐습니다(BCNF). 김교수-DB는 한 번만 저장됩니다.', 'ok');
            } },
          ] },
          { name: '4NF', sub: [
            { name: '위반 표 보기', run: async () => {
              l.code('강좌(과목, 교수, 교재)\n-- 과목 ↠ 교수, 과목 ↠ 교재 (서로 독립)');
              st = structuredClone(ST.M0!);
              await draw({ exit: 'shrink', ms: 600 });
              legend(); fit();
              l.say('DB 과목의 교수 2명 × 교재 2권을 모든 조합(4행)으로 저장해야 합니다. 교수와 교재가 서로 상관없는 다치 종속(보라 이중 화살표)입니다.', 'bad');
            } },
            { name: '분해하기', run: async () => {
              if (st.id !== 'M0') { st = structuredClone(ST.M0!); await draw({ exit: 'shrink', ms: 500 }); await sleep(400); }
              l.code('-- 4NF: 다치 종속 제거\n담당(과목, 교수)\n교재(과목, 교재)');
              await become('M1');
              l.say('교수와 교재를 따로 나누니 4행이 2행 + 2행으로 줄었습니다(4NF). 다시 조인하면 원래 4행이 그대로 나옵니다(무손실 분해). 5NF는 조인 종속까지 없앤 단계입니다.', 'ok');
            } },
          ] },
          { name: '종속 화살표', tip: '함수 종속 보이기/숨기기', run: async () => { showFd = !showFd; await draw({ ms: 300 }); l.say(showFd ? '함수 종속 화살표를 켰습니다. 결정자 → 종속자 방향입니다.' : '화살표를 숨겼습니다.', 'info'); } },
        ] },
        { name: '이상 현상', en: 'Anomaly', hue: 0, cmds: [
          { name: '삽입 이상', run: async () => {
            await ensureUnfolded();
            const e = st.tables.find((t) => t.key === 'e')!;
            if (st.id === '1NF') {
              l.code("-- 아직 수강 과목이 없는 신입생 등록\nINSERT INTO 수강 VALUES ('1004', '최지은', '전자', '정교수', NULL, NULL);");
              const v = views().find((x) => x.key === 'e')!;
              await bounceRow(b, v, { 학번: '1004', 이름: '최지은', 학과: '전자', 학과장: '정교수', 과목: null, 성적: null }, colOf(k, 'e', '과목'));
              l.say('과목이 기본키의 일부라 NULL이 될 수 없어 학생을 등록하지 못합니다 — 삽입 이상. (2NF로 나누면 해결)', 'bad');
            } else {
              const s = tableWith('이름')!;
              l.code("INSERT INTO 학생 VALUES ('1004', '최지은', '전자'…);");
              const r: NRow = { id: 's4', v: Object.fromEntries(s.cols.map((c) => [c.name, { 학번: '1004', 이름: '최지은', 학과: '전자', 학과장: '정교수' }[c.name] ?? null])) };
              s.rows.push(r);
              await draw({ spawn: dropIn((key) => key.startsWith(`${s.key}:c:s4:`)), ms: 650 });
              fit();
              void e;
              l.say('학생 테이블이 따로 있어서 수강 과목이 없어도 학생을 등록할 수 있습니다 — 정규화로 삽입 이상이 사라졌습니다.', 'ok');
            }
          } },
          { name: '삭제 이상', run: async () => {
            await ensureUnfolded();
            const e = st.tables.find((t) => t.key === 'e')!;
            const r = e.rows.find((x) => x.id === 'r2');
            if (!r) { l.say('이미 이영희의 수강 기록을 지웠습니다. 처음부터를 눌러 주세요.', 'info'); return; }
            l.code("-- 이영희가 DB 수강을 취소\nDELETE FROM 수강 WHERE 학번 = '1002' AND 과목 = 'DB';");
            await flashAll(w, rowOf(k, 'e', 'r2'), P().bad, 700);
            e.rows = e.rows.filter((x) => x !== r);
            await draw({ exit: 'fall', ms: 800 });
            if (st.id === '1NF') l.say('이영희의 유일한 수강 기록을 지우자 이영희가 경영학과라는 사실, 경영학과장이 최교수라는 정보까지 함께 사라졌습니다 — 삭제 이상.', 'bad');
            else {
              await flashAll(w, rowOf(k, 's', 's2'), P().good, 800);
              l.say('수강 기록만 지워지고 학생 테이블의 이영희 정보는 그대로 남았습니다 — 정규화로 삭제 이상이 사라졌습니다.', 'ok');
            }
          } },
          { name: '갱신 이상', run: async () => {
            await ensureUnfolded();
            const t = tableWith('학과장')!;
            const rows = t.rows.filter((r) => r.v['학과'] === '컴공');
            const first = rows[0]!;
            l.code(`-- 컴공 학과장이 김교수로 바뀌었는데, 한 행만 고쳤다\nUPDATE ${t.name} SET 학과장 = '김교수'\n  WHERE ${t.key === 'd' ? "학과 = '컴공'" : "학번 = '1001' AND 과목 = 'DB'"};`);
            const o = k.get(`${t.key}:c:${first.id}:학과장`)!;
            await w.flip(o, 650, () => w.setTop(o as Group, '김교수', P().cellText));
            first.v['학과장'] = '김교수';
            if (rows.length > 1) {
              for (const r of rows) hi.set(`${r.id}:학과장`, r === first ? P().pend : P().bad);
              await draw({ ms: 300 });
              await flashAll(w, rows.slice(1).map((r) => k.get(`${t.key}:c:${r.id}:학과장`)), P().bad, 1000);
              l.say(`같은 컴공인데 학과장이 김교수/박교수로 엇갈립니다 — 갱신 이상(불일치). 컴공 학과장이 ${rows.length}곳에 중복 저장돼 있어서입니다.${st.id === '2NF' ? ' 2NF에서도 이행 종속 때문에 남아 있습니다 → 3NF로!' : ''}`, 'bad');
            } else {
              hi.set(`${first.id}:학과장`, P().good);
              await draw({ ms: 300 });
              l.say('학과장은 학과 테이블에 한 번만 저장돼 있어서, 한 곳만 고치면 모든 컴공 학생에게 똑같이 적용됩니다 — 갱신 이상이 없습니다.', 'ok');
            }
          } },
        ] },
      ],
    };
  } });
}

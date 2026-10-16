// SQL 명령어 3D 실습: DDL·DML·DCL·TCL 단추를 누르면 테이블·뷰·인덱스·도메인이 생기고, 바뀌고, 사라진다.
// 데이터(Data)를 바꾼 뒤 want()로 "있어야 할 블록 목록"을 만들어 Keyed에 맞춰 그리게 한다.
import { Group, Object3D, Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import { Keyed, type SyncOpts, type Want } from './keyed';
import { lab, type Cmd, type Lab, type LabSetup } from './lab';
import { hex, type Info } from './world';

interface Col { name: string; type: string; w: number; pk?: boolean }
interface Row { id: number; v: Record<string, string> }
interface Table { cols: Col[]; rows: Row[] }
interface Data { table: Table | null; view: boolean; index: boolean; domain: boolean }
interface Snap { data: Data; dirty: number[]; pending: number }

const V3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const PITCH = 0.95, CD = 0.8, GX = 0.12, HH = 0.5, CH = 0.3, Y0 = 0.12, VW = 1.5;
const SAMPLE = [['1001', '김철수', '컴공', '3'], ['1002', '이영희', '경영', '2'], ['1003', '박민수', '컴공', '1'], ['1004', '최지은', '전자', '4'], ['1005', '정하늘', '컴공', '2'], ['1006', '한별', '경영', '3']];
const MORE = ['강다온', '윤서진', '임도윤', '서지안', '문하린', '배시우'];
const COLS = ['학번', '이름', '학과', '학년'];
const ko = (a: string, b: string) => a.localeCompare(b, 'ko');
const clone = (d: Data): Data => ({ ...d, table: d.table && { cols: d.table.cols.map((c) => ({ ...c })), rows: d.table.rows.map((r) => ({ id: r.id, v: { ...r.v } })) } });
const q = (c: string, v: string) => (c === '학번' || c === '학년' ? v : `'${v}'`);

const INFO = {
  table: { title: '테이블 (TABLE)', sub: 'CREATE TABLE로 만든다', body: '행(튜플)과 열(속성)로 된 2차원 표. 실제 데이터가 저장되는 기본 객체입니다.\n\n맨 앞 줄의 파란 블록이 열 이름(속성), 그 뒤로 늘어선 흰 블록 줄이 행입니다. 노란 블록은 기본키(PK) 열 — 값이 중복되거나 NULL이면 안 됩니다(개체 무결성).' },
  view: { title: '뷰 (VIEW)', sub: '가상 테이블', body: '다른 테이블에서 SELECT로 골라낸 결과를 테이블처럼 쓰는 가상 테이블입니다. 반투명한 것은 데이터를 따로 저장하지 않기 때문 — 원본 테이블이 바뀌면 뷰도 따라 바뀝니다.\n\n장점: 필요한 열만 보여 줘 보안에 유리하고, 복잡한 질의를 간단히 씁니다. 단점: 뷰는 ALTER로 고칠 수 없어 DROP 후 다시 만들어야 하고, 인덱스를 만들 수 없습니다. 원본 테이블을 DROP ... CASCADE하면 뷰도 함께 사라집니다.' },
  index: { title: '인덱스 (INDEX)', sub: '책의 찾아보기', body: '특정 열(여기서는 이름)의 값을 정렬해 두고 각 값이 원래 어느 행에 있는지 가리키는 별도 구조입니다. 선은 "이 이름은 저 행에 있다"는 포인터입니다.\n\n검색(SELECT ... WHERE 이름 = …)은 빨라지지만, 행을 넣고 고치고 지울 때마다 인덱스도 같이 고쳐야 하므로 쓰기는 느려지고 저장 공간도 더 듭니다.' },
  domain: { title: '도메인 (DOMAIN)', sub: '속성이 가질 수 있는 값의 범위', body: '하나의 속성(열)이 가질 수 있는 원자값들의 집합입니다. CREATE DOMAIN으로 이름을 붙여 정의하면 여러 열에서 같은 규칙을 재사용할 수 있습니다.\n\n학년 열 둘레의 초록 울타리가 CHECK (VALUE BETWEEN 1 AND 4) 규칙입니다. 범위를 벗어난 값은 들어오지 못합니다(도메인 무결성).' },
  result: { title: '결과 집합 (Result Set)', sub: 'SELECT의 결과', body: 'SELECT는 테이블을 바꾸지 않고, 조건에 맞는 행·열을 복사해 새 표(결과)로 돌려줍니다. 다음 명령을 실행하면 사라집니다.' },
  user: { title: '사용자와 권한', sub: 'DCL', body: 'DBA(관리자)가 GRANT로 권한(열쇠)을 주고 REVOKE로 회수합니다. 머리 위 열쇠가 그 사용자가 가진 권한입니다.\n\n노란 열쇠는 WITH GRANT OPTION — 받은 권한을 다른 사람에게 다시 줄 수 있는 권한입니다. REVOKE ... CASCADE로 회수하면 그 사람이 나눠 준 권한까지 연쇄적으로 회수됩니다.' },
  sp: { title: '세이브포인트 (SAVEPOINT)', sub: 'TCL', body: '트랜잭션 중간에 찍어 두는 저장 지점입니다. ROLLBACK TO 이름으로 그 시점까지만 되돌릴 수 있습니다. COMMIT하면 세이브포인트는 모두 없어집니다.' },
} satisfies Record<string, Info>;

function colInfo(c: Col): Info {
  return { title: `열(속성) ${c.name}`, sub: c.type + (c.pk ? ' · PRIMARY KEY' : ''), body: c.pk ? '기본키(PK) 열입니다. 각 행을 유일하게 구별하므로 같은 값이 두 번 들어올 수 없고 NULL도 안 됩니다(개체 무결성). INSERT ▸ 학번 중복으로 확인해 보세요.' : `데이터 타입이 ${c.type}인 열입니다. ALTER TABLE로 열을 추가(ADD)·변경(MODIFY)·삭제(DROP COLUMN)할 수 있습니다.` };
}
function cellInfo(c: Col, r: Row, dirty: boolean): Info {
  const v = r.v[c.name];
  return { title: `${r.v['이름'] ?? ''} 학생의 ${c.name}`, sub: v === undefined ? 'NULL' : v, body: (v === undefined ? 'NULL은 "값이 없음(모름)"을 뜻합니다. 0이나 빈 문자열과 다릅니다. ALTER TABLE ... ADD로 열을 추가하면 기존 행의 값은 NULL이 됩니다.\n\n' : '') + (dirty ? '노란색은 아직 COMMIT하지 않은 변경입니다. ROLLBACK하면 되돌아갑니다.' : '한 행(튜플)의 한 칸입니다. UPDATE로 값을 바꾸고 DELETE로 행을 지웁니다.') };
}

export function sqlLab(): Viz {
  return lab({ title: 'SQL 명령어 3D 실습', en: 'DDL · DML · DCL · TCL', height: 500, setup });
}

function setup(l: Lab): LabSetup {
  const w = l.world;
  const root = new Group();
  w.scene.add(root);
  const k = new Keyed(w, root);
  const temp = new Set<Object3D>();
  let data: Data = { table: null, view: false, index: false, domain: false };
  let dirty = new Set<number>();
  let pending = 0;
  let commit: Snap = snap();
  let sps: { name: string; s: Snap; z: number }[] = [];
  let result: { cols: string[]; rows: Row[]; from: 'c' | 'v' } | null = null;
  let users = false;
  // 권한: 사용자 → 권한 → { 다시 줄 수 있음, 준 사람 }
  const privs: Record<string, Map<string, { go: boolean; by: string }>> = { kim: new Map(), lee: new Map() };
  let nextId = 1, sampleAt = 0;

  function snap(): Snap { return { data: clone(data), dirty: [...dirty], pending }; }
  const p = () => w.pal;
  const t = () => data.table;

  // ── 배치 ──
  function colXs(cols: Col[]) {
    const W = cols.reduce((s, c) => s + c.w, 0) + GX * (cols.length - 1);
    let x = -W / 2;
    return { W, xs: cols.map((c) => { const m = x + c.w / 2; x += c.w + GX; return m; }) };
  }
  const tw = () => (t() ? colXs(t()!.cols).W : 4);
  const nrows = () => t()?.rows.length ?? 0;
  const vrows = () => t()?.rows.filter((r) => r.v['학과'] === '컴공') ?? [];
  const vx = (i: number) => tw() / 2 + 2.4 + VW / 2 + i * (VW + GX);
  const ix = () => -tw() / 2 - 2.7;
  const resZ = () => nrows() * PITCH + 2.6;
  const UX: Record<string, number> = { DBA: -4.5, kim: 0, lee: 4.5 };
  const UC: Record<string, number> = { DBA: 0x6366f1, kim: 0x0d9488, lee: 0xdb2777 };
  const UZ = -3.8;

  function want(): Want[] {
    const P = p();
    const out: Want[] = [];
    const tb = t();
    const n = nrows();
    const sign = (key: string, pos: Vector3, kind: string, name: string, info?: Info): Want =>
      ({ key, kind: 'sign', pos, runs: [{ text: `${kind} `, color: P.muted, size: 38 }, { text: name, color: P.text, weight: 800 }], height: 0.5, bg: hex(P.slab), info });
    if (tb) {
      const { W, xs } = colXs(tb.cols);
      out.push({ key: 'base', kind: 'block', pos: V3(0, 0, (n * PITCH) / 2), size: [W + 0.5, Y0, n * PITCH + CD + 0.5], color: P.slab, info: INFO.table });
      out.push(sign('tname', V3(0, 1.3, -0.3), 'TABLE', '학생', INFO.table));
      tb.cols.forEach((c, i) => {
        out.push({ key: `h:${c.name}`, kind: 'block', pos: V3(xs[i]!, Y0, 0), size: [c.w, HH, CD], color: c.pk ? P.key : P.accent, text: c.name, textColor: P.accentText, info: colInfo(c) });
        out.push({ key: `t:${c.name}`, kind: 'sign', pos: V3(xs[i]!, Y0 + HH + 0.32, 0), runs: [{ text: c.type + (c.pk ? ' · PK' : ''), color: P.muted, size: 36, mono: true }], height: 0.27, info: colInfo(c) });
      });
      tb.rows.forEach((r, ri) => tb.cols.forEach((c, i) => {
        const v = r.v[c.name];
        const d = dirty.has(r.id);
        out.push({ key: `c:${r.id}:${c.name}`, kind: 'block', pos: V3(xs[i]!, Y0, (ri + 1) * PITCH), size: [c.w, CH, CD], color: d ? P.pend : P.cell, text: v ?? 'NULL', textColor: v === undefined ? P.muted : P.cellText, info: cellInfo(c, r, d) });
      }));
      // 도메인 울타리: 학년 열 둘레
      const gi = tb.cols.findIndex((c) => c.name === '학년' && c.type === '학년_D');
      if (data.domain && gi >= 0) {
        const cx = xs[gi]!, cw = tb.cols[gi]!.w + 0.2, z0 = -CD / 2 - 0.12, z1 = n * PITCH + CD / 2 + 0.12, zc = (z0 + z1) / 2, len = z1 - z0;
        out.push({ key: 'df:l', kind: 'block', pos: V3(cx - cw / 2, 0, zc), size: [0.07, 0.75, len], color: P.good, opacity: 0.55, info: INFO.domain });
        out.push({ key: 'df:r', kind: 'block', pos: V3(cx + cw / 2, 0, zc), size: [0.07, 0.75, len], color: P.good, opacity: 0.55, info: INFO.domain });
        out.push({ key: 'df:f', kind: 'block', pos: V3(cx, 0, z1), size: [cw, 0.75, 0.07], color: P.good, opacity: 0.55, info: INFO.domain });
        out.push({ key: 'df:b', kind: 'block', pos: V3(cx, 0, z0), size: [cw, 0.75, 0.07], color: P.good, opacity: 0.55, info: INFO.domain });
      }
      if (data.view) {
        const vc = ['학번', '이름'];
        const mid = (vx(0) + vx(1)) / 2;
        out.push(sign('vname', V3(mid, 1.3, -0.3), 'VIEW', '컴공학생', INFO.view));
        vc.forEach((c, i) => out.push({ key: `vh:${c}`, kind: 'block', pos: V3(vx(i), Y0, 0), size: [VW, HH, CD], color: P.ghost, opacity: 0.6, text: c, textColor: P.text, info: INFO.view }));
        vrows().forEach((r, ri) => vc.forEach((c, i) => out.push({ key: `v:${r.id}:${c}`, kind: 'block', pos: V3(vx(i), Y0, (ri + 1) * PITCH), size: [VW, CH, CD], color: P.ghost, opacity: 0.38, text: r.v[c] ?? 'NULL', textColor: P.text, info: INFO.view })));
        const a = V3(W / 2 + 0.25, 0.25, 0), b = V3(vx(0) - VW / 2, 0.25, 0);
        out.push({ key: 'vlink', kind: 'obj', pos: a.clone().add(b).multiplyScalar(0.5), sig: `${a.x}|${b.x}|${P.ghost}`, make: () => w.bar(a, b, P.ghost, 0.05, 0.7), info: INFO.view });
        out.push({ key: 'vwhere', kind: 'sign', pos: V3(mid, 0.2, (vrows().length + 1) * PITCH + 0.75), runs: [{ text: "WHERE 학과 = '컴공'", color: P.muted, size: 34, mono: true }], height: 0.3, info: INFO.view });
      }
      if (data.index) {
        const x = ix();
        const ni = tb.cols.findIndex((c) => c.name === '이름');
        out.push(sign('iname', V3(x, 1.3, -0.3), 'INDEX', 'idx_이름', INFO.index));
        out.push({ key: 'ih', kind: 'block', pos: V3(x, Y0, 0), size: [2.2, HH, CD], color: P.key, text: '이름 ↑', textColor: P.accentText, info: INFO.index });
        [...tb.rows].sort((a, b) => ko(a.v['이름']!, b.v['이름']!)).forEach((r, si) => {
          const z = (si + 1) * PITCH;
          out.push({ key: `i:${r.id}`, kind: 'block', pos: V3(x, Y0, z), size: [2.2, CH, CD], color: P.cell, text: r.v['이름']!, info: INFO.index });
          const ri = tb.rows.indexOf(r);
          const a = V3(x + 1.1, Y0 + CH + 0.06, z), b = V3(xs[ni]! - tb.cols[ni]!.w / 2 + 0.1, Y0 + CH + 0.06, (ri + 1) * PITCH);
          out.push({ key: `il:${r.id}`, kind: 'obj', pos: a.clone().add(b).multiplyScalar(0.5), sig: `${a.toArray()}|${b.toArray()}|${P.key}`, make: () => w.bar(a, b, P.key, 0.025, 0.65), info: INFO.index });
        });
      }
      sps.forEach((s, j) => out.push({ key: `sp:${s.name}`, kind: 'sign', pos: V3(-W / 2 + 1 + j * 2.4, 0.35, n * PITCH + 1.25), runs: [{ text: 'SAVEPOINT ', color: P.muted, size: 34 }, { text: s.name, color: P.text, weight: 800 }], height: 0.36, bg: hex(P.pend), info: INFO.sp }));
    }
    if (data.domain) {
      const pos = tb ? V3(ix(), 0, -3.1) : V3(-3, 0, 0);
      out.push({ key: 'dcard', kind: 'block', pos, size: [2.4, 0.2, 1.1], color: P.good, text: '학년_D', textColor: '#ffffff', info: INFO.domain });
      out.push({ key: 'dsign', kind: 'sign', pos: pos.clone().add(V3(0, 0.75, 0)), runs: [{ text: 'DOMAIN ', color: P.muted, size: 36 }, { text: 'INT 1~4', color: P.text, weight: 800, mono: true }], height: 0.4, info: INFO.domain });
    }
    if (result) {
      const z = resZ();
      const x0 = -((result.cols.length * (VW + GX)) - GX) / 2 + VW / 2;
      out.push({ key: 'rname', kind: 'sign', pos: V3(0, 1.25, z - 0.2), runs: [{ text: '결과 ', color: P.muted, size: 38 }, { text: `${result.rows.length}행`, color: P.text, weight: 800 }], height: 0.45, info: INFO.result });
      result.cols.forEach((c, i) => out.push({ key: `rh:${c}`, kind: 'block', pos: V3(x0 + i * (VW + GX), Y0, z), size: [VW, HH, CD], color: P.good, text: c, textColor: '#ffffff', info: INFO.result }));
      result.rows.forEach((r, ri) => result!.cols.forEach((c, i) => out.push({ key: `r:${r.id}:${c}`, kind: 'block', pos: V3(x0 + i * (VW + GX), Y0, z + (ri + 1) * PITCH), size: [VW, CH, CD], color: P.cell, text: r.v[c] ?? 'NULL', info: INFO.result })));
    }
    if (users) {
      for (const u of ['DBA', 'kim', 'lee']) {
        const x = UX[u]!;
        out.push({ key: `u:${u}`, kind: 'obj', pos: V3(x, 0, UZ), make: person(UC[u]!), info: INFO.user });
        out.push({ key: `un:${u}`, kind: 'sign', pos: V3(x, 2.0, UZ), runs: [{ text: u, color: P.text, weight: 800 }], height: 0.42, info: INFO.user });
        const keys: [string, number][] = u === 'DBA' ? [['ALL', P.accent]] : [...privs[u]!].map(([pv, o]) => [pv, o.go ? P.key : P.good]);
        keys.forEach(([pv, color], j) => out.push({ key: `k:${u}:${pv}`, kind: 'sign', pos: V3(x, 2.6 + j * 0.55, UZ), runs: [{ text: pv, color: '#ffffff', weight: 800 }], height: 0.5, bg: hex(color), info: INFO.user }));
      }
    }
    return out;
  }

  function person(color: number) {
    return () => {
      const g = new Group();
      const body = w.block(0.75, 1.0, 0.45, color);
      const head = w.sphere(0.3, color, 0.05);
      head.position.y = 1.33;
      g.add(body, head);
      g.userData.body = body.userData.body;
      return g;
    };
  }

  function status() {
    const chip = (text: string, cls = '') => { const s = document.createElement('span'); s.className = `lab-chip ${cls}`; s.textContent = text; return s; };
    const parts: Node[] = [chip(pending ? `커밋 안 된 변경 ${pending}건` : '변경 없음(모두 확정)', pending ? 'warn' : '')];
    if (sps.length) parts.push(chip(`세이브포인트 ${sps.map((s) => s.name).join(' · ')}`));
    const objs = [t() && 'TABLE 학생', data.view && 'VIEW 컴공학생', data.index && 'INDEX idx_이름', data.domain && 'DOMAIN 학년_D'].filter(Boolean) as string[];
    parts.push(chip(objs.length ? objs.join(' · ') : '객체 없음', 'muted'));
    l.status(...parts);
  }

  async function draw(o: SyncOpts = {}) {
    await k.sync(want(), o);
    status();
  }
  function frame() {
    const W = tw();
    let x0 = t() ? -W / 2 : -1.5, x1 = t() ? W / 2 : 1.5, z0 = -1, z1 = t() ? nrows() * PITCH + 1 : 1;
    if (data.index) x0 = ix() - 1.3;
    if (data.domain && !t()) x0 = Math.min(x0, -4.4);
    if (data.view) x1 = vx(1) + VW / 2 + 0.3;
    if (result) z1 = resZ() + (result.rows.length + 1) * PITCH;
    if (users) { z0 = UZ - 0.5; x0 = Math.min(x0, -5.3); x1 = Math.max(x1, 5.3); }
    // 화면 가로 시야각에 맞춰 모두 들어오는 거리
    const half = Math.atan(Math.tan((w.camera.fov * Math.PI) / 360) * w.camera.aspect);
    const d = Math.max(8, ((x1 - x0) / 2 / Math.tan(half)) * 1.45, (z1 - z0) * 1.3);
    w.look(V3((x0 + x1) / 2, 0, (z0 + z1) / 2 + 0.4), d);
  }
  w.onRepaint = () => void draw({ ms: 0 });

  const need = (ok: unknown, msg: string): boolean => { if (!ok) l.say(msg, 'bad'); return !!ok; };
  const at = (key: string) => k.get(key)?.position.clone();
  const rowObjs = (id: number, pre = 'c') => k.starting(`${pre}:${id}:`);
  const ddl = () => { commit = snap(); commit.pending = 0; dirty.clear(); pending = 0; commit.dirty = []; sps = []; };
  const touch = (ids: number[]) => { for (const i of ids) dirty.add(i); pending++; };
  const begin = (sql: string) => {
    l.code(sql);
    if (result) { result = null; void draw({ ms: 400 }); }
  };
  const flashAll = (os: (Object3D | undefined)[], color: number, ms = 700) => Promise.all(os.filter(Boolean).map((o) => w.flash(o!, color, ms)));

  /** 한 행씩 WHERE 조건을 검사하는 모습: 맞는 행은 들썩이며 초록, 아니면 잠깐 빨강 */
  async function scan(pred: (r: Row) => boolean): Promise<Row[]> {
    const hits: Row[] = [];
    for (const r of t()!.rows) {
      const os = rowObjs(r.id);
      if (pred(r)) {
        hits.push(r);
        await Promise.all([...os.map((o) => w.hop(o, 0.3, 360)), flashAll(os, p().good, 520)]);
      } else await flashAll(os, p().bad, 300);
    }
    return hits;
  }

  /** 받아들여지지 않는 행: 위에서 내려오다 막혀서 빨갛게 번쩍이고 떨어진다 */
  async function bounce(vals: Record<string, string>, wall: Object3D[]) {
    const tb = t()!;
    const { xs } = colXs(tb.cols);
    const z = (tb.rows.length + 1) * PITCH;
    const blocks = tb.cols.map((c, i) => {
      const b = w.block(c.w, CH, CD, p().bad, { text: vals[c.name] ?? 'NULL', color: '#ffffff' });
      b.position.set(xs[i]!, 4.5, z + 0.6);
      root.add(b);
      temp.add(b);
      return b;
    });
    await Promise.all(blocks.map((b, i) => sleep(i * 60).then(() => w.move(b, V3(b.position.x, 0.9, z + 0.6), 520))));
    await Promise.all([flashAll(wall, p().bad, 900), ...blocks.map((b) => w.hop(b, 0.35, 400))]);
    await Promise.all(blocks.map((b) => { temp.delete(b); return w.vanish(b, 'fall', 700); }));
  }

  // ── DDL ──
  const create: Cmd[] = [
    { name: 'TABLE', tip: '학생 테이블 만들기', run: async () => {
      if (!need(!t(), '학생 테이블이 이미 있습니다. DROP ▸ TABLE로 지운 뒤 다시 만들어 보세요.')) return;
      const dom = data.domain;
      begin(`CREATE TABLE 학생 (\n  학번 INT PRIMARY KEY,\n  이름 VARCHAR(10) NOT NULL,\n  학과 VARCHAR(10),\n  학년 ${dom ? '학년_D' : 'INT'}\n);`);
      data.table = { cols: [{ name: '학번', type: 'INT', w: 1.4, pk: true }, { name: '이름', type: 'VARCHAR(10)', w: 1.7 }, { name: '학과', type: 'VARCHAR(10)', w: 1.5 }, { name: '학년', type: dom ? '학년_D' : 'INT', w: 1.3 }], rows: [] };
      ddl();
      frame();
      await draw({ spawn: (key, to) => (key.startsWith('h:') ? to.clone().add(V3(0, 5, 0)) : undefined), ms: 700 });
      l.say('열(속성)만 있는 빈 테이블이 생겼습니다 — 노란 블록이 기본키(PK). 이제 DML ▸ INSERT로 행을 넣어 보세요. (Oracle 등에서 DDL은 실행 즉시 자동 COMMIT)', 'ok');
    } },
    { name: 'VIEW', tip: '컴공 학생만 보이는 뷰', run: async () => {
      if (!need(t(), '뷰는 테이블을 바탕으로 만듭니다. 먼저 CREATE ▸ TABLE을 눌러 주세요.') || !need(!data.view, '컴공학생 뷰가 이미 있습니다.')) return;
      begin("CREATE VIEW 컴공학생 AS\n  SELECT 학번, 이름\n  FROM 학생\n  WHERE 학과 = '컴공';");
      await scan((r) => r.v['학과'] === '컴공');
      data.view = true;
      ddl();
      frame();
      await draw({ spawn: (key) => (key.startsWith('v:') ? at(`c${key.slice(1)}`) : undefined), arc: 1.4, ms: 800 });
      l.say(vrows().length
        ? '조건에 맞는 행의 학번·이름만 비춰 보이는 가상 테이블(반투명)이 생겼습니다. 데이터를 따로 저장하지 않아서, 원본에 컴공 학생을 INSERT하면 뷰에도 저절로 나타납니다.'
        : '뷰가 생겼지만 아직 컴공 학생이 없어 비어 있습니다. INSERT로 행을 넣으면 뷰에도 저절로 나타납니다(뷰는 원본을 비추기만 함).', 'ok');
    } },
    { name: 'INDEX', tip: '이름 열에 인덱스', run: async () => {
      if (!need(t(), '인덱스는 테이블의 열에 만듭니다. 먼저 CREATE ▸ TABLE을 눌러 주세요.') || !need(!data.index, 'idx_이름 인덱스가 이미 있습니다.')) return;
      begin('CREATE INDEX idx_이름 ON 학생 (이름);');
      await flashAll(t()!.rows.map((r) => k.get(`c:${r.id}:이름`)), p().key, 600);
      data.index = true;
      ddl();
      frame();
      await draw({ spawn: (key) => (key.startsWith('i:') ? at(`c:${key.slice(2)}:이름`) : undefined), arc: 1.6, ms: 900 });
      l.say(nrows()
        ? '이름 값만 뽑아 가나다순으로 정렬한 인덱스가 생겼습니다. 선은 원래 행을 가리키는 포인터. SELECT ▸ 이름으로 찾기를 눌러 검색이 얼마나 빨라지는지 보세요.'
        : '빈 인덱스가 생겼습니다. 행을 INSERT하면 정렬된 자리에 항목이 끼어듭니다.', 'ok');
    } },
    { name: 'DOMAIN', tip: '학년은 1~4만', run: async () => {
      if (!need(!data.domain, '학년_D 도메인이 이미 있습니다.')) return;
      const tb = t();
      const bad = tb?.rows.filter((r) => Number(r.v['학년']) > 4 || Number(r.v['학년']) < 1) ?? [];
      begin(`CREATE DOMAIN 학년_D AS INT\n  CHECK (VALUE BETWEEN 1 AND 4);${tb ? '\nALTER TABLE 학생 ALTER COLUMN 학년 TYPE 학년_D;' : ''}`);
      if (bad.length) {
        await flashAll(bad.map((r) => k.get(`c:${r.id}:학년`)), p().bad, 1000);
        l.say('이미 범위를 벗어난 학년 값이 있어 규칙을 적용할 수 없습니다. 빨간 행을 DELETE한 뒤 다시 해 보세요.', 'bad');
        return;
      }
      data.domain = true;
      if (tb) tb.cols.find((c) => c.name === '학년')!.type = '학년_D';
      ddl();
      frame();
      await draw({ spawn: (key, to) => (key === 'dcard' || key === 'dsign' ? to.clone().add(V3(0, 4, 0)) : undefined), ms: 700 });
      l.say(tb ? '학년 열 둘레에 초록 울타리(CHECK 1~4)가 섰습니다. INSERT ▸ 학년 5인 행을 넣어 보세요 — 울타리에 막힙니다.' : '도메인(값의 범위 규칙)이 생겼습니다. 이제 CREATE ▸ TABLE을 하면 학년 열의 타입이 학년_D가 됩니다.', 'ok');
    } },
  ];

  const alter: Cmd[] = [
    { name: 'ADD 주소', tip: '열 추가', run: async () => {
      if (!need(t(), '먼저 CREATE ▸ TABLE을 눌러 주세요.') || !need(!t()!.cols.some((c) => c.name === '주소'), '주소 열이 이미 있습니다. DROP COLUMN을 눌러 보세요.')) return;
      begin('ALTER TABLE 학생 ADD 주소 VARCHAR(30);');
      t()!.cols.push({ name: '주소', type: 'VARCHAR(30)', w: 1.7 });
      ddl();
      await draw({ ms: 700 });
      frame();
      l.say('모든 행 오른쪽에 주소 열이 자랐습니다. 기존 행에는 값이 없으므로 NULL(흐린 글씨)이 들어갑니다.', 'ok');
    } },
    { name: 'MODIFY 이름', tip: '열 타입 변경', run: async () => {
      if (!need(t(), '먼저 CREATE ▸ TABLE을 눌러 주세요.')) return;
      const c = t()!.cols.find((x) => x.name === '이름')!;
      const wide = c.type === 'VARCHAR(10)';
      begin(`ALTER TABLE 학생 MODIFY 이름 VARCHAR(${wide ? 20 : 10});  -- Oracle·MySQL`);
      c.type = `VARCHAR(${wide ? 20 : 10})`;
      c.w = wide ? 2.3 : 1.7;
      ddl();
      await draw({ ms: 700 });
      l.say(`이름 열의 최대 길이가 ${wide ? '10 → 20' : '20 → 10'}자로 바뀌어 열 폭이 ${wide ? '넓어졌' : '좁아졌'}습니다. ALTER는 테이블을 지우지 않고 구조만 고칩니다.`, 'ok');
    } },
    { name: 'DROP COLUMN 주소', tip: '열 삭제', run: async () => {
      if (!need(t()?.cols.some((c) => c.name === '주소'), '지울 주소 열이 없습니다. 먼저 ALTER ▸ ADD 주소를 눌러 보세요.')) return;
      begin('ALTER TABLE 학생 DROP COLUMN 주소;');
      await flashAll([k.get('h:주소'), ...t()!.rows.map((r) => k.get(`c:${r.id}:주소`))], p().bad, 600);
      t()!.cols = t()!.cols.filter((c) => c.name !== '주소');
      for (const r of t()!.rows) delete r.v['주소'];
      ddl();
      await draw({ exit: 'fall', ms: 700 });
      frame();
      l.say('주소 열이 값과 함께 통째로 무너져 사라졌습니다.', 'ok');
    } },
  ];

  async function dropTable(cascade: boolean) {
    if (!need(t(), '지울 학생 테이블이 없습니다.')) return;
    begin(`DROP TABLE 학생 ${cascade ? 'CASCADE' : 'RESTRICT'};`);
    if (!cascade && data.view) {
      await flashAll([...k.starting('vh:'), ...k.starting('v:'), k.get('vlink'), ...k.starting('h:')], p().bad, 1100);
      l.say('컴공학생 뷰가 이 테이블을 참조하고 있어 RESTRICT는 거부됩니다. CASCADE로 지우면 뷰까지 함께 지워집니다.', 'bad');
      return;
    }
    data.table = null;
    data.view = false;
    data.index = false;
    // 테이블에 준 권한도 테이블과 함께 사라진다
    privs.kim!.clear();
    privs.lee!.clear();
    ddl();
    await draw({ exit: 'fall', ms: 800 });
    frame();
    l.say(cascade ? '테이블이 무너지며 이를 참조하던 뷰와 인덱스도 함께 사라졌습니다(CASCADE). 구조와 데이터 모두 없어집니다.' : '참조하는 객체가 없어 테이블이 지워졌습니다(RESTRICT). 인덱스는 테이블에 딸려 있어 함께 사라집니다.', 'ok');
  }

  const drop: Cmd[] = [
    { name: 'TABLE … RESTRICT', tip: '참조하는 객체가 있으면 거부', run: () => dropTable(false) },
    { name: 'TABLE … CASCADE', tip: '참조하는 객체까지 함께 삭제', run: () => dropTable(true) },
    { name: 'VIEW', run: async () => {
      if (!need(data.view, '지울 뷰가 없습니다. CREATE ▸ VIEW를 먼저 눌러 보세요.')) return;
      begin('DROP VIEW 컴공학생;');
      data.view = false;
      ddl();
      await draw({ exit: 'fly', ms: 700 });
      frame();
      l.say('뷰만 사라지고 원본 테이블의 데이터는 그대로입니다(뷰는 데이터를 저장하지 않으니까요).', 'ok');
    } },
    { name: 'INDEX', run: async () => {
      if (!need(data.index, '지울 인덱스가 없습니다. CREATE ▸ INDEX를 먼저 눌러 보세요.')) return;
      begin('DROP INDEX idx_이름;');
      data.index = false;
      ddl();
      await draw({ exit: 'fall', ms: 700 });
      frame();
      l.say('인덱스가 사라졌습니다. 데이터는 그대로지만 이름 검색은 다시 처음부터 훑어야 합니다.', 'ok');
    } },
    { name: 'DOMAIN', run: async () => {
      if (!need(data.domain, '지울 도메인이 없습니다.')) return;
      begin('DROP DOMAIN 학년_D CASCADE;');
      data.domain = false;
      const c = t()?.cols.find((x) => x.name === '학년');
      if (c) c.type = 'INT';
      ddl();
      await draw({ exit: 'fall', ms: 700 });
      frame();
      l.say('도메인과 울타리가 사라졌습니다. 이제 학년 열은 아무 정수나 받습니다.', 'ok');
    } },
  ];

  // ── DML ──
  function nextRow(): Record<string, string> {
    const i = sampleAt++;
    const s = SAMPLE[i];
    if (s) return Object.fromEntries(COLS.map((c, j) => [c, s[j]!]));
    const n = 1001 + i;
    return { 학번: String(n), 이름: MORE[(i - SAMPLE.length) % MORE.length]!, 학과: ['컴공', '경영', '전자'][i % 3]!, 학년: String((i % 4) + 1) };
  }
  const insSql = (v: Record<string, string>) => {
    const extra = t()!.cols.some((c) => c.name === '주소');
    return `INSERT INTO 학생${extra ? ' (학번, 이름, 학과, 학년)' : ''}\n  VALUES (${COLS.map((c) => q(c, v[c]!)).join(', ')});`;
  };
  async function insert(v: Record<string, string>, note: string) {
    const r: Row = { id: nextId++, v };
    t()!.rows.push(r);
    touch([r.id]);
    await draw({ spawn: (key, to) => (key.startsWith(`c:${r.id}:`) ? to.clone().add(V3(0, 4.5, 0)) : undefined), ms: 700 });
    frame();
    const also = [data.view && v['학과'] === '컴공' && '뷰', data.index && '인덱스'].filter(Boolean).join('·');
    l.say(`${note}${also ? ` ${also}에도 저절로 반영됐습니다.` : ''} 노란색 = 아직 COMMIT 전(ROLLBACK하면 사라짐).`, 'ok');
  }

  const insert_: Cmd[] = [
    { name: '새 학생', run: async () => {
      if (!need(t(), 'INSERT할 테이블이 없습니다. DDL ▸ CREATE ▸ TABLE을 먼저 눌러 주세요.')) return;
      let v = nextRow();
      while (t()!.rows.some((r) => r.v['학번'] === v['학번'])) v = nextRow();
      begin(insSql(v));
      await insert(v, '새 행(튜플)이 위에서 내려와 맨 뒤에 붙었습니다.');
    } },
    { name: '학번 중복', tip: '기본키 위반', run: async () => {
      if (!need(t()?.rows.length, '먼저 새 학생을 한 명 이상 INSERT해 주세요.')) return;
      const v = { 학번: t()!.rows[0]!.v['학번']!, 이름: '홍길동', 학과: '전자', 학년: '1' };
      begin(insSql(v));
      await bounce(v, [k.get('h:학번')!, k.get(`c:${t()!.rows[0]!.id}:학번`)!]);
      l.say(`학번 ${v['학번']}은 이미 있는 기본키 값이라 거부됐습니다 — 개체 무결성(기본키는 유일하고 NULL이 아니어야 함).`, 'bad');
    } },
    { name: '학년 5', tip: '도메인(CHECK) 위반', run: async () => {
      if (!need(t(), 'INSERT할 테이블이 없습니다. CREATE ▸ TABLE을 먼저 눌러 주세요.')) return;
      let v = nextRow();
      while (t()!.rows.some((r) => r.v['학번'] === v['학번'])) v = nextRow();
      v = { ...v, 학년: '5' };
      begin(insSql(v));
      if (data.domain) {
        await bounce(v, k.starting('df:'));
        l.say('학년 5는 학년_D 도메인의 CHECK(1~4)를 벗어나 울타리에 막혔습니다 — 도메인 무결성.', 'bad');
      } else await insert(v, '도메인 규칙이 없어서 학년 5가 그냥 들어갔습니다! DDL ▸ CREATE ▸ DOMAIN으로 막아 보세요(이 행을 먼저 DELETE해야 합니다).');
    } },
  ];

  const select: Cmd[] = [
    { name: '전체 (*)', run: async () => {
      if (!need(t(), '조회할 테이블이 없습니다.')) return;
      begin('SELECT * FROM 학생;');
      const rows = await scan(() => true);
      result = { cols: t()!.cols.map((c) => c.name), rows: rows.map((r) => ({ id: r.id, v: { ...r.v } })), from: 'c' };
      frame();
      await draw({ spawn: (key) => (key.startsWith('r:') ? at(`c${key.slice(1)}`) : undefined), arc: 1.2, ms: 800 });
      l.say('모든 행·열이 복사되어 앞쪽 결과 표로 나왔습니다. SELECT는 원본을 바꾸지 않습니다.', 'ok');
    } },
    { name: "WHERE 학과='컴공'", run: async () => {
      if (!need(t(), '조회할 테이블이 없습니다.')) return;
      begin("SELECT 이름, 학년\n  FROM 학생\n  WHERE 학과 = '컴공';");
      const rows = await scan((r) => r.v['학과'] === '컴공');
      result = { cols: ['이름', '학년'], rows: rows.map((r) => ({ id: r.id, v: { ...r.v } })), from: 'c' };
      frame();
      await draw({ spawn: (key) => (key.startsWith('r:') ? at(`c${key.slice(1)}`) : undefined), arc: 1.2, ms: 800 });
      l.say(`WHERE가 한 행씩 검사해 ${rows.length}행을 고르고(선택), 이름·학년 열만 남겼습니다(투영).`, 'ok');
    } },
    { name: '이름으로 찾기', tip: '인덱스가 있을 때와 없을 때 비교', run: async () => {
      if (!need(t()?.rows.length, '찾을 행이 없습니다. 먼저 INSERT로 학생을 넣어 주세요.')) return;
      const rows = t()!.rows;
      const target = (rows.find((r) => r.v['이름'] === '정하늘') ?? rows[rows.length - 1]!).v['이름']!;
      begin(`SELECT * FROM 학생 WHERE 이름 = '${target}';`);
      const probe = w.sphere(0.17, p().key, 0.8);
      root.add(probe);
      temp.add(probe);
      let steps = 0;
      let found: Row | undefined;
      if (data.index) {
        const sorted = [...rows].sort((a, b) => ko(a.v['이름']!, b.v['이름']!));
        probe.position.copy(at('ih')!).add(V3(0, 1.2, 0));
        let lo = 0, hi = sorted.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          steps++;
          const e = k.get(`i:${sorted[mid]!.id}`)!;
          await w.move(probe, e.position.clone().add(V3(0, 0.75, 0)), 420);
          const c = ko(sorted[mid]!.v['이름']!, target);
          await w.flash(e, c === 0 ? p().good : p().ghost, 450);
          if (c === 0) { found = sorted[mid]; break; }
          if (c < 0) lo = mid + 1; else hi = mid - 1;
        }
        await w.move(probe, at(`c:${found!.id}:이름`)!.add(V3(0, 0.75, 0)), 600, 0.8);
      } else {
        probe.position.copy(at('h:이름')!).add(V3(0, 1.2, 0));
        for (const r of rows) {
          steps++;
          const o = k.get(`c:${r.id}:이름`)!;
          await w.move(probe, o.position.clone().add(V3(0, 0.75, 0)), 300);
          const hit = r.v['이름'] === target;
          await w.flash(o, hit ? p().good : p().bad, hit ? 450 : 220);
          if (hit) found = r;
        }
      }
      const os = rowObjs(found!.id);
      await Promise.all([...os.map((o) => w.hop(o, 0.4, 450)), flashAll(os, p().good, 600)]);
      temp.delete(probe);
      void w.vanish(probe, 'shrink', 300);
      result = { cols: t()!.cols.map((c) => c.name), rows: [{ id: found!.id, v: { ...found!.v } }], from: 'c' };
      frame();
      await draw({ spawn: (key) => (key.startsWith('r:') ? at(`c${key.slice(1)}`) : undefined), arc: 1.2, ms: 700 });
      l.say(data.index
        ? `인덱스(정렬됨)에서 가운데부터 반씩 좁혀 ${steps}번 만에 찾고, 포인터를 따라 행으로 바로 갔습니다.`
        : `인덱스가 없어서 ${rows.length}행을 처음부터 끝까지 모두 확인했습니다(${steps}번 비교, 전체 스캔). CREATE ▸ INDEX 후 다시 눌러 비교해 보세요.`, 'ok');
    } },
    { name: '뷰 조회', run: async () => {
      if (!need(data.view, '컴공학생 뷰가 없습니다. DDL ▸ CREATE ▸ VIEW를 먼저 눌러 주세요.')) return;
      begin('SELECT * FROM 컴공학생;');
      const vr = vrows();
      await flashAll([...k.starting('vh:'), ...k.starting('v:')], p().ghost, 500);
      await flashAll(vr.flatMap((r) => rowObjs(r.id)), p().good, 700);
      result = { cols: ['학번', '이름'], rows: vr.map((r) => ({ id: r.id, v: { ...r.v } })), from: 'v' };
      frame();
      await draw({ spawn: (key) => (key.startsWith('r:') ? at(`v${key.slice(1)}`) : undefined), arc: 1.2, ms: 700 });
      l.say('뷰를 조회하면 실제로는 뷰의 정의(SELECT … WHERE 학과=컴공)가 원본 테이블에서 실행됩니다 — 원본 행이 먼저 번쩍인 이유입니다.', 'ok');
    } },
  ];

  const update: Cmd[] = [
    { name: "학년+1 (컴공)", run: async () => {
      if (!need(t()?.rows.length, '고칠 행이 없습니다. 먼저 INSERT해 주세요.')) return;
      begin("UPDATE 학생\n  SET 학년 = 학년 + 1\n  WHERE 학과 = '컴공';");
      const hits = await scan((r) => r.v['학과'] === '컴공');
      if (!hits.length) { l.say('컴공 학생이 없어 바뀐 행이 0개입니다.', 'info'); return; }
      const over = hits.filter((r) => Number(r.v['학년']) + 1 > 4);
      if (data.domain && over.length) {
        await flashAll([...over.map((r) => k.get(`c:${r.id}:학년`)), ...k.starting('df:')], p().bad, 1100);
        l.say(`학년이 5가 되는 행이 있어 CHECK 위반 — 문장 전체가 취소되어 아무 행도 바뀌지 않았습니다(원자성).`, 'bad');
        return;
      }
      await Promise.all(hits.map((r, i) => sleep(i * 90).then(() => {
        const o = k.get(`c:${r.id}:학년`) as Group;
        const nv = String(Number(r.v['학년']) + 1);
        return w.flip(o, 650, () => w.setTop(o, nv, p().cellText));
      })));
      for (const r of hits) r.v['학년'] = String(Number(r.v['학년']) + 1);
      touch(hits.map((r) => r.id));
      await draw();
      l.say(`조건에 맞는 ${hits.length}행의 학년 칸이 뒤집히며 값이 바뀌었습니다. 노란색 = COMMIT 전.`, 'ok');
    } },
    { name: '학과 변경', run: async () => {
      const r = t()?.rows.find((x) => x.v['학과'] === '컴공') ?? t()?.rows[0];
      if (!need(r, '고칠 행이 없습니다. 먼저 INSERT해 주세요.')) return;
      const to = r!.v['학과'] === '경영' ? '전자' : '경영';
      begin(`UPDATE 학생\n  SET 학과 = '${to}'\n  WHERE 학번 = ${r!.v['학번']};`);
      const o = k.get(`c:${r!.id}:학과`) as Group;
      await flashAll(rowObjs(r!.id), p().good, 500);
      await w.flip(o, 650, () => w.setTop(o, to, p().cellText));
      const wasView = data.view && r!.v['학과'] === '컴공';
      r!.v['학과'] = to;
      touch([r!.id]);
      await draw({ exit: 'fly' });
      l.say(wasView ? `${r!.v['이름']} 학생이 더 이상 컴공이 아니어서 뷰에서 빠졌습니다 — 뷰는 원본을 그대로 비춥니다.` : '학번으로 한 행을 골라 학과를 바꿨습니다. 기본키로 고르면 정확히 한 행만 바뀝니다.', 'ok');
    } },
  ];

  const delete_: Cmd[] = [
    { name: '한 행', run: async () => {
      const r = t()?.rows[0];
      if (!need(r, '지울 행이 없습니다. 먼저 INSERT해 주세요.')) return;
      begin(`DELETE FROM 학생\n  WHERE 학번 = ${r!.v['학번']};`);
      await flashAll(rowObjs(r!.id), p().bad, 700);
      t()!.rows = t()!.rows.filter((x) => x !== r);
      dirty.delete(r!.id);
      pending++;
      await draw({ exit: 'fall', ms: 700 });
      frame();
      l.say('행이 무너져 사라지고 뒤의 행들이 앞으로 당겨졌습니다. COMMIT 전이라 ROLLBACK하면 돌아옵니다.', 'ok');
    } },
    { name: '전체 행', run: async () => {
      if (!need(t()?.rows.length, '지울 행이 없습니다.')) return;
      begin('DELETE FROM 학생;');
      await flashAll(k.starting('c:'), p().bad, 600);
      t()!.rows = [];
      pending++;
      await draw({ exit: 'fall', ms: 800 });
      frame();
      l.say('WHERE가 없으면 모든 행이 지워집니다. 구조는 남고, TRUNCATE와 달리 ROLLBACK으로 되돌릴 수 있습니다 — TCL ▸ ROLLBACK을 눌러 보세요.', 'ok');
    } },
  ];

  // ── DCL ──
  async function showUsers() {
    if (users) return;
    users = true;
    frame();
    await draw({ spawn: (key, to) => (key.startsWith('u') ? to.clone().add(V3(0, 3, 0)) : undefined), ms: 600 });
  }
  async function give(u: string, pv: string[], go: boolean, by: string) {
    for (const x of pv) privs[u]!.set(x, { go, by });
    await draw({ spawn: (key) => (key.startsWith(`k:${u}:`) ? at(`u:${by}`)!.add(V3(0, 2.4, 0)) : undefined), arc: 2.2, ms: 900 });
  }
  async function take(u: string, pv: string[], cascade: boolean) {
    const gone: string[] = [];
    for (const x of pv) if (privs[u]!.delete(x)) gone.push(`k:${u}:${x}`);
    if (cascade) for (const [x, o] of [...privs.lee!]) if (u === 'kim' && o.by === 'kim' && pv.includes(x)) { privs.lee!.delete(x); gone.push(`k:lee:${x}`); }
    const back = at('u:DBA')!.add(V3(0, 2.4, 0));
    await Promise.all(gone.map((kk, i) => sleep(i * 250).then(() => (k.get(kk) ? w.move(k.get(kk)!, back, 800, 1.8) : undefined))));
    await draw({ exit: 'shrink' });
    return gone.length;
  }
  async function attempt(u: string) {
    begin(`-- ${u}(으)로 접속해서\nSELECT * FROM 학생;`);
    const ok = privs[u]!.has('SELECT') && t();
    const from = at(`u:${u}`)!.add(V3(0, 1.3, 0));
    const ball = w.sphere(0.2, ok ? p().good : p().bad, 0.8);
    ball.position.copy(from);
    root.add(ball);
    temp.add(ball);
    const target = t() ? V3(0, 0.8, -0.6) : V3(0, 0.8, 0);
    if (ok) {
      await w.move(ball, target, 700, 1);
      await flashAll(k.starting('c:'), p().good, 700);
      l.say(`${u}에게 SELECT 권한(열쇠)이 있어 조회에 성공했습니다.`, 'ok');
    } else {
      const wall = w.block(3.2, 1.6, 0.12, p().bad, undefined, { opacity: 0.45 });
      wall.position.copy(target).setY(0).add(V3(0, 0, -0.9));
      root.add(wall);
      temp.add(wall);
      void w.pop(wall, 300);
      await w.move(ball, target.clone().add(V3(0, 0, -1.3)), 600, 0.6);
      await w.flash(wall, p().bad, 500);
      await Promise.all([w.vanish(ball, 'fall', 600), w.vanish(wall, 'shrink', 600)]);
      temp.delete(ball);
      temp.delete(wall);
      l.say(t() ? `${u}에게 SELECT 권한이 없어 막혔습니다(권한 부족 오류). GRANT로 열쇠를 줘 보세요.` : '조회할 학생 테이블이 없습니다.', 'bad');
      return;
    }
    temp.delete(ball);
    await w.vanish(ball, 'shrink', 300);
  }

  const grant: Cmd[] = [
    { name: 'SELECT → kim', run: async () => {
      if (!need(t(), '권한을 줄 학생 테이블이 없습니다. CREATE ▸ TABLE을 먼저 눌러 주세요.')) return;
      await showUsers();
      begin('GRANT SELECT ON 학생 TO kim;');
      await give('kim', ['SELECT'], false, 'DBA');
      l.say('DBA가 kim에게 학생 테이블 SELECT 권한(초록 열쇠)을 줬습니다. kim은 이 열쇠를 다른 사람에게 줄 수는 없습니다.', 'ok');
    } },
    { name: 'WITH GRANT OPTION', tip: '받은 권한을 남에게 줄 수 있게', run: async () => {
      if (!need(t(), '권한을 줄 학생 테이블이 없습니다.')) return;
      await showUsers();
      begin('GRANT SELECT ON 학생 TO kim\n  WITH GRANT OPTION;');
      await give('kim', ['SELECT'], true, 'DBA');
      l.say('노란 열쇠 = WITH GRANT OPTION. kim이 이 권한을 다른 사용자에게 다시 줄 수 있습니다. "kim → lee"를 눌러 보세요.', 'ok');
    } },
    { name: 'kim → lee', tip: 'kim이 lee에게 권한 전달', run: async () => {
      if (!need(t(), '학생 테이블이 없습니다.')) return;
      await showUsers();
      begin('-- kim(으)로 접속해서\nGRANT SELECT ON 학생 TO lee;');
      if (!privs.kim!.get('SELECT')?.go) {
        await w.flash(k.get('u:kim')!.children[0]!, p().bad, 900);
        l.say('kim에게 WITH GRANT OPTION이 없어서 거부됐습니다. 받은 권한을 남에게 주려면 노란 열쇠가 필요합니다.', 'bad');
        return;
      }
      await give('lee', ['SELECT'], false, 'kim');
      l.say('kim이 받은 권한을 lee에게 넘겨줬습니다. 이제 REVOKE ▸ kim CASCADE를 해 보면 lee의 열쇠도 같이 회수됩니다.', 'ok');
    } },
    { name: 'INSERT, UPDATE → kim', run: async () => {
      if (!need(t(), '학생 테이블이 없습니다.')) return;
      await showUsers();
      begin('GRANT INSERT, UPDATE ON 학생 TO kim;');
      await give('kim', ['INSERT', 'UPDATE'], false, 'DBA');
      l.say('권한은 여러 개를 쉼표로 한 번에 줄 수 있습니다. ALL PRIVILEGES는 모든 권한입니다.', 'ok');
    } },
  ];
  const revoke: Cmd[] = [
    { name: 'kim SELECT … CASCADE', run: async () => {
      if (!need(privs.kim!.has('SELECT'), 'kim에게 SELECT 권한이 없습니다. GRANT부터 해 보세요.')) return;
      begin('REVOKE SELECT ON 학생 FROM kim CASCADE;');
      const leeHad = privs.lee!.get('SELECT')?.by === 'kim';
      await take('kim', ['SELECT'], true);
      l.say(leeHad ? 'kim의 열쇠가 DBA에게 돌아가고, kim이 lee에게 나눠 준 열쇠도 연쇄적으로 회수됐습니다(CASCADE).' : 'kim의 SELECT 열쇠가 DBA에게 돌아갔습니다. 이제 kim의 조회는 막힙니다.', 'ok');
    } },
    { name: 'kim INSERT, UPDATE', run: async () => {
      if (!need(privs.kim!.has('INSERT') || privs.kim!.has('UPDATE'), 'kim에게 INSERT·UPDATE 권한이 없습니다.')) return;
      begin('REVOKE INSERT, UPDATE ON 학생 FROM kim;');
      await take('kim', ['INSERT', 'UPDATE'], false);
      l.say('INSERT·UPDATE 권한을 회수했습니다. 다른 권한(SELECT)은 그대로 남습니다.', 'ok');
    } },
  ];
  const tryCmd: Cmd[] = [
    { name: 'kim이 조회', run: async () => { await showUsers(); await attempt('kim'); } },
    { name: 'lee가 조회', run: async () => { await showUsers(); await attempt('lee'); } },
  ];

  // ── TCL ──
  async function restore(s: Snap, how: string) {
    data = clone(s.data);
    dirty = new Set(s.dirty);
    pending = s.pending;
    const used = new Set(t()?.rows.map((r) => r.id));
    await draw({ exit: (key) => (key.startsWith('c:') && !used.has(Number(key.split(':')[1])) ? 'fly' : 'shrink'), ms: 800 });
    frame();
    l.say(how, 'ok');
  }
  const rollback = (): Cmd[] => [
    { name: '마지막 COMMIT까지', run: async () => {
      begin('ROLLBACK;');
      if (!pending) { l.say('되돌릴 변경이 없습니다(이미 모두 COMMIT됨). INSERT·UPDATE·DELETE를 한 뒤 눌러 보세요.', 'info'); return; }
      sps = [];
      await restore(commit, '마지막 COMMIT 이후의 변경이 모두 취소됐습니다. 넣은 행은 날아가고 지운 행은 돌아왔습니다. (DDL은 자동 COMMIT이라 되돌려지지 않음)');
    } },
    ...sps.map((s, i): Cmd => ({ name: `TO ${s.name}`, run: async () => {
      begin(`ROLLBACK TO ${s.name};`);
      sps = sps.slice(0, i + 1);
      await restore(s.s, `세이브포인트 ${s.name} 이후의 변경만 취소됐습니다. ${s.name} 이전의 변경은 아직 COMMIT 전으로 남아 있습니다.`);
    } })),
  ];
  const tcl: Cmd[] = [
    { name: 'COMMIT', run: async () => {
      begin('COMMIT;');
      if (!pending) { l.say('확정할 변경이 없습니다. INSERT·UPDATE·DELETE를 한 뒤 눌러 보세요.', 'info'); return; }
      await flashAll([...dirty].flatMap((id) => rowObjs(id)), p().good, 800);
      dirty.clear();
      pending = 0;
      sps = [];
      commit = snap();
      await draw();
      l.say('노란 변경이 모두 확정됐습니다(지속성). 이제 ROLLBACK해도 이 상태보다 앞으로는 돌아가지 않습니다. 세이브포인트도 사라집니다.', 'ok');
    } },
    { name: 'ROLLBACK', sub: rollback },
    { name: 'SAVEPOINT', run: async () => {
      if (!need(t(), '먼저 테이블을 만들고 행을 넣어 보세요.')) return;
      const name = 'ABCDEFGH'[sps.length] ?? `S${sps.length}`;
      begin(`SAVEPOINT ${name};`);
      sps.push({ name, s: snap(), z: nrows() });
      await draw({ spawn: (key, to) => (key === `sp:${name}` ? to.clone().add(V3(0, 3, 0)) : undefined) });
      l.say(`지금 상태에 깃발 ${name}을 꽂았습니다. 더 바꾼 뒤 ROLLBACK ▸ TO ${name}을 누르면 여기까지만 되돌아옵니다.`, 'ok');
    } },
  ];

  const truncate = async () => {
    if (!need(t(), '비울 테이블이 없습니다.')) return;
    begin('TRUNCATE TABLE 학생;');
    t()!.rows = [];
    ddl();
    await draw({ exit: 'fall', ms: 800 });
    frame();
    l.say('구조(열)는 남기고 모든 행을 한꺼번에 비웠습니다. DELETE보다 빠르지만 자동 COMMIT되어 ROLLBACK할 수 없습니다(Oracle 기준).', 'ok');
  };

  async function reset() {
    for (const o of temp) w.remove(o);
    temp.clear();
    data = { table: null, view: false, index: false, domain: false };
    dirty = new Set();
    pending = 0;
    sps = [];
    result = null;
    users = false;
    privs.kim!.clear();
    privs.lee!.clear();
    nextId = 1;
    sampleAt = 0;
    commit = snap();
    await draw({ exit: 'shrink' });
    frame();
  }
  void draw();
  frame();

  return {
    hint: 'DDL ▸ CREATE ▾ ▸ TABLE부터 눌러 보세요. 생긴 블록을 누르면 무엇인지 설명이 나옵니다.',
    reset,
    groups: [
      { name: 'DDL', en: '정의어', hue: 215, cmds: [
        { name: 'CREATE', tip: '객체 만들기', sub: create },
        { name: 'ALTER', tip: '구조 고치기', sub: alter },
        { name: 'DROP', tip: '객체 지우기', sub: drop },
        { name: 'TRUNCATE', tip: '모든 행 비우기', run: truncate },
      ] },
      { name: 'DML', en: '조작어', hue: 28, cmds: [
        { name: 'SELECT', sub: select },
        { name: 'INSERT', sub: insert_ },
        { name: 'UPDATE', sub: update },
        { name: 'DELETE', sub: delete_ },
      ] },
      { name: 'DCL', en: '제어어', hue: 150, cmds: [
        { name: 'GRANT', sub: grant },
        { name: 'REVOKE', sub: revoke },
        { name: '권한 확인', tip: '사용자로 조회해 보기', sub: tryCmd },
      ] },
      { name: 'TCL', en: '트랜잭션 제어', hue: 280, cmds: tcl },
    ],
  };
}

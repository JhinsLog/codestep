// 조인·관계대수 3D 실습: 두 표의 행이 짝을 찾아 선으로 이어지고, 결과 표의 칸이 원래 칸에서 날아와 모인다.
import { Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import type { Want } from './keyed';
import { base, flashAll, hopAll, rowOf, type Base } from './kit';
import { lab, type Lab } from './lab';
import { CD, CH, PITCH, V3, Y0, colW, tLayout } from './tables';
import { TabStage, cellKey, cols, rows, type SRow, type STable } from './tabStage';
import type { Info } from './world';

const JI: Record<string, Info> = {
  link: { title: '조인 조건', sub: '학생.학과코드 = 학과.학과코드', body: '선은 조인 조건을 만족하는 짝입니다. 내부 조인은 짝이 있는 행만 결과에 남기고, 외부 조인은 짝이 없는 쪽도 NULL로 채워 남깁니다.' },
  res: { title: '조인 결과', sub: 'Result', body: '두 표의 칸이 날아와 한 행으로 합쳐졌습니다. 흐린 NULL은 짝이 없어서 비어 있는 칸입니다.' },
};

interface Pair { a?: SRow; b?: SRow }

/** 결과 표를 만든다: spec = [결과 열 이름, 어느 쪽(a|b), 원래 열] */
function result(st: TabStage, A: STable, B: STable, pairs: Pair[], spec: [string, 'a' | 'b', string][], z: number, name = '결과'): STable {
  return {
    key: 'res', name, kind: '', tone: 'result', x: 0, z, info: JI.res,
    cols: spec.map(([n]) => ({ name: n, w: n.length > 5 ? 1.75 : 1.35 })),
    rows: pairs.map((p) => {
      const v: Record<string, string | null> = {}, from: Record<string, string> = {};
      for (const [n, side, c] of spec) {
        const r = side === 'a' ? p.a : p.b;
        v[n] = r?.v[c] ?? null;
        if (r) from[n] = cellKey(side === 'a' ? A.key : B.key, r.id, c);
      }
      return { id: `${p.a?.id ?? 'x'}-${p.b?.id ?? 'x'}`, v, from };
    }),
  };
}

/** 두 칸을 잇는 선 */
function linkWant(b: Base, st: TabStage, key: string, a: [string, string, string], z: [string, string, string], color: number, side: 'r' | 'l' = 'r'): Want | null {
  const ta = st.get(a[0]), tb = st.get(z[0]);
  if (!ta || !tb) return null;
  const La = tLayout(ta), Lb = tLayout(tb);
  const ia = ta.rows.findIndex((r) => r.id === a[1]), ib = tb.rows.findIndex((r) => r.id === z[1]);
  const ca = ta.cols.findIndex((c) => c.name === a[2]), cb = tb.cols.findIndex((c) => c.name === z[2]);
  if (ia < 0 || ib < 0 || ca < 0 || cb < 0) return null;
  const s = side === 'r' ? 1 : -1;
  const p = V3(La.xs[ca]! + (s * colW(ta.cols[ca]!)) / 2, Y0 + CH + 0.06, La.rz(ia));
  const q = V3(Lb.xs[cb]! - (s * colW(tb.cols[cb]!)) / 2, Y0 + CH + 0.06, Lb.rz(ib));
  return { key, kind: 'obj', pos: p.clone().add(q).multiplyScalar(0.5), sig: `${p.toArray()}|${q.toArray()}|${color}`, make: () => b.w.bar(p, q, color, 0.035, 0.8), info: JI.link };
}

export function joinLab(): Viz {
  return lab({ title: '조인 3D', en: 'INNER · OUTER · CROSS · NATURAL · SELF JOIN', height: 520, setup: (l: Lab) => {
    const b = base(l);
    const { w, k } = b;
    const st = new TabStage(b);
    let links: [string, string, string, string, string, string, number][] = [];
    let mode = '';
    st.extra = () => links.map(([ta, ia, ca, tb, ib, cb, color], i) => linkWant(b, st, `ln:${i}:${ia}:${ib}`, [ta, ia, ca], [tb, ib, cb], color)).filter(Boolean) as Want[];
    const P = () => w.pal;

    const A = (): STable => ({ key: 'A', name: '학생', x: -3.9, z: 0, cols: cols(['학번', 1.2], ['이름', 1.3], ['학과코드', 1.45, 'fk']), rows: rows(['학번', '이름', '학과코드'], [['1001', '김철수', 'D1'], ['1002', '이영희', 'D2'], ['1003', '박민수', 'D1'], ['1004', '최지은', 'D4']], 'a') });
    const B = (): STable => ({ key: 'B', name: '학과', x: 3.4, z: 0, cols: cols(['학과코드', 1.45, 'pk'], ['학과명', 1.3]), rows: rows(['학과코드', '학과명'], [['D1', '컴공'], ['D2', '경영'], ['D3', '전자']], 'b') });
    const RZ = 4 * PITCH + 2.9;

    async function base2() {
      links = [];
      st.drop('res');
      if (mode !== 'ab') {
        mode = 'ab';
        st.tables = [A(), B()];
        await st.draw({ exit: 'shrink' });
        st.fit();
      } else await st.draw({ ms: 350 });
    }

    async function join(kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' | 'NATURAL' | 'EQUI') {
      await base2();
      const a = st.get('A')!, bb = st.get('B')!;
      const on = 'ON 학생.학과코드 = 학과.학과코드';
      l.code({
        INNER: `SELECT 학번, 이름, 학생.학과코드, 학과명\nFROM 학생 INNER JOIN 학과\n  ${on};`,
        LEFT: `SELECT 학번, 이름, 학생.학과코드, 학과명\nFROM 학생 LEFT OUTER JOIN 학과\n  ${on};`,
        RIGHT: `SELECT 학번, 이름, 학과.학과코드, 학과명\nFROM 학생 RIGHT OUTER JOIN 학과\n  ${on};`,
        FULL: `SELECT 학번, 이름, 학과코드, 학과명\nFROM 학생 FULL OUTER JOIN 학과\n  ${on};`,
        CROSS: 'SELECT * FROM 학생 CROSS JOIN 학과;',
        NATURAL: 'SELECT * FROM 학생 NATURAL JOIN 학과;',
        EQUI: 'SELECT * FROM 학생, 학과\n  WHERE 학생.학과코드 = 학과.학과코드;',
      }[kind]);
      const pairs: Pair[] = [];
      const usedB = new Set<string>();
      if (kind === 'CROSS') {
        for (const x of a.rows) {
          await hopAll(w, rowOf(k, 'A', x.id), 0.3, 300);
          for (const y of bb.rows) { links.push(['A', x.id, '학과코드', 'B', y.id, '학과코드', P().ghost]); pairs.push({ a: x, b: y }); }
          await st.draw({ ms: 250 });
        }
      } else {
        for (const x of a.rows) {
          await hopAll(w, rowOf(k, 'A', x.id), 0.35, 380);
          const m = bb.rows.filter((y) => y.v['학과코드'] === x.v['학과코드']);
          if (m.length) {
            for (const y of m) { usedB.add(y.id); links.push(['A', x.id, '학과코드', 'B', y.id, '학과코드', P().good]); pairs.push({ a: x, b: y }); }
            await st.draw({ ms: 300 });
            await flashAll(w, m.flatMap((y) => rowOf(k, 'B', y.id)), P().good, 450);
          } else {
            await flashAll(w, rowOf(k, 'A', x.id), kind === 'LEFT' || kind === 'FULL' ? P().warn : P().bad, 600);
            if (kind === 'LEFT' || kind === 'FULL') pairs.push({ a: x });
          }
        }
        if (kind === 'RIGHT' || kind === 'FULL') {
          for (const y of bb.rows.filter((y) => !usedB.has(y.id))) {
            await Promise.all([hopAll(w, rowOf(k, 'B', y.id), 0.35, 380), flashAll(w, rowOf(k, 'B', y.id), P().warn, 600)]);
            pairs.push({ b: y });
          }
        }
      }
      const spec: [string, 'a' | 'b', string][] =
        kind === 'EQUI' || kind === 'CROSS' ? [['학번', 'a', '학번'], ['이름', 'a', '이름'], ['학생.학과코드', 'a', '학과코드'], ['학과.학과코드', 'b', '학과코드'], ['학과명', 'b', '학과명']]
          : kind === 'RIGHT' ? [['학번', 'a', '학번'], ['이름', 'a', '이름'], ['학과코드', 'b', '학과코드'], ['학과명', 'b', '학과명']]
            : [['학번', 'a', '학번'], ['이름', 'a', '이름'], ['학과코드', 'a', '학과코드'], ['학과명', 'b', '학과명']];
      const res = result(st, a, bb, pairs, spec, RZ);
      if (kind === 'FULL') res.rows.forEach((r, i) => { if (!r.v['학과코드'] && pairs[i]!.b) { r.v['학과코드'] = pairs[i]!.b!.v['학과코드']!; r.from!['학과코드'] = cellKey('B', pairs[i]!.b!.id, '학과코드'); } });
      res.hi = new Map(res.rows.flatMap((r) => Object.entries(r.v).filter(([, v]) => v === null).map(([c]) => [`${r.id}:${c}`, P().pend] as [string, number])));
      st.set(res);
      await st.draw({ ms: 900 });
      st.fit();
      const n = res.rows.length;
      l.say({
        INNER: `학과코드가 같은 짝이 있는 행만 ${n}행 남았습니다. 최지은(D4)과 전자(D3)는 짝이 없어 빠졌습니다.`,
        LEFT: `왼쪽(학생)은 모두 남고 짝이 없는 최지은은 학과명이 NULL로 채워졌습니다 → ${n}행.`,
        RIGHT: `오른쪽(학과)은 모두 남고 학생이 없는 전자(D3)는 학번·이름이 NULL로 채워졌습니다 → ${n}행.`,
        FULL: `양쪽 모두 남습니다. 짝이 없는 최지은과 전자가 NULL과 함께 들어갔습니다 → ${n}행 (LEFT ∪ RIGHT).`,
        CROSS: `조건 없이 모든 조합: 학생 ${a.rows.length}행 × 학과 ${bb.rows.length}행 = ${n}행(카티션 곱). 차수는 ${a.cols.length} + ${bb.cols.length} = 5.`,
        NATURAL: `같은 이름의 열(학과코드)로 자동으로 = 조인하고, 그 열을 한 번만 보여 줍니다 → ${n}행.`,
        EQUI: `= 조건으로 조인(동등 조인)하면 학과코드가 양쪽에서 와서 두 번 나옵니다. 하나로 합치면 자연 조인. = 외의 비교(<, > …)까지 포함하면 세타 조인.`,
      }[kind], 'ok');
    }

    async function self() {
      links = [];
      mode = 'self';
      const E = (key: string, name: string, x: number, ghost = false): STable => ({ key, name, x, z: 0, tone: ghost ? 'ghost' : undefined, cols: cols(['사번', 1.15, 'pk'], ['이름', 1.3], ['상사사번', 1.5, 'fk']), rows: rows(['사번', '이름', '상사사번'], [['E1', '김대표', null], ['E2', '이부장', 'E1'], ['E3', '박과장', 'E2'], ['E4', '최대리', 'E2']], 'e') });
      st.tables = [E('A', '사원 직원', -3.6), E('B', '사원 상사', 3.6, true)];
      await st.draw({ exit: 'shrink' });
      st.fit();
      l.code('SELECT 직원.이름, 상사.이름\nFROM 사원 직원 JOIN 사원 상사\n  ON 직원.상사사번 = 상사.사번;');
      const a = st.get('A')!, bb = st.get('B')!;
      const pairs: Pair[] = [];
      for (const x of a.rows) {
        await hopAll(w, rowOf(k, 'A', x.id), 0.35, 380);
        const y = bb.rows.find((r) => r.v['사번'] === x.v['상사사번']);
        if (y) { links.push(['A', x.id, '상사사번', 'B', y.id, '사번', P().good]); pairs.push({ a: x, b: y }); await st.draw({ ms: 300 }); await flashAll(w, rowOf(k, 'B', y.id), P().good, 450); }
        else await flashAll(w, rowOf(k, 'A', x.id), P().bad, 500);
      }
      st.set(result(st, a, bb, pairs, [['직원', 'a', '이름'], ['상사', 'b', '이름']], RZ));
      await st.draw({ ms: 900 });
      st.fit();
      l.say('같은 사원 테이블을 별명(직원, 상사) 두 개로 불러 자기 자신과 조인했습니다(셀프 조인). 오른쪽 반투명 표는 실제로는 같은 테이블입니다.', 'ok');
    }

    async function reset() { mode = ''; links = []; st.tables = []; await base2(); }
    void reset();

    return {
      hint: '조인 종류를 눌러 보세요. 학생 행이 하나씩 학과에서 짝을 찾고, 결과 표가 앞쪽에 만들어집니다.',
      reset,
      groups: [
        { name: '내부 조인', en: 'Inner', hue: 150, cmds: [
          { name: 'INNER', run: () => join('INNER') },
          { name: 'EQUI', tip: '동등 조인', run: () => join('EQUI') },
          { name: 'NATURAL', tip: '자연 조인', run: () => join('NATURAL') },
        ] },
        { name: '외부 조인', en: 'Outer', hue: 30, cmds: [
          { name: 'LEFT', run: () => join('LEFT') },
          { name: 'RIGHT', run: () => join('RIGHT') },
          { name: 'FULL', run: () => join('FULL') },
        ] },
        { name: '기타', en: 'Etc', hue: 270, cmds: [
          { name: 'CROSS', tip: '카티션 곱', run: () => join('CROSS') },
          { name: 'SELF', tip: '셀프 조인', run: self },
        ] },
      ],
    };
  } });
}

// ───────────────────────── 관계대수 ─────────────────────────

const RA: Record<string, Info> = {
  res: { title: '연산 결과', sub: '릴레이션', body: '관계대수 연산의 결과도 릴레이션입니다. 그래서 결과에 다시 연산을 이어 붙일 수 있습니다(폐쇄성).' },
};

export function relAlgLab(): Viz {
  return lab({ title: '관계대수 3D', en: 'σ π ⋈ ÷ ∪ ∩ − ×', height: 500, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    const st = new TabStage(b);
    let scene = '';
    const P = () => w.pal;
    const STU = (): STable => ({ key: 'S', name: '학생', x: 0, z: 0, cols: cols(['학번', 1.2], ['이름', 1.3], ['학과', 1.2], ['학년', 1.1]), rows: rows(['학번', '이름', '학과', '학년'], [['1001', '김철수', '컴공', '3'], ['1002', '이영희', '경영', '2'], ['1003', '박민수', '컴공', '1'], ['1004', '최지은', '전자', '4'], ['1005', '정하늘', '컴공', '2']], 's') });
    const CLUB = (key: string, name: string, x: number, names: string[]): STable => ({ key, name, x, z: 0, cols: cols(['이름', 1.4]), rows: rows(['이름'], names.map((n) => [n]), key.toLowerCase()) });
    const RZ = (n: number) => n * PITCH + 2.6;

    async function setScene(id: string, tables: STable[]) {
      st.drop('res');
      if (scene !== id) { scene = id; st.tables = tables; await st.draw({ exit: 'shrink' }); st.fit(); }
      else await st.draw({ ms: 350 });
    }
    const res = (cs: [string, number?][], rs: SRow[], z: number, x = 0): STable => ({ key: 'res', name: '결과', kind: '', tone: 'result', x, z, cols: cols(...cs), rows: rs, info: RA.res });
    const from = (t: string, r: SRow, cs: string[]) => Object.fromEntries(cs.map((c) => [c, cellKey(t, r.id, c)]));

    /** 중복이라 합쳐지는 칸: 원래 자리에서 결과의 같은 값 칸으로 날아가 사라진다 */
    async function merge(srcKeys: string[], dstKey: string) {
      const dst = k.get(dstKey);
      if (!dst) return;
      await Promise.all(srcKeys.map(async (sk, i) => {
        const s = k.get(sk);
        if (!s) return;
        const g = w.block(1.35, CH, CD, P().pend, { text: (s.userData.top as { text: string }).text, color: P().cellText });
        g.position.copy(s.position);
        root.add(g);
        b.temp.add(g);
        await sleep(i * 120);
        await w.move(g, dst.position.clone().add(new Vector3(0, 0.05, 0)), 800, 1);
        await w.flash(dst, P().warn, 400);
        b.temp.delete(g);
        await w.vanish(g, 'shrink', 300);
      }));
    }

    const ops: Record<string, () => Promise<void>> = {
      async select() {
        await setScene('S', [STU()]);
        l.code("σ 학과='컴공' (학생)\n-- SQL: SELECT * FROM 학생 WHERE 학과 = '컴공';");
        const t = st.get('S')!;
        const hit: SRow[] = [];
        for (const r of t.rows) {
          await hopAll(w, rowOf(k, 'S', r.id), 0.3, 330);
          const ok = r.v['학과'] === '컴공';
          await flashAll(w, rowOf(k, 'S', r.id), ok ? P().good : P().bad, ok ? 450 : 260);
          if (ok) hit.push(r);
        }
        st.set(res([['학번', 1.2], ['이름', 1.3], ['학과', 1.2], ['학년', 1.1]], hit.map((r) => ({ id: r.id, v: { ...r.v }, from: from('S', r, t.cols.map((c) => c.name)) })), RZ(t.rows.length)));
        await st.draw({ ms: 900 }); st.fit();
        l.say(`σ(셀렉트)는 조건에 맞는 행(튜플)만 고릅니다 — 수평 연산. ${hit.length}행, 열은 그대로.`, 'ok');
      },
      async project() {
        await setScene('S', [STU()]);
        l.code('π 학과 (학생)\n-- SQL: SELECT DISTINCT 학과 FROM 학생;');
        const t = st.get('S')!;
        await hopAll(w, k.matching((kk) => kk === 'S:h:학과' || (kk.startsWith('S:c:') && kk.endsWith(':학과'))), 0.4, 600);
        const seen = new Map<string, SRow>(), dup: SRow[] = [];
        for (const r of t.rows) (seen.has(r.v['학과']!) ? dup.push(r) : seen.set(r.v['학과']!, r));
        st.set(res([['학과', 1.3]], [...seen.values()].map((r) => ({ id: r.id, v: { 학과: r.v['학과']! }, from: from('S', r, ['학과']) })), RZ(t.rows.length)));
        await st.draw({ ms: 900 });
        for (const r of dup) await merge([cellKey('S', r.id, '학과')], cellKey('res', seen.get(r.v['학과']!)!.id, '학과'));
        st.fit();
        l.say(`π(프로젝트)는 원하는 열(속성)만 고릅니다 — 수직 연산. 같은 값의 행은 하나로 합쳐져 ${seen.size}행이 됩니다(중복 제거).`, 'ok');
      },
      async join() {
        const D: STable = { key: 'D', name: '학과정보', x: 5.4, z: 0, cols: cols(['학과', 1.2, 'pk'], ['건물', 1.2]), rows: rows(['학과', '건물'], [['컴공', '공학관'], ['경영', '경영관'], ['전자', '공학관']], 'd') };
        const S0 = STU(); S0.x = -2.6;
        await setScene('SJ', [S0, D]);
        l.code('학생 ⋈ 학과정보\n-- 자연 조인: 같은 이름의 열(학과)이 같은 행끼리 합친다');
        const t = st.get('S')!, d = st.get('D')!;
        const out: SRow[] = [];
        for (const r of t.rows) {
          await hopAll(w, rowOf(k, 'S', r.id), 0.3, 300);
          const m = d.rows.find((x) => x.v['학과'] === r.v['학과'])!;
          await flashAll(w, rowOf(k, 'D', m.id), P().good, 380);
          out.push({ id: r.id, v: { ...r.v, 건물: m.v['건물']! }, from: { ...from('S', r, ['학번', '이름', '학과', '학년']), 건물: cellKey('D', m.id, '건물') } });
        }
        st.set(res([['학번', 1.2], ['이름', 1.3], ['학과', 1.2], ['학년', 1.1], ['건물', 1.3]], out, RZ(t.rows.length), -0.6));
        await st.draw({ ms: 900 }); st.fit();
        l.say('⋈(조인)은 공통 속성(학과)이 같은 튜플끼리 하나로 합칩니다. 자세한 종류는 "조인" 개념에서 해 보세요.', 'ok');
      },
      async division() {
        const E: STable = { key: 'E', name: '수강', x: -2.4, z: 0, cols: cols(['학번', 1.2], ['과목', 1.2]), rows: rows(['학번', '과목'], [['1001', 'DB'], ['1001', 'OS'], ['1002', 'DB'], ['1003', 'DB'], ['1003', 'OS'], ['1003', 'NW']], 'e') };
        const Q: STable = { key: 'Q', name: '필수', x: 3, z: 0, cols: cols(['과목', 1.2]), rows: rows(['과목'], [['DB'], ['OS']], 'q') };
        await setScene('DIV', [E, Q]);
        l.code('수강 ÷ 필수\n-- 필수 과목(DB, OS)을 "모두" 들은 학번');
        const e = st.get('E')!, q = st.get('Q')!;
        const ids = [...new Set(e.rows.map((r) => r.v['학번']!))];
        const out: SRow[] = [];
        for (const id of ids) {
          const mine = e.rows.filter((r) => r.v['학번'] === id);
          await hopAll(w, mine.flatMap((r) => rowOf(k, 'E', r.id)), 0.35, 400);
          let all = true;
          for (const need of q.rows) {
            const has = mine.find((r) => r.v['과목'] === need.v['과목']);
            await Promise.all([flashAll(w, rowOf(k, 'Q', need.id), has ? P().good : P().bad, 420), has ? flashAll(w, rowOf(k, 'E', has.id), P().good, 420) : Promise.resolve()]);
            if (!has) all = false;
          }
          if (all) out.push({ id: mine[0]!.id, v: { 학번: id }, from: { 학번: cellKey('E', mine[0]!.id, '학번') } });
        }
        st.set(res([['학번', 1.3]], out, RZ(e.rows.length), 0.3));
        await st.draw({ ms: 900 }); st.fit();
        l.say(`÷(디비전)은 오른쪽 릴레이션의 값을 "모두" 가진 것만 남깁니다. 1002는 OS가 없어서 빠지고 ${out.map((r) => r.v['학번']).join(', ')}만 남았습니다. 결과에는 나누는 쪽 속성(과목)이 빠집니다.`, 'ok');
      },
      async union() { await setOp('∪'); },
      async inter() { await setOp('∩'); },
      async minus() { await setOp('−'); },
      async cross() {
        const A2: STable = { key: 'A', name: '학생', x: -2.2, z: 0, cols: cols(['이름', 1.4]), rows: rows(['이름'], [['김철수'], ['이영희']], 'a') };
        const B2: STable = { key: 'B', name: '과목', x: 2.2, z: 0, cols: cols(['과목', 1.2]), rows: rows(['과목'], [['DB'], ['OS'], ['NW']], 'b') };
        await setScene('X', [A2, B2]);
        l.code('학생 × 과목\n-- 카티션 곱: 모든 조합');
        const a = st.get('A')!, c = st.get('B')!;
        const out: SRow[] = [];
        for (const x of a.rows) {
          await hopAll(w, rowOf(k, 'A', x.id), 0.35, 350);
          for (const y of c.rows) {
            await flashAll(w, rowOf(k, 'B', y.id), P().ghost, 220);
            out.push({ id: `${x.id}${y.id}`, v: { 이름: x.v['이름']!, 과목: y.v['과목']! }, from: { 이름: cellKey('A', x.id, '이름'), 과목: cellKey('B', y.id, '과목') } });
          }
        }
        st.set(res([['이름', 1.4], ['과목', 1.2]], out, RZ(3)));
        await st.draw({ ms: 900 }); st.fit();
        l.say(`×(카티션 곱)은 모든 조합: 카디널리티 2 × 3 = ${out.length}, 차수 1 + 1 = 2. (카디널리티는 곱하고 차수는 더한다)`, 'ok');
      },
    };

    async function setOp(op: '∪' | '∩' | '−') {
      await setScene('SET', [CLUB('A', '축구부', -2.4, ['김철수', '이영희', '박민수']), CLUB('B', '야구부', 2.4, ['이영희', '최지은'])]);
      l.code(`축구부 ${op} 야구부\n-- SQL: ${{ '∪': 'UNION', '∩': 'INTERSECT', '−': 'EXCEPT (MINUS)' }[op]}`);
      const a = st.get('A')!, c = st.get('B')!;
      const inB = (r: SRow) => c.rows.some((y) => y.v['이름'] === r.v['이름']);
      const inA = (r: SRow) => a.rows.some((x) => x.v['이름'] === r.v['이름']);
      for (const r of a.rows) await flashAll(w, rowOf(k, 'A', r.id), inB(r) ? P().warn : op === '∩' ? P().bad : P().good, 380);
      for (const r of c.rows) await flashAll(w, rowOf(k, 'B', r.id), inA(r) ? P().warn : op === '∪' ? P().good : P().bad, 380);
      const out: SRow[] = op === '∪' ? [...a.rows, ...c.rows.filter((r) => !inA(r))].map((r) => ({ id: r.id, v: { ...r.v }, from: { 이름: cellKey(a.rows.includes(r) ? 'A' : 'B', r.id, '이름') } }))
        : op === '∩' ? a.rows.filter(inB).map((r) => ({ id: r.id, v: { ...r.v }, from: { 이름: cellKey('A', r.id, '이름') } }))
          : a.rows.filter((r) => !inB(r)).map((r) => ({ id: r.id, v: { ...r.v }, from: { 이름: cellKey('A', r.id, '이름') } }));
      st.set(res([['이름', 1.4]], out, RZ(3)));
      await st.draw({ ms: 900 });
      if (op !== '−') for (const r of c.rows.filter(inA)) { const same = out.find((x) => x.v['이름'] === r.v['이름']); if (same) await merge([cellKey('B', r.id, '이름')], cellKey('res', same.id, '이름')); }
      st.fit();
      l.say({
        '∪': `합집합: 둘 중 어디에든 있는 사람. 양쪽에 다 있는 이영희는 한 번만 → ${out.length}명. 두 릴레이션의 속성 구성이 같아야(합병 가능) 합니다.`,
        '∩': `교집합: 양쪽에 모두 있는 사람 → ${out.map((r) => r.v['이름']).join(', ')}.`,
        '−': `차집합: 축구부에만 있고 야구부에는 없는 사람 → ${out.map((r) => r.v['이름']).join(', ')}. 순서를 바꾸면(야구부 − 축구부) 결과가 달라집니다.`,
      }[op], 'ok');
    }

    async function reset() { scene = ''; await setScene('S', [STU()]); }
    void reset();

    return {
      hint: '연산 단추를 눌러 보세요. 결과 릴레이션이 앞쪽에 만들어집니다.',
      reset,
      groups: [
        { name: '순수 관계 연산', en: 'Relational', hue: 215, cmds: [
          { name: 'σ 셀렉트', tip: 'SELECT: 행 고르기', run: ops.select },
          { name: 'π 프로젝트', tip: 'PROJECT: 열 고르기', run: ops.project },
          { name: '⋈ 조인', tip: 'JOIN', run: ops.join },
          { name: '÷ 디비전', tip: 'DIVISION', run: ops.division },
        ] },
        { name: '일반 집합 연산', en: 'Set', hue: 30, cmds: [
          { name: '∪ 합집합', run: ops.union },
          { name: '∩ 교집합', run: ops.inter },
          { name: '− 차집합', run: ops.minus },
          { name: '× 카티션 곱', run: ops.cross },
        ] },
      ],
    };
  } });
}

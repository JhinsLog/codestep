// DB 3D 실습판 1: 릴레이션 구조(용어), 키, 무결성 제약 조건
import { sleep, type Viz } from '../core';
import type { Want } from './keyed';
import { base, bounceRow, bounds, colOf, dropIn, flashAll, hopAll, rowOf } from './kit';
import { lab } from './lab';
import { CD, FK, PITCH, V3, Y0, tLayout, tableWants, type TCol, type TRow, type TView } from './tables';
import { hex, type Info } from './world';

const rowsOf = (cols: string[], data: string[][], pre = 'r'): TRow[] =>
  data.map((d, i) => ({ id: `${pre}${i}`, v: Object.fromEntries(cols.map((c, j) => [c, d[j] ?? null])) }));
const floorTag = (key: string, x: number, z: number, text: string, color: number, info?: Info): Want =>
  ({ key, kind: 'sign', pos: V3(x, 0.22, z), runs: [{ text, color: '#ffffff', weight: 800, size: 38 }], height: 0.36, bg: hex(color), info });

// ───────────────────────── 릴레이션 구조 ─────────────────────────

const RT: Record<string, Info> = {
  rel: { title: '릴레이션 (Relation)', sub: '= 테이블', body: '행과 열로 된 표 하나가 릴레이션입니다. 릴레이션 = 스키마(틀) + 인스턴스(그 안의 튜플들).' },
  head: { title: '속성 (Attribute)', sub: '= 열 · 필드', body: '세로 한 줄. 데이터의 가장 작은 논리적 단위이고, 속성의 수가 차수(Degree)입니다.\n\n맨 앞 줄 블록들(속성 이름의 모임)이 릴레이션 스키마입니다.' },
  cell: { title: '튜플 (Tuple)', sub: '= 행 · 레코드', body: '가로 한 줄. 튜플의 수가 카디널리티(Cardinality)입니다. 한 칸에는 더 나눌 수 없는 원자값 하나만 들어갑니다.' },
  dom: { title: '도메인 (Domain)', sub: '속성이 가질 수 있는 값의 집합', body: '학년 속성의 도메인은 {1, 2, 3, 4}. 이 밖의 값은 들어올 수 없습니다(도메인 무결성).' },
};

export function relTermsLab(): Viz {
  return lab({ title: '릴레이션 구조 3D', en: 'Relation · Tuple · Attribute · Degree · Cardinality', height: 460, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const C0: TCol[] = [{ name: '학번', key: 'pk', w: 1.3 }, { name: '이름', w: 1.5 }, { name: '학과', w: 1.4 }, { name: '학년', w: 1.2 }];
    const R0 = [['1001', '김철수', '컴공', '3'], ['1002', '이영희', '경영', '2'], ['1003', '박민수', '컴공', '1'], ['1004', '최지은', '전자', '4']];
    const MORE = [['1005', '정하늘', '컴공', '2'], ['1006', '한별', '경영', '1'], ['1007', '서지안', '전자', '3']];
    let cols: TCol[] = [], rows: TRow[] = [], hi = new Map<string, number>();
    let deg = 0, card = 0, dom = false, schema = false, more = 0;
    const view = (): TView => ({ key: 's', name: '학생', kind: '릴레이션', cols, rows, x: 0, z: 0, hi, info: RT.rel, headInfo: () => RT.head, cellInfo: (_r, c) => (c.name === '학년' && dom ? RT.dom : RT.cell) });
    function want(): Want[] {
      const P = w.pal;
      const t = view();
      const L = tLayout(t);
      const out = tableWants(w, t);
      for (let i = 0; i < Math.min(deg, cols.length); i++) out.push(floorTag(`d:${i}`, L.xs[i]!, L.z1 + 0.5, String(i + 1), P.accent, RT.head));
      if (deg) out.push({ key: 'd:sum', kind: 'sign', pos: V3(L.x1 + 1.5, 0.3, L.z1 + 0.5), runs: [{ text: '차수 = ', color: P.muted, size: 40 }, { text: String(Math.min(deg, cols.length)), color: P.text, weight: 800 }], height: 0.5, bg: hex(P.slab), info: RT.head });
      for (let i = 0; i < Math.min(card, rows.length); i++) out.push(floorTag(`c:${i}`, L.x0 - 0.55, L.rz(i), String(i + 1), P.good, RT.cell));
      if (card) out.push({ key: 'c:sum', kind: 'sign', pos: V3(L.x0 - 1.6, 0.3, L.z1 + 0.5), runs: [{ text: '카디널리티 = ', color: P.muted, size: 40 }, { text: String(Math.min(card, rows.length)), color: P.text, weight: 800 }], height: 0.5, bg: hex(P.slab), info: RT.cell });
      if (schema) out.push({ key: 'schema', kind: 'sign', pos: V3(0, 1.95, -0.3), runs: [{ text: '학생(', color: P.text, weight: 800 }, { text: cols.map((c) => c.name).join(', '), color: P.text }, { text: ')', color: P.text, weight: 800 }], height: 0.5, bg: hex(P.pend), info: RT.head });
      if (dom) {
        const x = L.x1 + 2.3;
        out.push({ key: 'dom', kind: 'block', pos: V3(x, 0, 0.6), size: [2.6, 0.22, 1.3], color: P.good, text: '{1, 2, 3, 4}', textColor: '#ffffff', info: RT.dom });
        out.push({ key: 'dom:s', kind: 'sign', pos: V3(x, 0.85, 0.6), runs: [{ text: '도메인 ', color: P.muted, size: 38 }, { text: '학년', color: P.text, weight: 800 }], height: 0.42, info: RT.dom });
      }
      return out;
    }
    const draw = (o = {}) => k.sync(want(), o);
    const fit = () => { const [x0, x1, z0, z1] = bounds([view()]); w.fit(x0 - (card ? 2.4 : 0), x1 + (dom || deg ? 3.6 : 0), z0 - (schema ? 0.8 : 0), z1 + 0.8); };
    w.onRepaint = () => void draw({ ms: 0 });
    const P = () => w.pal;
    const only = async (m: Map<string, number>) => { hi = m; await draw({ ms: 350 }); };

    async function reset() {
      cols = C0.map((c) => ({ ...c }));
      rows = rowsOf(C0.map((c) => c.name), R0);
      hi = new Map(); deg = 0; card = 0; dom = false; schema = false; more = 0;
      await draw({ exit: 'shrink' });
      fit();
    }
    void reset();

    const countUp = async (which: 'deg' | 'card') => {
      const n = which === 'deg' ? cols.length : rows.length;
      for (let i = 1; i <= n; i++) {
        if (which === 'deg') deg = i; else card = i;
        await draw({ ms: 260 });
        await hopAll(w, which === 'deg' ? colOf(k, 's', cols[i - 1]!.name) : rowOf(k, 's', rows[i - 1]!.id), 0.3, 260);
      }
      fit();
    };

    return {
      hint: '단추를 눌러 표의 어느 부분이 무엇인지 확인해 보세요. 블록을 누르면 설명이 나옵니다.',
      reset,
      groups: [
        { name: '구조', en: 'Structure', hue: 215, cmds: [
          { name: '릴레이션', run: async () => { l.code('릴레이션 = 스키마 + 인스턴스'); await only(new Map()); await flashAll(w, k.starting('s:'), P().accent, 900); l.say('표 전체가 릴레이션(테이블)입니다. 틀(스키마)과 내용(인스턴스)으로 이루어집니다.', 'ok'); } },
          { name: '스키마', run: async () => {
            l.code(`학생(${cols.map((c) => c.name).join(', ')})`);
            schema = true;
            await only(new Map(cols.map((c) => [`h:${c.name}`, P().warn] as [string, number])));
            await hopAll(w, k.starting('s:h:'), 0.35, 500);
            l.say('속성 이름들로 된 틀 = 릴레이션 스키마(내포, intension). 시간이 지나도 거의 바뀌지 않습니다.', 'ok');
          } },
          { name: '인스턴스', run: async () => {
            l.code('{ (1001, 김철수, …), (1002, 이영희, …), … }');
            await only(new Map(rows.map((r) => [`r:${r.id}`, P().pend] as [string, number])));
            await hopAll(w, k.starting('s:c:'), 0.3, 500);
            l.say('어느 순간 들어 있는 튜플들의 집합 = 릴레이션 인스턴스(외연, extension). INSERT·DELETE로 계속 바뀝니다.', 'ok');
          } },
          { name: '튜플', run: async () => {
            const r = rows[1] ?? rows[0]!;
            l.code(`(${cols.map((c) => r.v[c.name] ?? 'NULL').join(', ')})`);
            await only(new Map([[`r:${r.id}`, P().warn]]));
            await hopAll(w, rowOf(k, 's', r.id), 0.5, 600);
            l.say('가로 한 줄 = 튜플(행, 레코드). 튜플의 개수가 카디널리티입니다.', 'ok');
          } },
          { name: '속성', run: async () => {
            l.code('이름 VARCHAR(10)');
            await only(new Map([['c:이름', P().warn]]));
            await hopAll(w, colOf(k, 's', '이름'), 0.5, 600);
            l.say('세로 한 줄 = 속성(열, 필드). 속성의 개수가 차수입니다.', 'ok');
          } },
          { name: '도메인', run: async () => {
            l.code('학년의 도메인 = {1, 2, 3, 4}');
            dom = true;
            await only(new Map([['c:학년', P().good]]));
            fit();
            await sleep(300);
            await flashAll(w, [k.get('dom')], P().good, 700);
            l.say('도메인은 한 속성이 가질 수 있는 값들의 집합입니다. 학년 칸의 값은 모두 {1, 2, 3, 4} 안에 있어야 합니다.', 'ok');
          } },
        ] },
        { name: '세기', en: 'Count', hue: 150, cmds: [
          { name: '차수', tip: 'Degree: 속성 수', run: async () => { l.code('차수(Degree) = 속성(열)의 수'); deg = 0; await only(new Map()); await countUp('deg'); l.say(`속성(열)을 하나씩 세어 차수 = ${cols.length}. 튜플이 늘어도 차수는 그대로입니다.`, 'ok'); } },
          { name: '카디널리티', tip: 'Cardinality: 튜플 수', run: async () => { l.code('카디널리티(Cardinality) = 튜플(행)의 수'); card = 0; await only(new Map()); await countUp('card'); l.say(`튜플(행)을 하나씩 세어 카디널리티 = ${rows.length}. 차수(${cols.length})와 헷갈리지 마세요.`, 'ok'); } },
          { name: '튜플 추가', run: async () => {
            const d = MORE[more++ % MORE.length]!;
            const r: TRow = { id: `m${more}`, v: Object.fromEntries(cols.map((c, j) => [c.name, d[C0.findIndex((x) => x.name === c.name)] ?? null])) };
            l.code(`INSERT INTO 학생 VALUES (${cols.map((c) => r.v[c.name] ?? 'NULL').join(', ')});`);
            rows.push(r);
            if (card) card = rows.length;
            await draw({ spawn: dropIn((key) => key.startsWith(`s:c:${r.id}:`)), ms: 650 });
            fit();
            l.say(`튜플이 하나 늘어 카디널리티 = ${rows.length}, 차수는 그대로 ${cols.length}입니다.`, 'ok');
          } },
          { name: '속성 추가', run: async () => {
            if (cols.some((c) => c.name === '연락처')) { l.say('이미 연락처 속성이 있습니다. 처음부터를 눌러 다시 해 보세요.', 'bad'); return; }
            l.code('ALTER TABLE 학생 ADD 연락처 VARCHAR(13);');
            cols.push({ name: '연락처', w: 1.6 });
            if (deg) deg = cols.length;
            await draw({ ms: 650 });
            fit();
            l.say(`속성이 하나 늘어 차수 = ${cols.length}, 카디널리티는 그대로 ${rows.length}입니다. 기존 튜플의 새 칸은 NULL.`, 'ok');
          } },
        ] },
        { name: '성질', en: 'Properties', hue: 30, cmds: [
          { name: '튜플 순서 섞기', run: async () => {
            l.code('-- 튜플의 순서는 의미가 없다');
            rows = [...rows.slice(1), rows[0]!].reverse();
            await draw({ ms: 900 });
            l.say('튜플의 순서를 바꿔도 같은 릴레이션입니다. 릴레이션은 튜플의 "집합"이라 순서가 없습니다.', 'ok');
          } },
          { name: '속성 순서 섞기', run: async () => {
            l.code('-- 속성의 순서도 의미가 없다');
            cols = [...cols.slice(1), cols[0]!];
            await draw({ ms: 900 });
            l.say('속성(열)의 순서가 바뀌어도 같은 릴레이션입니다. 속성은 순서가 아니라 이름으로 구별합니다.', 'ok');
          } },
          { name: '중복 튜플', run: async () => {
            const r = rows[0]!;
            l.code(`INSERT INTO 학생 VALUES (${cols.map((c) => r.v[c.name] ?? 'NULL').join(', ')});`);
            await bounceRow(b, view(), r.v, rowOf(k, 's', r.id));
            l.say('똑같은 튜플은 두 개일 수 없습니다(튜플의 유일성). 그래서 기본키로 각 튜플을 구별합니다.', 'bad');
          } },
          { name: '원자값', run: async () => {
            const v: Record<string, string | null> = Object.fromEntries(cols.map((c) => [c.name, null]));
            Object.assign(v, { 학번: '1009', 이름: '오다인', 학과: '컴공,경영', 학년: '2' });
            l.code("INSERT INTO 학생 VALUES (1009, '오다인', '컴공,경영', 2);");
            await bounceRow(b, view(), v, colOf(k, 's', '학과'));
            l.say('한 칸에 값 두 개(컴공, 경영)는 안 됩니다. 속성 값은 더 나눌 수 없는 원자값이어야 합니다 — 제1정규형(1NF).', 'bad');
          } },
        ] },
      ],
    };
  } });
}

// ───────────────────────── 키 ─────────────────────────

const KI: Record<string, Info> = {
  super: { title: '슈퍼키 (Super Key)', sub: '유일성 ○ · 최소성 ✕', body: '속성들을 묶었을 때 모든 튜플을 구별할 수 있으면(유일성) 슈퍼키입니다. 군더더기 속성이 섞여 있어도 됩니다. 예: {학번, 이름}' },
  cand: { title: '후보키 (Candidate Key)', sub: '유일성 ○ · 최소성 ○', body: '튜플을 구별할 수 있는 최소한의 속성 집합. 하나라도 빼면 구별이 안 됩니다. 예: {학번}, {주민번호}' },
  pk: { title: '기본키 (Primary Key)', sub: '후보키 중 대표', body: '후보키 중에서 고른 대표 키. NULL이 될 수 없고 중복될 수 없습니다(개체 무결성).' },
  ak: { title: '대체키 (Alternate Key)', sub: '기본키가 아닌 후보키', body: '후보키였지만 기본키로 뽑히지 않은 나머지. 예: 학번이 기본키면 주민번호가 대체키.' },
  fk: { title: '외래키 (Foreign Key)', sub: '다른 릴레이션의 기본키를 참조', body: '학생.학과코드는 학과 릴레이션의 기본키 학과코드를 참조합니다. 참조하는 쪽에는 상대에 실제로 있는 값이나 NULL만 들어갈 수 있습니다(참조 무결성).' },
};

export function keysLab(): Viz {
  return lab({ title: '키 찾기 3D', en: 'Super · Candidate · Primary · Alternate · Foreign Key', height: 470, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const SC = ['학번', '주민번호', '이름', '학과코드'];
    const SR = [['1001', '050301-3', '김민지', 'D1'], ['1002', '041122-4', '이서준', 'D2'], ['1003', '050715-3', '김민지', 'D1'], ['1004', '030208-4', '박하은', 'D3']];
    const DR = [['D1', '컴공'], ['D2', '경영'], ['D3', '전자']];
    let hi = new Map<string, number>(), dhi = new Map<string, number>();
    let roles = new Map<string, [string, number]>();
    let fk = false, pk = false;
    const scols = (): TCol[] => [{ name: '학번', w: 1.25, key: pk ? 'pk' : undefined }, { name: '주민번호', w: 1.9 }, { name: '이름', w: 1.35 }, { name: '학과코드', w: 1.45, key: fk ? 'fk' : undefined }];
    const srows = rowsOf(SC, SR, 's');
    const drows = rowsOf(['학과코드', '학과명'], DR, 'd');
    const st = (): TView => ({ key: 'st', name: '학생', cols: scols(), rows: srows, x: -2.3, z: 0, hi, headInfo: (c) => (c.name === '학과코드' && fk ? KI.fk! : roles.get(c.name) ? KI[roles.get(c.name)![0]] : undefined), info: KI.cand });
    const dt = (): TView => ({ key: 'dp', name: '학과', cols: [{ name: '학과코드', w: 1.45, key: fk ? 'pk' : undefined }, { name: '학과명', w: 1.3 }], rows: drows, x: 4.2, z: 0, hi: dhi, info: KI.fk });
    function want(): Want[] {
      const P = w.pal;
      const s = st(), d = dt();
      const L = tLayout(s), D = tLayout(d);
      const out = [...tableWants(w, s), ...tableWants(w, d)];
      s.cols.forEach((c, i) => { const r = roles.get(c.name); if (r) out.push(floorTag(`role:${c.name}`, L.xs[i]!, L.z1 + 0.5, r[0] === 'pk' ? '기본키' : r[0] === 'ak' ? '대체키' : r[0] === 'cand' ? '후보키' : r[0] === 'super' ? '슈퍼키' : '✕', r[1], KI[r[0]])); });
      if (fk) {
        out.push(floorTag('role:fk', L.xs[3]!, L.z1 + 1.05, '외래키 → 학과', FK, KI.fk));
        srows.forEach((r, i) => {
          const di = drows.findIndex((x) => x.v['학과코드'] === r.v['학과코드']);
          const a = V3(L.xs[3]! + 0.72, Y0 + 0.36, L.rz(i)), z = V3(D.xs[0]! - 0.72, Y0 + 0.36, D.rz(di));
          out.push({ key: `fk:${r.id}`, kind: 'obj', pos: a.clone().add(z).multiplyScalar(0.5), sig: `${a.toArray()}|${z.toArray()}`, make: () => w.bar(a, z, FK, 0.03, 0.75), info: KI.fk });
        });
      }
      return out;
    }
    const draw = (o = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const P = () => w.pal;
    const fit = () => { const [x0, x1, z0, z1] = bounds([st(), dt()]); w.fit(x0, x1, z0, z1 + 1.2); };

    /** 고른 속성 조합으로 행을 구별할 수 있는지 한 쌍씩 비교 */
    const uniq = (set: string[]) => {
      const seen = new Map<string, string>();
      for (const r of srows) {
        const key = set.map((c) => r.v[c]).join('|');
        if (seen.has(key)) return [seen.get(key)!, r.id];
        seen.set(key, r.id);
      }
      return null;
    };
    async function test(set: string[], quiet = false): Promise<boolean> {
      hi = new Map(set.map((c) => [`c:${c}`, P().pend] as [string, number]));
      await draw({ ms: 300 });
      await hopAll(w, set.flatMap((c) => colOf(k, 'st', c)), 0.3, 450);
      const dup = uniq(set);
      if (dup) {
        for (const id of dup) for (const c of set) hi.set(`${id}:${c}`, P().bad);
        await draw({ ms: 300 });
        await flashAll(w, dup.flatMap((id) => set.map((c) => k.get(`st:c:${id}:${c}`))), P().bad, 900);
        if (!quiet) l.say(`✕ 유일성 없음: {${set.join(', ')}} 값이 같은 튜플이 둘 있어 구별하지 못합니다 → 키가 될 수 없습니다.`, 'bad');
        return false;
      }
      await flashAll(w, set.flatMap((c) => colOf(k, 'st', c, false)), P().good, 700);
      return true;
    }
    async function check(set: string[]) {
      l.code(`-- {${set.join(', ')}}로 모든 튜플을 구별할 수 있나?`);
      if (!(await test(set))) return;
      if (set.length === 1) { l.say(`✓ 유일성: ${set[0]}만으로 모든 튜플이 구별됩니다. 한 속성이라 더 줄일 수도 없으니(최소성) 후보키입니다.`, 'ok'); return; }
      // 최소성: 하나씩 빼 보고도 구별되면 군더더기가 있는 것
      for (const drop of set) {
        const rest = set.filter((c) => c !== drop);
        await sleep(350);
        l.code(`-- ${drop}을(를) 빼도 {${rest.join(', ')}}로 구별되나?`);
        if (!uniq(rest)) {
          hi = new Map([...rest.map((c) => [`c:${c}`, P().good] as [string, number]), [`c:${drop}`, P().slab]]);
          await draw({ ms: 400 });
          l.say(`✓ 유일성은 있지만 ✕ 최소성 없음: ${drop}을(를) 빼도 {${rest.join(', ')}}로 구별됩니다 → 슈퍼키이지만 후보키는 아닙니다.`, 'info');
          return;
        }
      }
      l.say(`✓ 유일성 ✓ 최소성: {${set.join(', ')}}는 후보키입니다.`, 'ok');
    }

    async function reset() {
      hi = new Map(); dhi = new Map(); roles = new Map(); fk = false; pk = false;
      await draw({ exit: 'shrink' });
      fit();
    }
    void reset();

    return {
      hint: '유일성 검사 ▾에서 속성 조합을 골라 보세요. 같은 값의 튜플이 있으면 키가 될 수 없습니다.',
      reset,
      groups: [
        { name: '검사', en: 'Test', hue: 215, cmds: [
          { name: '유일성 검사', sub: [['학번'], ['주민번호'], ['이름'], ['이름', '학과코드'], ['학번', '이름']].map((set) => ({ name: `{${set.join(', ')}}`, run: () => check(set) })) },
          { name: '후보키 찾기', run: async () => {
            roles = new Map();
            l.code('-- 속성 하나씩 유일성 검사');
            for (const c of SC) {
              const ok = await test([c], true);
              roles.set(c, ok ? ['cand', P().good] : ['x', P().bad]);
              await draw({ ms: 300 });
              await sleep(250);
            }
            hi = new Map([['c:학번', P().good], ['c:주민번호', P().good]]);
            roles.delete('이름'); roles.delete('학과코드');
            await draw({ ms: 400 });
            l.say('학번과 주민번호는 각각 혼자서 모든 튜플을 구별합니다 → 후보키 2개. 이름(김민지 2명)·학과코드(D1 2개)는 안 됩니다.', 'ok');
          } },
        ] },
        { name: '키 정하기', en: 'Keys', hue: 40, cmds: [
          { name: '슈퍼키', run: async () => {
            const sets = [['학번', '이름'], ['주민번호', '학과코드'], ['학번', '주민번호', '이름', '학과코드']];
            for (const s of sets) {
              l.code(`슈퍼키 예: {${s.join(', ')}}`);
              roles = new Map(s.map((c) => [c, ['super', P().accent]] as [string, [string, number]]));
              hi = new Map(s.map((c) => [`c:${c}`, P().ghost] as [string, number]));
              await draw({ ms: 350 });
              await hopAll(w, s.flatMap((c) => colOf(k, 'st', c)), 0.3, 500);
              await sleep(500);
            }
            l.say('후보키(학번 또는 주민번호)를 포함하면 무엇을 더 붙여도 구별은 됩니다 → 슈퍼키. 전체 속성 집합도 항상 슈퍼키입니다.', 'ok');
          } },
          { name: '기본키 · 대체키', run: async () => {
            l.code('CREATE TABLE 학생 (\n  학번 CHAR(4) PRIMARY KEY,\n  주민번호 CHAR(8) UNIQUE, …);');
            pk = true;
            roles = new Map([['학번', ['pk', P().key]], ['주민번호', ['ak', 0x0d9488]]]);
            hi = new Map([['c:주민번호', 0x99f6e4]]);
            await draw({ ms: 500 });
            await hopAll(w, colOf(k, 'st', '학번'), 0.5, 600);
            l.say('후보키 중 학번을 대표로 고르면 기본키(노란색), 남은 주민번호는 대체키가 됩니다. 기본키는 NULL·중복 불가.', 'ok');
          } },
          { name: '외래키', run: async () => {
            l.code('학과코드 CHAR(2) REFERENCES 학과(학과코드)');
            fk = true;
            pk = true;
            hi = new Map();
            await draw({ ms: 600 });
            fit();
            await flashAll(w, k.starting('fk:'), FK, 900);
            l.say('학생.학과코드(보라)가 학과 릴레이션의 기본키를 가리킵니다. 외래키 값은 반드시 학과에 있는 값이거나 NULL이어야 합니다.', 'ok');
          } },
        ] },
        { name: '위반해 보기', en: 'Violation', hue: 0, cmds: [
          { name: '없는 학과코드', run: async () => {
            fk = true; pk = true; await draw({ ms: 300 });
            l.code("INSERT INTO 학생 VALUES ('1005', '060101-3', '정하늘', 'D9');");
            await bounceRow(b, st(), { 학번: '1005', 주민번호: '060101-3', 이름: '정하늘', 학과코드: 'D9' }, [...k.starting('dp:h:'), ...colOf(k, 'dp', '학과코드', false)]);
            l.say('학과에 D9가 없어서 거부됩니다 — 참조 무결성 위반. 외래키는 실제로 있는 값만 가리킬 수 있습니다.', 'bad');
          } },
          { name: '기본키 NULL', run: async () => {
            pk = true; await draw({ ms: 300 });
            l.code("INSERT INTO 학생 VALUES (NULL, '060101-3', '정하늘', 'D1');");
            await bounceRow(b, st(), { 학번: null, 주민번호: '060101-3', 이름: '정하늘', 학과코드: 'D1' }, colOf(k, 'st', '학번'));
            l.say('기본키에 NULL은 들어갈 수 없습니다 — 개체 무결성 위반.', 'bad');
          } },
        ] },
      ],
    };
  } });
}

// ───────────────────────── 무결성 ─────────────────────────

const IN: Record<string, Info> = {
  entity: { title: '개체 무결성', sub: 'Entity Integrity', body: '기본키는 NULL일 수 없고 중복될 수 없습니다. 각 튜플을 반드시 구별할 수 있어야 하니까요.' },
  ref: { title: '참조 무결성', sub: 'Referential Integrity', body: '외래키 값은 참조하는 릴레이션의 기본키에 실제로 있는 값이거나 NULL이어야 합니다.\n\n부모 행을 지울 때의 선택: RESTRICT(자식이 있으면 거부), CASCADE(자식도 함께 삭제), SET NULL(자식의 외래키를 NULL로).' },
  domain: { title: '도메인 무결성', sub: 'Domain Integrity', body: '속성 값은 정해진 타입·범위(도메인) 안에 있어야 합니다. 초록 울타리가 CHECK (학년 BETWEEN 1 AND 4)입니다.' },
};

export function integrityLab(): Viz {
  return lab({ title: '무결성 제약 조건 3D', en: 'Entity · Referential · Domain Integrity', height: 470, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const D0 = [['D1', '컴공'], ['D2', '경영'], ['D3', '전자']];
    const S0 = [['1001', '김철수', 'D1', '3'], ['1002', '이영희', 'D2', '2'], ['1003', '박민수', 'D1', '1'], ['1004', '최지은', 'D3', '4']];
    let drows: TRow[] = [], srows: TRow[] = [], hi = new Map<string, number>(), dhi = new Map<string, number>();
    let n = 0;
    const dt = (): TView => ({ key: 'dp', name: '학과', kind: '부모', cols: [{ name: '학과코드', key: 'pk', w: 1.45 }, { name: '학과명', w: 1.3 }], rows: drows, x: 4.9, z: 0, hi: dhi, info: IN.ref, headInfo: (c) => (c.key ? IN.entity : undefined) });
    const st = (): TView => ({ key: 'st', name: '학생', kind: '자식', cols: [{ name: '학번', key: 'pk', w: 1.25 }, { name: '이름', w: 1.4 }, { name: '학년', w: 1.15 }, { name: '학과코드', key: 'fk', w: 1.45 }], rows: srows, x: -1.9, z: 0, hi, info: IN.entity, headInfo: (c) => (c.key === 'pk' ? IN.entity : c.key === 'fk' ? IN.ref : c.name === '학년' ? IN.domain : undefined), cellInfo: (_r, c) => (c.key === 'fk' ? IN.ref : c.name === '학년' ? IN.domain : undefined) });
    function want(): Want[] {
      const P = w.pal;
      const s = st(), d = dt();
      const L = tLayout(s), D = tLayout(d);
      const out = [...tableWants(w, d), ...tableWants(w, s)];
      srows.forEach((r, i) => {
        const di = drows.findIndex((x) => x.v['학과코드'] === r.v['학과코드']);
        if (di < 0) return;
        const a = V3(L.xs[3]! + 0.72, Y0 + 0.36, L.rz(i)), z = V3(D.xs[0]! - 0.72, Y0 + 0.36, D.rz(di));
        out.push({ key: `fk:${r.id}`, kind: 'obj', pos: a.clone().add(z).multiplyScalar(0.5), sig: `${a.toArray()}|${z.toArray()}`, make: () => w.bar(a, z, FK, 0.03, 0.7), info: IN.ref });
      });
      // 학년 울타리 (CHECK 1~4)
      const cx = L.xs[2]!, cw = 1.15 + 0.2, z0 = -CD / 2 - 0.12, z1 = srows.length * PITCH + CD / 2 + 0.12, zc = (z0 + z1) / 2, len = z1 - z0;
      for (const [key, x, z, sx, sz] of [['l', cx - cw / 2, zc, 0.07, len], ['r', cx + cw / 2, zc, 0.07, len], ['f', cx, z1, cw, 0.07], ['b', cx, z0, cw, 0.07]] as [string, number, number, number, number][])
        out.push({ key: `fence:${key}`, kind: 'block', pos: V3(x, 0, z), size: [sx, 0.75, sz], color: P.good, opacity: 0.55, info: IN.domain });
      out.push(floorTag('fence:t', cx, L.z1 + 0.55, 'CHECK 1~4', P.good, IN.domain));
      return out;
    }
    const draw = (o = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const P = () => w.pal;
    const fit = () => { const [x0, x1, z0, z1] = bounds([st(), dt()]); w.fit(x0, x1, z0, z1 + 0.9); };
    const ins = (v: string[]) => `INSERT INTO 학생 VALUES (${v.map((x, i) => (x === 'NULL' || i === 3 ? x : `'${x}'`)).join(', ')});`;
    const nextNo = () => String(1005 + n++);

    async function reset() {
      drows = rowsOf(['학과코드', '학과명'], D0, 'd');
      srows = rowsOf(['학번', '이름', '학과코드', '학년'], S0, 's'); // 열 순서는 st()가 정한다
      hi = new Map(); dhi = new Map(); n = 0;
      await draw({ exit: 'shrink' });
      fit();
    }
    void reset();

    async function delParent(mode: 'RESTRICT' | 'CASCADE' | 'SET NULL') {
      const d = drows.find((r) => r.v['학과코드'] === 'D1');
      if (!d) { l.say('D1 학과가 이미 지워졌습니다. 처음부터를 눌러 주세요.', 'bad'); return; }
      const kids = srows.filter((r) => r.v['학과코드'] === 'D1');
      l.code(`-- 학생.학과코드 … REFERENCES 학과 ON DELETE ${mode}\nDELETE FROM 학과 WHERE 학과코드 = 'D1';`);
      await flashAll(w, rowOf(k, 'dp', d.id), P().bad, 600);
      await flashAll(w, [...kids.flatMap((r) => rowOf(k, 'st', r.id)), ...kids.map((r) => k.get(`fk:${r.id}`))], P().warn, 700);
      if (mode === 'RESTRICT' && kids.length) {
        await flashAll(w, rowOf(k, 'dp', d.id), P().bad, 900);
        l.say(`D1을 참조하는 학생이 ${kids.length}명 있어 삭제가 거부됐습니다(RESTRICT). 자식부터 지우거나 다른 옵션을 써야 합니다.`, 'bad');
        return;
      }
      drows = drows.filter((r) => r !== d);
      if (mode === 'CASCADE') srows = srows.filter((r) => !kids.includes(r));
      if (mode === 'SET NULL') for (const r of kids) { r.v['학과코드'] = null; hi.set(`${r.id}:학과코드`, P().pend); }
      await draw({ exit: 'fall', ms: 800 });
      l.say(mode === 'CASCADE' ? `D1이 지워지면서 이를 참조하던 학생 ${kids.length}명도 연쇄 삭제됐습니다(CASCADE).` : mode === 'SET NULL' ? `D1이 지워지고, 참조하던 학생의 학과코드는 NULL이 됐습니다(SET NULL). 외래키는 NULL을 허용합니다.` : '참조하는 자식이 없어 바로 지워졌습니다.', 'ok');
    }

    return {
      hint: '위반해 보기 단추로 규칙을 어기는 행을 넣어 보세요. 어느 규칙에 막히는지 빨갛게 보입니다.',
      reset,
      groups: [
        { name: '개체 무결성', en: 'Entity', hue: 40, cmds: [
          { name: '기본키 NULL', run: async () => { const v = ['NULL', '정하늘', 'D2', '1']; l.code(ins(v)); await bounceRow(b, st(), { 학번: null, 이름: v[1]!, 학과코드: v[2]!, 학년: v[3]! }, colOf(k, 'st', '학번')); l.say('기본키(학번)가 NULL이면 튜플을 구별할 수 없어 거부됩니다 — 개체 무결성.', 'bad'); } },
          { name: '기본키 중복', run: async () => { const v = [srows[0]?.v['학번'] ?? '1001', '정하늘', 'D2', '1']; l.code(ins(v)); await bounceRow(b, st(), { 학번: v[0]!, 이름: v[1]!, 학과코드: v[2]!, 학년: v[3]! }, [...colOf(k, 'st', '학번').slice(0, 1), ...(srows[0] ? rowOf(k, 'st', srows[0].id) : [])]); l.say(`학번 ${v[0]}이(가) 이미 있어 거부됩니다 — 기본키는 중복될 수 없습니다(개체 무결성).`, 'bad'); } },
        ] },
        { name: '참조 무결성', en: 'Referential', hue: 270, cmds: [
          { name: '없는 학과코드', run: async () => { const v = [nextNo(), '정하늘', 'D9', '1']; l.code(ins(v)); await bounceRow(b, st(), { 학번: v[0]!, 이름: v[1]!, 학과코드: v[2]!, 학년: v[3]! }, [...colOf(k, 'dp', '학과코드')]); l.say('학과 릴레이션에 D9가 없어 거부됩니다 — 참조 무결성 위반.', 'bad'); } },
          { name: '학과코드 NULL', run: async () => {
            const v = [nextNo(), '정하늘', 'NULL', '1'];
            l.code(ins(v));
            const r: TRow = { id: `n${n}`, v: { 학번: v[0]!, 이름: v[1]!, 학과코드: null, 학년: v[3]! } };
            srows.push(r);
            await draw({ spawn: dropIn((key) => key.startsWith(`st:c:${r.id}:`)), ms: 650 });
            fit();
            l.say('외래키는 NULL이어도 됩니다(아직 학과 미정). 참조 무결성은 "있는 값 또는 NULL"만 요구합니다.', 'ok');
          } },
          { name: '부모 삭제', sub: [
            { name: 'RESTRICT', run: () => delParent('RESTRICT') },
            { name: 'CASCADE', run: () => delParent('CASCADE') },
            { name: 'SET NULL', run: () => delParent('SET NULL') },
          ] },
        ] },
        { name: '도메인 무결성', en: 'Domain', hue: 140, cmds: [
          { name: '학년 5', run: async () => { const v = [nextNo(), '정하늘', 'D2', '5']; l.code(ins(v)); await bounceRow(b, st(), { 학번: v[0]!, 이름: v[1]!, 학과코드: v[2]!, 학년: v[3]! }, k.starting('fence:')); l.say('학년 5는 CHECK(1~4) 범위를 벗어나 울타리에 막혔습니다 — 도메인 무결성.', 'bad'); } },
          { name: '정상 행', run: async () => {
            const v = [nextNo(), '한별', 'D2', '2'];
            l.code(ins(v));
            const r: TRow = { id: `n${n}`, v: { 학번: v[0]!, 이름: v[1]!, 학과코드: v[2]!, 학년: v[3]! } };
            srows.push(r);
            await draw({ spawn: dropIn((key) => key.startsWith(`st:c:${r.id}:`)), ms: 650 });
            fit();
            l.say('기본키는 새 값, 학과코드는 학과에 있는 D2, 학년은 1~4 — 세 규칙을 모두 지켜 들어갔습니다.', 'ok');
          } },
        ] },
      ],
    };
  } });
}

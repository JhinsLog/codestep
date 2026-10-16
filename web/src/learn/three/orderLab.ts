// SELECT 처리 순서 3D 실습: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY를 한 단계씩.
// 걸러진 행은 떨어지고, 그룹은 따로 모이고, 그룹이 한 행으로 합쳐지고, 마지막에 줄을 다시 선다.
import { sleep, type Viz } from '../core';
import type { Want } from './keyed';
import { base, flashAll, hopAll, rowOf } from './kit';
import { lab } from './lab';
import { CD, CH, PITCH, V3, tLayout } from './tables';
import { TabStage, cellKey, cols, rows, type SRow, type STable } from './tabStage';
import { hex, type Info } from './world';

const LINES: [number, string][] = [[5, 'SELECT 학과, AVG(점수) AS 평균'], [1, 'FROM 성적'], [2, 'WHERE 점수 >= 60'], [3, 'GROUP BY 학과'], [4, 'HAVING COUNT(*) >= 2'], [6, 'ORDER BY 평균 DESC;']];
const NUM = ['', '①', '②', '③', '④', '⑤', '⑥'];
const DATA = [['김철수', '컴공', '85'], ['이영희', '경영', '55'], ['박민수', '컴공', '72'], ['최지은', '전자', '90'], ['정하늘', '컴공', '48'], ['한별', '경영', '77'], ['서지안', '경영', '66'], ['오다인', '전자', '58']];
const GX: Record<string, number> = { 경영: -4.6, 전자: 0, 컴공: 4.6 };
const OI: Record<string, Info> = {
  w: { title: '작업 중인 행 집합', sub: 'FROM → WHERE', body: 'FROM이 테이블을 가져오고, WHERE가 행을 하나씩 검사해 조건에 맞지 않는 행을 버립니다. 아직 묶기 전이라 WHERE에서는 COUNT·AVG 같은 집계 함수를 쓸 수 없습니다.' },
  g: { title: '그룹', sub: 'GROUP BY → HAVING', body: 'GROUP BY가 같은 학과끼리 묶습니다. HAVING은 묶인 그룹 단위로 조건을 검사하므로 COUNT(*), AVG() 같은 집계 함수를 쓸 수 있습니다.' },
  r: { title: '결과', sub: 'SELECT → ORDER BY', body: 'SELECT가 그룹마다 한 행(학과, 평균)을 만듭니다. ORDER BY는 맨 마지막이라 SELECT에서 붙인 별칭(평균)을 쓸 수 있습니다.' },
};

export function orderLab(): Viz {
  return lab({ title: 'SELECT 처리 순서 3D', en: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    const st = new TabStage(b);
    let step = 0;
    let counts: { g: string; n: number; ok?: boolean }[] = [];
    const P = () => w.pal;
    st.extra = () => counts.map((c): Want => {
      const t = st.get(`g${c.g}`);
      const L = t ? tLayout(t) : null;
      return { key: `cnt:${c.g}`, kind: 'sign', pos: V3(GX[c.g]!, 0.3, (L?.z1 ?? 1) + 0.55), runs: [{ text: `COUNT = ${c.n}`, color: '#ffffff', weight: 800, size: 38 }], height: 0.42, bg: hex(c.ok === undefined ? 0x475569 : c.ok ? P().good : P().bad), info: OI.g };
    });
    const showCode = (cur: number) => l.code(LINES.map(([n, t]) => `${n === cur ? '▶' : ' '} ${NUM[n]} ${t}`).join('\n'));

    const STEPS: (() => Promise<void>)[] = [
      async () => {
        st.set({ key: 'w', name: '성적', x: 0, z: 0, cols: cols(['이름', 1.35], ['학과', 1.2], ['점수', 1.15]), rows: rows(['이름', '학과', '점수'], DATA, 'r'), info: OI.w });
        await st.draw({ spawn: (key, to) => (key.startsWith('w:') ? to.clone().add(V3(0, 4, 0)) : undefined), ms: 700 });
        l.say('① FROM: 성적 테이블의 모든 행(8행)을 가져옵니다. SQL은 SELECT부터 쓰지만 실제 처리는 FROM부터입니다.', 'ok');
      },
      async () => {
        const t = st.get('w')!;
        for (const r of t.rows) {
          const ok = Number(r.v['점수']) >= 60;
          await Promise.all([hopAll(w, rowOf(k, 'w', r.id), 0.25, 280), flashAll(w, rowOf(k, 'w', r.id), ok ? P().good : P().bad, ok ? 320 : 420)]);
        }
        t.rows = t.rows.filter((r) => Number(r.v['점수']) >= 60);
        await st.draw({ exit: 'fall', ms: 700 });
        l.say('② WHERE: 행을 하나씩 검사해 점수 60 미만인 3행을 버렸습니다(5행 남음). 아직 그룹이 없어서 여기서는 집계 함수를 쓸 수 없습니다.', 'ok');
      },
      async () => {
        const t = st.get('w')!;
        const groups = new Map<string, SRow[]>();
        for (const r of t.rows) groups.set(r.v['학과']!, [...(groups.get(r.v['학과']!) ?? []), r]);
        st.drop('w');
        for (const g of [...groups.keys()].sort((a, c) => a.localeCompare(c, 'ko'))) {
          st.set({ key: `g${g}`, name: g, kind: '그룹', x: GX[g]!, z: 0, cols: cols(['이름', 1.35], ['학과', 1.2], ['점수', 1.15]), info: OI.g,
            rows: groups.get(g)!.map((r) => ({ id: r.id, v: { ...r.v }, from: Object.fromEntries(['이름', '학과', '점수'].map((c) => [c, cellKey('w', r.id, c)])) })),
            hi: new Map([['c:학과', { 경영: 0x0ea5e9, 전자: 0xa855f7, 컴공: 0xf97316 }[g]!]]) });
        }
        await st.draw({ ms: 900, arc: 1.4 });
        l.say('③ GROUP BY: 학과가 같은 행끼리 따로 모였습니다. 이제부터는 행이 아니라 그룹 단위로 생각합니다.', 'ok');
      },
      async () => {
        counts = ['경영', '전자', '컴공'].map((g) => ({ g, n: st.get(`g${g}`)?.rows.length ?? 0 }));
        await st.draw({ ms: 400 });
        for (const c of counts) {
          c.ok = c.n >= 2;
          await st.draw({ ms: 300 });
          await flashAll(w, k.starting(`g${c.g}:`), c.ok ? P().good : P().bad, 500);
        }
        st.drop('g전자');
        counts = counts.filter((c) => c.ok);
        await st.draw({ exit: 'fall', ms: 700 });
        l.say('④ HAVING: 그룹마다 COUNT(*)를 세어 2 미만인 전자 그룹을 버렸습니다. HAVING은 그룹을 거르므로 집계 함수를 쓸 수 있습니다.', 'ok');
      },
      async () => {
        const gs = ['경영', '컴공'].map((g) => st.get(`g${g}`)!).filter(Boolean);
        const avg = (t: STable) => (t.rows.reduce((s, r) => s + Number(r.v['점수']), 0) / t.rows.length).toFixed(1);
        st.set({ key: 'r', name: '결과', kind: '', tone: 'result', x: 0, z: 3 * PITCH + 2.4, cols: cols(['학과', 1.3], ['평균', 1.3]), info: OI.r,
          rows: gs.map((t) => ({ id: t.key, v: { 학과: t.name, 평균: avg(t) }, from: { 학과: cellKey(t.key, t.rows[0]!.id, '학과') } })) });
        await st.draw({ ms: 800, arc: 1.2 });
        // 점수 칸들이 평균 칸으로 날아가 합쳐진다
        await Promise.all(gs.map(async (t) => {
          const dst = k.get(cellKey('r', t.key, '평균'));
          await Promise.all(t.rows.map(async (r, i) => {
            const src = k.get(cellKey(t.key, r.id, '점수'));
            if (!src || !dst) return;
            const g = w.block(1.15, CH, CD, P().pend, { text: r.v['점수']!, color: P().cellText });
            g.position.copy(src.position);
            root.add(g);
            b.temp.add(g);
            await sleep(i * 150);
            await w.move(g, dst.position.clone(), 800, 1.2);
            b.temp.delete(g);
            await w.vanish(g, 'shrink', 250);
          }));
          if (dst) await w.flash(dst, P().warn, 500);
        }));
        for (const t of gs) st.drop(t.key);
        counts = [];
        await st.draw({ exit: 'shrink', ms: 600 });
        l.say(`⑤ SELECT: 그룹마다 학과와 AVG(점수)를 계산해 한 행씩 만들었습니다 (경영 ${avg(gs[0]!)}, 컴공 ${avg(gs[1]!)}). 별칭 '평균'이 여기서 생깁니다.`, 'ok');
      },
      async () => {
        const t = st.get('r')!;
        t.rows = [...t.rows].sort((a, c) => Number(c.v['평균']) - Number(a.v['평균']));
        await st.draw({ ms: 1000 });
        await hopAll(w, k.starting('r:c:'), 0.3, 400);
        l.say('⑥ ORDER BY: 평균이 높은 순(DESC)으로 다시 줄을 섰습니다. 가장 마지막이라 SELECT의 별칭(평균)을 쓸 수 있습니다. 끝!', 'ok');
      },
    ];

    async function goTo(n: number) {
      if (n <= step) await reset();
      for (let i = step; i < n; i++) {
        showCode(i + 1);
        await STEPS[i]!();
        step = i + 1;
        if (i < n - 1) await sleep(900);
      }
    }
    async function reset() {
      step = 0;
      counts = [];
      st.tables = [];
      await st.draw({ exit: 'shrink', ms: 400, fit: false });
      w.fit(-7, 7, -1.5, 6);
      showCode(0);
    }
    void reset();

    const names = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY'];
    return {
      hint: '① FROM부터 눌러 한 단계씩 진행해 보세요. 위쪽 SQL의 동그라미 숫자가 실제 처리 순서입니다.',
      reset,
      groups: [
        { name: '처리 순서', en: 'Logical order', hue: 200, cmds: names.map((n, i) => ({ name: `${NUM[i + 1]} ${n}`, run: () => goTo(i + 1) })) },
        { name: '진행', hue: 140, cmds: [
          { name: '다음 단계 ▶', run: () => (step >= 6 ? l.say('마지막 단계까지 끝났습니다. 처음부터를 눌러 다시 해 보세요.', 'info') : goTo(step + 1)) },
          { name: '한 번에 실행', run: () => goTo(6) },
        ] },
      ],
    };
  } });
}

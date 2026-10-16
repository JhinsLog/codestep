// 데이터베이스 개념 그림: 관계 데이터 모델 용어, 관계 대수 연산, 조인, 키의 포함 관계.
import { el } from '../../view/stage';
import { detailBox, frame, nameHits, tween, type Viz } from '../core';

type Row = (string | number | null)[];
interface T { name: string; cols: string[]; rows: Row[] }

/** 표 하나를 그린다. 칸·행·열에 표시를 붙일 수 있게 요소를 돌려준다 */
function tableEl(t: T): { el: HTMLElement; head: HTMLTableCellElement[]; cells: HTMLTableCellElement[][]; rowsEl: HTMLTableRowElement[] } {
  const w = el('div', 'rt-wrap');
  w.append(el('div', 'rt-name', t.name));
  const table = el('table', 'rt');
  const hr = el('tr');
  const head = t.cols.map((c) => { const th = el('th', '', c); hr.append(th); return th; });
  table.append(hr);
  const cells: HTMLTableCellElement[][] = [];
  const rowsEl = t.rows.map((r) => {
    const tr = el('tr');
    cells.push(r.map((v) => { const td = el('td', v === null ? 'null' : '', v === null ? 'NULL' : String(v)); tr.append(td); return td; }));
    table.append(tr);
    return tr;
  });
  w.append(table);
  return { el: w, head, cells, rowsEl };
}

const fadeRows = (rows: HTMLElement[]) => rows.forEach((r, k) => {
  r.style.opacity = '0';
  setTimeout(() => tween(300, (t) => { r.style.opacity = String(t); }), 120 * k);
});

// ── 관계 데이터 모델 용어 ─────────────────────────────

export function relTerms(): Viz {
  const { root, body } = frame('관계 데이터 모델의 구조', 'Relation · Tuple · Attribute · Domain');
  const T0: T = { name: '[학생] 릴레이션', cols: ['학번 🔑', '이름', '학과', '학년'], rows: [[1001, '김하늘', '컴퓨터', 2], [1002, '이도윤', '전자', 3], [1003, '박서준', '컴퓨터', 1], [1004, '최유나', '기계', 4]] };
  const t = tableEl(T0);
  const detail = detailBox('아래 단추를 누르면 표에서 그 부분이 어디인지 빛나며 보여 줍니다.');
  const badge = el('div', 'rt-badge');
  const clear = () => {
    t.el.querySelectorAll('.lit, .dim').forEach((x) => x.classList.remove('lit', 'dim'));
    badge.replaceChildren();
  };
  const terms: { name: string; en: string; desc: string; run: () => void }[] = [
    { name: '릴레이션 스키마', en: 'Relation Schema', desc: '릴레이션의 이름과 속성 이름들로 이루어진 "틀". 학생(학번, 이름, 학과, 학년)처럼 쓴다. 잘 바뀌지 않는다(정적).', run: () => t.head.forEach((h) => h.classList.add('lit')) },
    { name: '릴레이션 인스턴스', en: 'Relation Instance', desc: '어느 한 순간 릴레이션에 실제로 들어 있는 튜플들의 집합. 데이터를 넣고 지울 때마다 바뀐다(동적).', run: () => t.rowsEl.forEach((r) => r.classList.add('lit')) },
    { name: '튜플', en: 'Tuple (행·레코드)', desc: '릴레이션의 한 행. 학생 한 명의 정보다. 튜플끼리는 순서가 없고, 같은 튜플이 두 번 있을 수 없다.', run: () => { t.rowsEl.forEach((r, k) => r.classList.toggle('dim', k !== 1)); t.rowsEl[1]!.classList.add('lit'); } },
    { name: '속성', en: 'Attribute (열·필드)', desc: '릴레이션의 한 열. 데이터의 가장 작은 논리적 단위다. 속성끼리도 순서가 없다.', run: () => { t.head[2]!.classList.add('lit'); t.cells.forEach((r) => r[2]!.classList.add('lit')); } },
    { name: '도메인', en: 'Domain', desc: '한 속성이 가질 수 있는 원자값들의 집합. 학년의 도메인은 {1, 2, 3, 4}다. 5학년은 들어갈 수 없다(도메인 무결성).', run: () => { t.head[3]!.classList.add('lit'); t.cells.forEach((r) => r[3]!.classList.add('lit')); badge.append(el('span', 'rt-domain', '학년의 도메인 = { 1, 2, 3, 4 }')); } },
    { name: '카디널리티', en: 'Cardinality (기수)', desc: '튜플(행)의 수. 이 릴레이션은 4. 데이터를 넣고 지울 때마다 바뀐다.', run: () => { t.rowsEl.forEach((r, k) => { r.classList.add('lit'); r.cells[0]!.setAttribute('data-n', String(k + 1)); }); badge.append(el('span', 'rt-count', '카디널리티 = 4 (행의 수)')); } },
    { name: '차수', en: 'Degree', desc: '속성(열)의 수. 이 릴레이션은 4. 속성을 추가하거나 지울 때만 바뀐다.', run: () => { t.head.forEach((h) => h.classList.add('lit')); badge.append(el('span', 'rt-count', '차수 = 4 (열의 수)')); } },
    { name: '기본키', en: 'Primary Key', desc: '튜플을 하나로 식별하는 키(🔑). 학번이 같으면 같은 학생이다. NULL이나 중복을 가질 수 없다(개체 무결성).', run: () => { t.head[0]!.classList.add('lit'); t.cells.forEach((r) => r[0]!.classList.add('lit')); } },
  ];
  const bar = el('div', 'viz-tools');
  const btns = terms.map((x) => {
    const b = el('button', '', x.name);
    b.addEventListener('click', () => {
      clear();
      btns.forEach((y) => y.classList.toggle('on', y === b));
      x.run();
      detail.show(x.name, x.desc, x.en);
    });
    bar.append(b);
    return b;
  });
  body.append(bar, t.el, badge, detail.el);
  return {
    el: root,
    focus: (names) => btns.forEach((b, k) => b.classList.toggle('focus', nameHits([terms[k]!.name, terms[k]!.en.split(' (')[0]], names))),
    dispose: () => {},
  };
}

// ── 관계 대수 ─────────────────────────────────────────

export function relAlgebra(): Viz {
  const { root, body } = frame('관계 대수 연산', 'Relational Algebra');
  const detail = detailBox('연산 단추를 누르면 원래 표에서 무엇이 골라지고, 결과 릴레이션이 어떻게 만들어지는지 보여 줍니다.');
  const stage = el('div', 'ra-stage');
  const S: T = { name: '학생', cols: ['이름', '학과', '학년'], rows: [['김', '컴퓨터', 2], ['이', '전자', 3], ['박', '컴퓨터', 2], ['최', '기계', 1]] };
  const D: T = { name: '학과', cols: ['학과', '건물'], rows: [['컴퓨터', 'A동'], ['전자', 'B동'], ['토목', 'C동']] };
  const E: T = { name: '수강', cols: ['이름', '과목'], rows: [['김', 'DB'], ['김', 'OS'], ['이', 'DB'], ['박', 'DB'], ['박', 'OS'], ['최', 'OS']] };
  const F: T = { name: '필수', cols: ['과목'], rows: [['DB'], ['OS']] };
  const A: T = { name: 'A반', cols: ['이름'], rows: [['김'], ['이'], ['박']] };
  const B: T = { name: 'B반', cols: ['이름'], rows: [['박'], ['최']] };
  const show = (src: T[], res: T, mark: (v: ReturnType<typeof tableEl>[]) => void) => {
    const views = src.map(tableEl);
    const arrow = el('div', 'ra-arrow', '⟶');
    const out = tableEl(res);
    out.el.classList.add('ra-result');
    stage.replaceChildren(...views.map((v) => v.el), arrow, out.el);
    mark(views);
    fadeRows(out.rowsEl);
  };
  const ops: { sym: string; name: string; en: string; expr: string; desc: string; run: () => void }[] = [
    { sym: 'σ', name: '셀렉트', en: 'Select', expr: 'σ 학년=2 (학생)', desc: '조건에 맞는 튜플(행)만 고른다. 표를 가로로 자르는 수평 연산이다. SQL의 WHERE에 해당한다.',
      run: () => show([S], { name: '결과', cols: S.cols, rows: S.rows.filter((r) => r[2] === 2) }, ([v]) => v!.rowsEl.forEach((r, k) => r.classList.add(S.rows[k]![2] === 2 ? 'lit' : 'dim'))) },
    { sym: 'π', name: '프로젝트', en: 'Project', expr: 'π 학과 (학생)', desc: '지정한 속성(열)만 뽑는다. 세로로 자르는 수직 연산이며, 결과는 집합이라 중복된 튜플(컴퓨터 두 번)은 하나만 남는다. SQL의 SELECT 열 목록(+ DISTINCT)에 해당한다.',
      run: () => show([S], { name: '결과', cols: ['학과'], rows: [...new Set(S.rows.map((r) => r[1]!))].map((x) => [x] as Row) }, ([v]) => { v!.head[1]!.classList.add('lit'); v!.cells.forEach((r) => r[1]!.classList.add('lit')); }) },
    { sym: '⋈', name: '조인', en: 'Join', expr: '학생 ⋈ 학과', desc: '공통 속성(학과)의 값이 같은 튜플끼리 이어 붙인다. 짝이 없는 튜플(기계 학과 최, 토목 학과)은 결과에 없다. 같은 속성을 하나로 합치면 자연 조인이다.',
      run: () => show([S, D], { name: '결과', cols: ['이름', '학과', '학년', '건물'], rows: S.rows.flatMap((r) => D.rows.filter((d) => d[0] === r[1]).map((d) => [...r, d[1]!] as Row)) },
        ([s, d]) => { s!.rowsEl.forEach((r, k) => r.classList.add(D.rows.some((x) => x[0] === S.rows[k]![1]) ? 'lit' : 'dim')); d!.rowsEl.forEach((r, k) => r.classList.add(S.rows.some((x) => x[1] === D.rows[k]![0]) ? 'lit' : 'dim')); }) },
    { sym: '÷', name: '디비전', en: 'Division', expr: '수강 ÷ 필수', desc: '나누는 릴레이션(필수: DB, OS)의 값을 "모두" 가진 튜플만 고른다. 김과 박은 DB와 OS를 모두 수강했고, 이(DB만)와 최(OS만)는 빠진다.',
      run: () => show([E, F], { name: '결과', cols: ['이름'], rows: [['김'], ['박']] }, ([e]) => e!.rowsEl.forEach((r, k) => r.classList.add(['김', '박'].includes(String(E.rows[k]![0])) ? 'lit' : 'dim'))) },
    { sym: '∪', name: '합집합', en: 'Union', expr: 'A반 ∪ B반', desc: '두 릴레이션의 튜플을 모두 모은다. 겹치는 박은 한 번만. 두 릴레이션의 속성 수와 도메인이 같아야 한다(합병 가능).',
      run: () => show([A, B], { name: '결과', cols: ['이름'], rows: [['김'], ['이'], ['박'], ['최']] }, (v) => v.forEach((x) => x.rowsEl.forEach((r) => r.classList.add('lit')))) },
    { sym: '∩', name: '교집합', en: 'Intersection', expr: 'A반 ∩ B반', desc: '양쪽에 모두 있는 튜플만 남긴다.',
      run: () => show([A, B], { name: '결과', cols: ['이름'], rows: [['박']] }, (v) => v.forEach((x, i) => x.rowsEl.forEach((r, k) => r.classList.add((i ? B : A).rows[k]![0] === '박' ? 'lit' : 'dim')))) },
    { sym: '−', name: '차집합', en: 'Difference', expr: 'A반 − B반', desc: 'A에는 있고 B에는 없는 튜플. 순서를 바꾸면(B − A) 결과가 달라진다.',
      run: () => show([A, B], { name: '결과', cols: ['이름'], rows: [['김'], ['이']] }, ([a, b]) => { a!.rowsEl.forEach((r, k) => r.classList.add(A.rows[k]![0] === '박' ? 'dim' : 'lit')); b!.rowsEl.forEach((r) => r.classList.add('dim')); }) },
    { sym: '×', name: '카티션 곱', en: 'Cartesian Product', expr: 'A반 × 필수', desc: '두 릴레이션의 튜플을 모든 조합으로 잇는다. 차수는 더하고(1 + 1 = 2), 카디널리티는 곱한다(3 × 2 = 6). SQL의 CROSS JOIN이다.',
      run: () => show([A, F], { name: '결과', cols: ['이름', '과목'], rows: A.rows.flatMap((a) => F.rows.map((f) => [a[0]!, f[0]!])) }, (v) => v.forEach((x) => x.rowsEl.forEach((r) => r.classList.add('lit')))) },
  ];
  const bar = el('div', 'viz-tools');
  const btns = ops.map((o) => {
    const b = el('button', 'ra-op');
    b.append(el('b', '', o.sym), el('span', '', o.name));
    b.addEventListener('click', () => {
      btns.forEach((y) => y.classList.toggle('on', y === b));
      o.run();
      detail.show(`${o.sym} ${o.name} — ${o.expr}`, o.desc, o.en);
    });
    bar.append(b);
    return b;
  });
  const sc = el('div', 'viz-scroll');
  sc.append(stage);
  body.append(bar, sc, el('p', 'muted small', '순수 관계 연산: σ 셀렉트, π 프로젝트, ⋈ 조인, ÷ 디비전 / 일반 집합 연산: ∪ ∩ − ×'), detail.el);
  btns[0]!.click();
  return {
    el: root,
    focus: (names) => btns.forEach((b, k) => b.classList.toggle('focus', nameHits([ops[k]!.name, ops[k]!.en], names) || names.includes(ops[k]!.sym))),
    dispose: () => {},
  };
}

// ── 조인 종류 (벤 다이어그램 + 결과 표) ────────────────

export function joins(): Viz {
  const { root, body } = frame('조인의 종류', 'INNER · LEFT · RIGHT · FULL OUTER · CROSS');
  const detail = detailBox('조인을 고르면 남는 부분이 색칠되고 결과 표가 바뀝니다. NULL은 짝이 없어서 비어 있는 칸이다.');
  const S: T = { name: '학생', cols: ['이름', '학과코드'], rows: [['김', 'D1'], ['이', 'D2'], ['박', 'D9']] };
  const D: T = { name: '학과', cols: ['학과코드', '학과명'], rows: [['D1', '컴퓨터'], ['D2', '전자'], ['D3', '기계']] };
  const venn = el('div', 'venn');
  const left = el('div', 'venn-c a', '학생');
  const right = el('div', 'venn-c b', '학과');
  const mid = el('div', 'venn-mid');
  venn.append(left, mid, right);
  const out = el('div');
  const inner = S.rows.flatMap((s) => D.rows.filter((d) => d[0] === s[1]).map((d) => [s[0]!, s[1]!, d[1]!] as Row));
  const lOnly = S.rows.filter((s) => !D.rows.some((d) => d[0] === s[1])).map((s) => [s[0]!, s[1]!, null] as Row);
  const rOnly = D.rows.filter((d) => !S.rows.some((s) => s[1] === d[0])).map((d) => [null, d[0]!, d[1]!] as Row);
  const kinds: { name: string; en: string; zone: string; rows: Row[]; desc: string }[] = [
    { name: '내부 조인', en: 'INNER JOIN', zone: 'm', rows: inner, desc: '양쪽 모두에 짝이 있는 행만 남는다. 학과코드가 D9인 박, 학생이 없는 D3 기계는 빠진다.' },
    { name: '왼쪽 외부 조인', en: 'LEFT OUTER JOIN', zone: 'lm', rows: [...inner, ...lOnly], desc: '왼쪽(학생)의 모든 행을 남기고, 짝이 없으면 오른쪽 칸을 NULL로 채운다. 박이 학과명 NULL로 남는다.' },
    { name: '오른쪽 외부 조인', en: 'RIGHT OUTER JOIN', zone: 'mr', rows: [...inner, ...rOnly], desc: '오른쪽(학과)의 모든 행을 남긴다. 학생이 없는 기계 학과가 이름 NULL로 남는다.' },
    { name: '완전 외부 조인', en: 'FULL OUTER JOIN', zone: 'lmr', rows: [...inner, ...lOnly, ...rOnly], desc: '양쪽의 모든 행을 남긴다. 짝이 없는 쪽은 NULL.' },
    { name: '교차 조인', en: 'CROSS JOIN', zone: 'x', rows: S.rows.flatMap((s) => D.rows.map((d) => [s[0]!, s[1]!, d[1]!] as Row)), desc: '조건 없이 모든 조합(카티션 곱): 3 × 3 = 9행. 학과코드는 학생 쪽 값이다.' },
  ];
  const bar = el('div', 'viz-tools');
  const btns = kinds.map((k) => {
    const b = el('button', '', k.en);
    b.addEventListener('click', () => {
      btns.forEach((y) => y.classList.toggle('on', y === b));
      venn.className = `venn z-${k.zone}`;
      const t = tableEl({ name: `학생 ${k.en} 학과`, cols: ['이름', '학과코드', '학과명'], rows: k.rows });
      out.replaceChildren(t.el);
      fadeRows(t.rowsEl);
      detail.show(`${k.name} (${k.en})`, k.desc);
    });
    bar.append(b);
    return b;
  });
  const src = el('div', 'ra-stage');
  src.append(tableEl(S).el, tableEl(D).el);
  body.append(bar, venn, src, out, detail.el);
  btns[0]!.click();
  return {
    el: root,
    focus: (names) => btns.forEach((b, k) => b.classList.toggle('focus', nameHits([kinds[k]!.name, kinds[k]!.en], names))),
    dispose: () => {},
  };
}

// ── 키의 포함 관계 ─────────────────────────────────────

export function keys(): Viz {
  const { root, body } = frame('키의 종류와 포함 관계', 'Super Key ⊃ Candidate Key ⊃ Primary · Alternate Key');
  const detail = detailBox('상자를 누르면 그 키의 조건과 예를 보여 줍니다. 예: [학생](학번, 주민번호, 이름, 학과)');
  const box = (cls: string, name: string, en: string, ex: string, desc: string, kids: HTMLElement[] = []) => {
    const b = el('div', `key-box ${cls}`);
    const h = el('button', 'key-head');
    h.append(el('b', '', name), el('span', 'key-en', en), el('span', 'key-ex', ex));
    h.addEventListener('click', (e) => { e.stopPropagation(); root.querySelectorAll('.key-head').forEach((x) => x.classList.toggle('picked', x === h)); detail.show(name, desc, en); });
    b.append(h, ...kids);
    return b;
  };
  const pk = box('pk', '기본키', 'Primary Key', '{학번}', '후보키 중 대표로 고른 하나. NULL·중복 불가(개체 무결성).');
  const ak = box('ak', '대체키', 'Alternate Key', '{주민번호}', '후보키 중 기본키로 고르지 않은 나머지. 보조키라고도 한다.');
  const ck = box('ck', '후보키', 'Candidate Key', '{학번}, {주민번호}', '유일성 + 최소성. 튜플을 하나로 구별할 수 있고, 속성 하나라도 빼면 구별하지 못한다.', [pk, ak]);
  const sk = box('sk', '슈퍼키', 'Super Key', '{학번}, {학번, 이름}, {주민번호, 학과} …', '유일성만 만족. 구별은 되지만 필요 없는 속성(이름)이 더 붙어 있어도 된다(최소성 X).', [ck]);
  const fk = box('fk', '외래키', 'Foreign Key', '수강.학번 → 학생.학번', '다른 릴레이션의 기본키를 참조하는 속성. 값은 참조하는 기본키 값 중 하나이거나 NULL이어야 한다(참조 무결성).');
  const wrap = el('div', 'key-wrap');
  wrap.append(sk, fk);
  const legend = el('div', 'key-legend');
  for (const [a, b] of [['유일성', '키 값으로 튜플을 딱 하나만 찾을 수 있다'], ['최소성', '꼭 필요한 속성만으로 이루어진다']] as const) {
    const p = el('p');
    p.append(el('b', '', a), document.createTextNode(` ${b}`));
    legend.append(p);
  }
  body.append(wrap, legend, detail.el);
  [sk, ck, pk, ak, fk].forEach((b, k) => { b.style.opacity = '0'; setTimeout(() => tween(350, (t) => { b.style.opacity = String(t); }), 160 * k); });
  const all: [HTMLElement, string, string][] = [[sk, '슈퍼키', 'Super Key'], [ck, '후보키', 'Candidate Key'], [pk, '기본키', 'Primary Key'], [ak, '대체키', 'Alternate Key'], [fk, '외래키', 'Foreign Key']];
  return {
    el: root,
    focus: (names) => {
      for (const [b, n, e] of all) b.querySelector('.key-head')!.classList.toggle('focus', nameHits([n, e], names));
      legend.querySelectorAll('p').forEach((p) => p.classList.toggle('focus', nameHits([p.querySelector('b')!.textContent!], names)));
    },
    dispose: () => {},
  };
}

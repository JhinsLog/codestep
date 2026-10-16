// 직접 만져 보는 개념 그림: RAID, chmod 권한, 해시 충돌, 커버리지 실험판, V-모델, 통합 테스트(스텁·드라이버), 클라우드 책임 범위.
import { el } from '../../view/stage';
import { detailBox, frame, nameHits, player, sleep, svg, tween, type Viz } from '../core';

// ── RAID ──────────────────────────────────────────────
export function raid(): Viz {
  const { root, body } = frame('RAID 레벨', 'Redundant Array of Independent Disks');
  const detail = detailBox('레벨을 고르면 데이터 블록(A1, A2 …)이 디스크에 어떻게 나뉘는지 보여 줍니다. "디스크 고장"을 눌러 데이터가 살아남는지 보세요.');
  const disks = el('div', 'raid');
  const levels = [
    { name: 'RAID 0', en: '스트라이핑 (Striping)', n: 2, layout: [['A1', 'A2'], ['A3', 'A4'], ['A5', 'A6']], survive: 0, desc: '데이터를 나눠 여러 디스크에 동시에 쓴다. 가장 빠르지만 중복이 없어 디스크 하나만 고장 나도 전부 잃는다. 용량은 100% 사용.' },
    { name: 'RAID 1', en: '미러링 (Mirroring)', n: 2, layout: [['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3']], survive: 1, desc: '같은 데이터를 두 디스크에 똑같이 쓴다. 하나가 고장 나도 나머지로 버틴다. 대신 용량은 절반만 쓴다.' },
    { name: 'RAID 5', en: '분산 패리티 (Distributed Parity)', n: 3, layout: [['A1', 'A2', 'P'], ['B1', 'P', 'B2'], ['P', 'C1', 'C2']], survive: 1, desc: '데이터와 패리티(복구용 계산값)를 모든 디스크에 돌아가며 나눠 쓴다. 디스크 1개가 고장 나도 남은 데이터와 패리티로 복구한다. 최소 3개 필요.' },
    { name: 'RAID 6', en: '이중 패리티 (Dual Parity)', n: 4, layout: [['A1', 'A2', 'P', 'Q'], ['B1', 'P', 'Q', 'B2'], ['P', 'Q', 'C1', 'C2']], survive: 2, desc: '패리티를 두 개(P, Q) 둬서 디스크 2개가 동시에 고장 나도 복구한다. 최소 4개 필요.' },
  ];
  let cur = levels[0]!;
  let broken = 0;
  const draw = () => {
    disks.replaceChildren();
    for (let d = 0; d < cur.n; d++) {
      const col = el('div', `raid-disk${d < broken ? ' broken' : ''}`);
      col.append(el('div', 'raid-label', d < broken ? `디스크 ${d + 1} ✕` : `디스크 ${d + 1}`));
      cur.layout.forEach((row, r) => {
        const b = el('div', `raid-block${/^[PQ]$/.test(row[d]!) ? ' parity' : ''}`, row[d]!);
        b.style.opacity = '0';
        setTimeout(() => tween(250, (t) => { b.style.opacity = String(t); }), (r * cur.n + d) * 60);
        col.append(b);
      });
      disks.append(col);
    }
  };
  const bar = el('div', 'viz-tools');
  const btns = levels.map((lv) => {
    const b = el('button', '', lv.name);
    b.addEventListener('click', () => { cur = lv; broken = 0; btns.forEach((x) => x.classList.toggle('on', x === b)); draw(); detail.show(`${lv.name} — ${lv.en}`, lv.desc); });
    bar.append(b);
    return b;
  });
  const fail = el('button', 'danger', '💥 디스크 고장');
  fail.addEventListener('click', () => {
    if (broken >= cur.n) return;
    broken++;
    draw();
    const ok = broken <= cur.survive;
    detail.show(ok ? `✓ 디스크 ${broken}개 고장 — 데이터 복구 가능` : `✕ 디스크 ${broken}개 고장 — 데이터 손실`,
      ok ? `${cur.name}는 디스크 ${cur.survive}개까지 고장 나도 남은 디스크로 데이터를 되살린다.` : `${cur.name}는 디스크 ${cur.survive}개 고장까지만 견딘다${cur.survive ? '' : '(중복이 없다)'}.`);
  });
  bar.append(fail);
  body.append(bar, disks, detail.el);
  btns[0]!.click();
  return { el: root, focus: (names) => btns.forEach((b, k) => b.classList.toggle('focus', nameHits([levels[k]!.name, levels[k]!.en.split(' (')[0]], names))), dispose: () => {} };
}

// ── chmod 권한 ────────────────────────────────────────
export function chmod(): Viz {
  const { root, body } = frame('리눅스 파일 권한', 'chmod · rwx · 8진수');
  const detail = detailBox('칸을 눌러 권한을 켜고 끄면 숫자(8진수)와 ls -l 표시가 바로 바뀝니다.');
  const who = ['소유자 (u)', '그룹 (g)', '기타 (o)'];
  const what = [['r', '읽기', 4], ['w', '쓰기', 2], ['x', '실행', 1]] as const;
  const on = [[true, true, true], [true, false, true], [false, false, true]];
  const grid = el('div', 'perm-grid');
  const out = el('div', 'perm-out');
  const paint = () => {
    grid.replaceChildren(el('span'));
    for (const [c, n, v] of what) grid.append(el('span', 'perm-h', `${c} ${n} (${v})`));
    grid.append(el('span', 'perm-h', '합'));
    on.forEach((row, i) => {
      grid.append(el('span', 'perm-who', who[i]!));
      row.forEach((v, j) => {
        const b = el('button', `perm-cell${v ? ' on' : ''}`, v ? what[j]![0] : '-');
        b.addEventListener('click', () => { on[i]![j] = !on[i]![j]; paint(); });
        grid.append(b);
      });
      grid.append(el('span', 'perm-sum', String(row.reduce((a, v, j) => a + (v ? what[j]![2] : 0), 0))));
    });
    const oct = on.map((r) => r.reduce((a, v, j) => a + (v ? what[j]![2] : 0), 0)).join('');
    const sym = on.map((r) => r.map((v, j) => (v ? what[j]![0] : '-')).join('')).join('');
    out.replaceChildren(
      el('code', 'perm-cmd', `chmod ${oct} report.txt`),
      el('code', 'perm-ls', `-${sym}  1 kim staff  report.txt`),
      el('code', 'perm-sym', `chmod u=${sym.slice(0, 3).replace(/-/g, '')},g=${sym.slice(3, 6).replace(/-/g, '')},o=${sym.slice(6).replace(/-/g, '')} report.txt`),
    );
  };
  const presets = el('div', 'viz-tools');
  for (const p of ['755', '644', '751', '640', '700']) {
    const b = el('button', '', p);
    b.addEventListener('click', () => {
      [...p].forEach((d, i) => { const n = Number(d); on[i] = [!!(n & 4), !!(n & 2), !!(n & 1)]; });
      paint();
      detail.show(`chmod ${p}`, `${[...p].map((d, i) => `${who[i]!.split(' ')[0]} ${d} = ${['읽기', '쓰기', '실행'].filter((_, j) => Number(d) & [4, 2, 1][j]!).join('·') || '권한 없음'}`).join(' / ')}`);
    });
    presets.append(b);
  }
  paint();
  body.append(presets, grid, out, el('p', 'muted small', '기호 방식: u(소유자) g(그룹) o(기타) a(모두) + 추가 - 제거 = 지정. 예) chmod a+x run.sh / 소유자 변경은 chown'), detail.el);
  return { el: root, dispose: () => {} };
}

// ── 해시 테이블과 충돌 ────────────────────────────────
export function hashTable(): Viz {
  const { root, body } = frame('해시 테이블과 충돌 해결', 'Hash Function · Collision · Chaining · Linear Probing');
  const detail = detailBox('▶ 재생을 누르면 키가 해시 함수 h(k) = k mod 7로 버킷에 들어갑니다.');
  const KEYS = [15, 22, 8, 29, 11, 36, 4];
  const N = 7;
  let mode: 'chain' | 'probe' = 'chain';
  const table = el('div', 'hash');
  const buckets: HTMLElement[] = [];
  const build = () => {
    table.replaceChildren();
    buckets.length = 0;
    for (let i = 0; i < N; i++) {
      const row = el('div', 'hash-row');
      row.append(el('span', 'hash-idx', `[${i}]`));
      const slot = el('div', 'hash-slot');
      row.append(slot);
      table.append(row);
      buckets.push(slot);
    }
  };
  const filled: (number | null)[] = [];
  const insert = async (k: number, instant: boolean) => {
    const h = k % N;
    const key = el('span', 'hash-key', String(k));
    if (mode === 'chain') {
      const coll = buckets[h]!.childElementCount > 0;
      if (coll) buckets[h]!.append(el('span', 'hash-arrow', '→'));
      buckets[h]!.append(key);
      if (!instant) detail.show(`${k} mod 7 = ${h}`, coll ? `${h}번 버킷에 이미 키가 있다 → 충돌! 체이닝은 같은 버킷 뒤에 연결 리스트로 이어 붙인다.` : `${h}번 버킷이 비어 있어 바로 들어간다.`);
    } else {
      let i = h; let tries = 0;
      while (filled[i] !== null && filled[i] !== undefined && tries < N) { i = (i + 1) % N; tries++; }
      filled[i] = k;
      buckets[i]!.append(key);
      if (!instant) detail.show(`${k} mod 7 = ${h}`, tries ? `${h}번이 차 있어 다음 칸으로 ${tries}번 옮겨 ${i}번에 넣는다(선형 조사). 이렇게 한쪽에 몰리는 것을 군집화라 한다.` : `${h}번 버킷이 비어 바로 들어간다.`);
    }
    key.classList.add('drop');
    if (!instant) await sleep(350);
  };
  const reset = () => { build(); filled.length = 0; for (let i = 0; i < N; i++) filled.push(null); detail.reset(); };
  const tabsEl = el('div', 'seg viz-tabhead');
  const tabBtns = (['chain', 'probe'] as const).map((m) => {
    const b = el('button', '', m === 'chain' ? '체이닝 (Chaining)' : '선형 조사 (Linear Probing)');
    b.addEventListener('click', () => { mode = m; tabBtns.forEach((x) => x.classList.toggle('on', x === b)); reset(); });
    tabsEl.append(b);
    return b;
  });
  tabBtns[0]!.classList.add('on');
  const keysEl = el('div', 'hash-keys', `넣을 키: ${KEYS.join(', ')}`);
  const pl = player({ steps: KEYS.length, go: (i, instant) => insert(KEYS[i]!, instant), reset, label: (i) => `${KEYS[i]} → ${KEYS[i]! % N}`, delay: 600 });
  reset();
  body.append(tabsEl, keysEl, pl.el, table, el('p', 'muted small', '서로 다른 키가 같은 주소로 계산되는 것이 충돌(Collision), 그 키들을 동의어(Synonym)라 한다. 해결: 체이닝, 개방 주소법(선형·이차 조사, 이중 해싱)'), detail.el);
  return { el: root, focus: (names) => tabBtns.forEach((b) => b.classList.toggle('focus', nameHits([b.textContent!], names))), dispose: () => pl.dispose() };
}

// ── 커버리지 실험판 ───────────────────────────────────
export function coverage(): Viz {
  const { root, body } = frame('커버리지 실험판', 'if (A && B) — Statement · Decision · Condition · MC/DC');
  const detail = detailBox('테스트 케이스를 켜고 끄면, 어떤 커버리지를 만족하는지 바로 바뀝니다.');
  const code = el('pre', 'cov-code', 'if (a > 0 && b > 0)   // 조건 A: a > 0, 조건 B: b > 0\n    X();               // 결정이 참일 때만 실행\nY();');
  const cases = [[true, true], [true, false], [false, true], [false, false]] as const;
  const on = [true, false, false, true];
  const grid = el('div', 'cov-grid');
  const lamps = el('div', 'cov-lamps');
  const T = (b: boolean) => (b ? '참' : '거짓');
  type Cases = (readonly [boolean, boolean])[];
  const KINDS: { name: string; en: string; test: (s: Cases) => boolean; why: string }[] = [
    { name: '구문 커버리지', en: 'Statement', test: (s: (readonly [boolean, boolean])[]) => s.some(([a, b]) => a && b), why: '모든 문장(X 포함)이 한 번은 실행되어야 한다 → 결정이 참인 케이스 하나면 된다.' },
    { name: '결정 커버리지', en: 'Decision (Branch)', test: (s: (readonly [boolean, boolean])[]) => s.some(([a, b]) => a && b) && s.some(([a, b]) => !(a && b)), why: '결정 전체(A && B)가 참·거짓을 한 번씩 가져야 한다.' },
    { name: '조건 커버리지', en: 'Condition', test: (s: (readonly [boolean, boolean])[]) => s.some(([a]) => a) && s.some(([a]) => !a) && s.some(([, b]) => b) && s.some(([, b]) => !b), why: 'A와 B가 각각 참·거짓을 한 번씩 가져야 한다. 결정 결과는 따지지 않는다.' },
    { name: '조건/결정 커버리지', en: 'Condition/Decision', test: (s: (readonly [boolean, boolean])[]) => KINDS[1]!.test(s) && KINDS[2]!.test(s), why: '결정 커버리지와 조건 커버리지를 함께 만족한다.' },
    { name: '변경 조건/결정 커버리지', en: 'MC/DC', test: (s: (readonly [boolean, boolean])[]) => { const has = (a: boolean, b: boolean) => s.some(([x, y]) => x === a && y === b); return has(true, true) && has(false, true) && has(true, false); }, why: '각 조건이 "혼자서" 결정 결과를 바꾸는 쌍이 있어야 한다: A는 (참,참)↔(거짓,참), B는 (참,참)↔(참,거짓).' },
    { name: '다중 조건 커버리지', en: 'Multiple Condition', test: (s: (readonly [boolean, boolean])[]) => s.length === 4, why: '조건들의 모든 조합(2² = 4가지)을 시험한다. 가장 강하다.' },
  ];
  const paint = () => {
    grid.replaceChildren(...['', 'A (a > 0)', 'B (b > 0)', 'A && B', 'X 실행'].map((h) => el('span', 'cov-h', h)));
    cases.forEach(([a, b], k) => {
      const t = el('button', `cov-case${on[k] ? ' on' : ''}`, on[k] ? '✓ 사용' : '사용 안 함');
      t.addEventListener('click', () => { on[k] = !on[k]; paint(); });
      grid.append(t, el('span', `cov-v ${a}`, T(a)), el('span', `cov-v ${b}`, T(b)), el('span', `cov-v ${a && b}`, T(a && b)), el('span', 'cov-v', a && b ? 'O' : '-'));
    });
    const sel = cases.filter((_, k) => on[k]);
    lamps.replaceChildren(...KINDS.map((K) => {
      const ok = K.test(sel);
      const b = el('button', `cov-lamp${ok ? ' ok' : ''}`);
      b.append(el('b', '', `${ok ? '●' : '○'} ${K.name}`), el('span', '', K.en));
      b.addEventListener('click', () => detail.show(K.name, K.why, ok ? '지금 고른 케이스로 만족' : '지금 고른 케이스로는 부족'));
      return b;
    }));
  };
  paint();
  body.append(code, grid, lamps, el('p', 'muted small', '강도: 구문 < 결정 < 조건/결정 < MC/DC < 다중 조건 (조건 커버리지는 결정 커버리지를 보장하지 않는다)'), detail.el);
  return {
    el: root,
    focus: (names) => lamps.querySelectorAll('.cov-lamp').forEach((b, k) => b.classList.toggle('focus', nameHits([KINDS[k]!.name, KINDS[k]!.en], names))),
    dispose: () => {},
  };
}

// ── V-모델 ────────────────────────────────────────────
export function vModel(): Viz {
  const { root, body } = frame('V-모델', '개발 단계 ↔ 테스트 단계');
  const detail = detailBox('▶ 재생을 누르면 왼쪽으로 내려가며 개발하고, 오른쪽으로 올라가며 짝이 되는 단계를 검증합니다.');
  const L = [['요구사항 분석', '사용자가 원하는 것'], ['시스템 설계', '시스템 전체 구조'], ['상세 설계', '모듈 사이 인터페이스'], ['코딩', '모듈 구현']];
  const R = [['인수 테스트', 'Acceptance Test', '사용자의 요구사항을 만족하는지 사용자가 확인한다 (알파·베타 테스트)'], ['시스템 테스트', 'System Test', '완성된 시스템 전체의 기능·성능을 실제 환경과 비슷하게 검사한다'], ['통합 테스트', 'Integration Test', '모듈을 합치며 인터페이스 오류를 찾는다 (상향식·하향식)'], ['단위 테스트', 'Unit Test', '모듈 하나하나가 제대로 동작하는지 검사한다 (화이트박스 위주)']];
  const s = svg('svg', { viewBox: '0 0 720 330', class: 'vm-svg' });
  const BW = 150;
  const pos = (side: 0 | 1, k: number) => ({ x: side ? 540 - k * 45 : 30 + k * 45, y: 30 + k * 72 });
  const lines: SVGLineElement[] = [];
  const boxes: SVGGElement[] = [];
  for (let k = 0; k < 4; k++) {
    const a = pos(0, k), b = pos(1, k);
    const ln = svg('line', { x1: a.x + BW, y1: a.y + 21, x2: b.x, y2: b.y + 21, class: 'vm-pair' });
    s.append(ln);
    lines.push(ln);
  }
  const mk = (x: number, y: number, t: string, sub: string, side: number) => {
    const g = svg('g', { class: `vm-box s${side}` });
    g.append(svg('rect', { x, y, width: BW, height: 42, rx: 9 }), svg('text', { x: x + BW / 2, y: y + 19, 'text-anchor': 'middle', class: 'vm-t' }, t), svg('text', { x: x + BW / 2, y: y + 34, 'text-anchor': 'middle', class: 'vm-s' }, sub));
    s.append(g);
    boxes.push(g);
    return g;
  };
  L.forEach(([t, sub], k) => { const p = pos(0, k); mk(p.x, p.y, t!, sub!, 0); });
  R.forEach(([t, en], k) => { const p = pos(1, k); mk(p.x, p.y, t!, en!, 1); });
  s.append(svg('path', { d: `M${pos(0, 3).x + BW / 2} ${pos(0, 3).y + 42} L360 322 L${pos(1, 3).x + BW / 2} ${pos(1, 3).y + 42}`, class: 'vm-v' }));
  const steps = [...L.map((x, k) => ({ i: k, t: x[0]!, b: `개발: ${x[1]}` })), ...[3, 2, 1, 0].map((k) => ({ i: 4 + k, t: R[k]![0]!, b: `${R[k]![2]} — 짝: ${L[k]![0]}` }))];
  const pl = player({
    steps: steps.length,
    go: (k, instant) => {
      const st = steps[k]!;
      boxes.forEach((b, j) => b.classList.toggle('active', j === st.i));
      if (st.i >= 4) lines[st.i - 4]!.classList.add('on');
      if (!instant) detail.show(st.t, st.b);
    },
    reset: () => { boxes.forEach((b) => b.classList.remove('active')); lines.forEach((l) => l.classList.remove('on')); detail.reset(); },
    label: (k) => steps[k]!.t,
    delay: 900,
  });
  const sc = el('div', 'viz-scroll');
  sc.append(s);
  body.append(pl.el, sc, detail.el);
  return {
    el: root,
    focus: (names) => boxes.forEach((b, j) => b.classList.toggle('focus', j >= 4 && nameHits([R[j - 4]![0], R[j - 4]![1]], names))),
    dispose: () => pl.dispose(),
  };
}

// ── 통합 테스트: 하향식(스텁) · 상향식(드라이버) ────────
export function integration(): Viz {
  const { root, body } = frame('통합 테스트와 임시 모듈', 'Top-down · Stub / Bottom-up · Driver');
  const detail = detailBox('방식을 고르고 ▶ 재생을 누르면, 어떤 모듈이 진짜이고 어떤 모듈을 임시 모듈로 대신하는지 단계별로 보여 줍니다.');
  const N = [
    { id: 'M', x: 300, y: 40 }, { id: 'A', x: 170, y: 140 }, { id: 'B', x: 430, y: 140 },
    { id: 'A1', x: 100, y: 240 }, { id: 'A2', x: 240, y: 240 }, { id: 'B1', x: 430, y: 240 },
  ];
  const E = [['M', 'A'], ['M', 'B'], ['A', 'A1'], ['A', 'A2'], ['B', 'B1']];
  type St = Record<string, 'real' | 'stub' | 'driver' | 'none'>;
  const modes = {
    top: { name: '하향식 (Top-down)', steps: [
      { s: { M: 'real', A: 'stub', B: 'stub' } as St, t: '메인(M)만 진짜, 아래는 스텁', b: '맨 위 M부터 시험한다. 아직 없는 A, B 자리에 정해진 값만 돌려주는 스텁을 둔다.' },
      { s: { M: 'real', A: 'real', B: 'stub', A1: 'stub', A2: 'stub' } as St, t: 'A를 진짜로 바꾼다', b: '스텁 A를 실제 A로 바꾸고, A가 부르는 A1, A2는 다시 스텁으로 둔다(깊이 우선).' },
      { s: { M: 'real', A: 'real', B: 'stub', A1: 'real', A2: 'real' } as St, t: 'A1, A2 통합', b: 'A 아래 모듈을 실제로 바꾸며 인터페이스를 검사한다.' },
      { s: { M: 'real', A: 'real', B: 'real', A1: 'real', A2: 'real', B1: 'real' } as St, t: 'B 쪽까지 모두 통합', b: '스텁이 모두 실제 모듈로 바뀌면 끝. 장점: 주요 흐름(상위 제어)을 일찍 확인한다.' },
    ] },
    bottom: { name: '상향식 (Bottom-up)', steps: [
      { s: { A1: 'real', A2: 'real', B1: 'real', A: 'driver', B: 'driver' } as St, t: '맨 아래 모듈 + 드라이버', b: '가장 아래 모듈(A1, A2, B1)부터 시험한다. 이들을 불러 줄 상위 모듈 자리에 드라이버를 둔다. 묶음을 클러스터라 한다.' },
      { s: { A1: 'real', A2: 'real', B1: 'real', A: 'real', B: 'real', M: 'driver' } as St, t: '드라이버를 실제 A, B로', b: '드라이버를 실제 상위 모듈로 바꾸고, 그 위(M) 자리에는 다시 드라이버를 둔다.' },
      { s: { A1: 'real', A2: 'real', B1: 'real', A: 'real', B: 'real', M: 'real' } as St, t: '메인까지 통합', b: '마지막으로 M을 결합하면 끝. 장점: 아래쪽 핵심 기능을 철저히, 스텁이 필요 없다.' },
    ] },
  };
  const s = svg('svg', { viewBox: '0 0 600 290', class: 'it-svg' });
  for (const [a, b] of E) {
    const p = N.find((n) => n.id === a)!, q = N.find((n) => n.id === b)!;
    s.append(svg('line', { x1: p.x, y1: p.y + 20, x2: q.x, y2: q.y - 20, class: 'it-edge' }));
  }
  const nodes = new Map(N.map((n) => {
    const g = svg('g', { class: 'it-node none' });
    g.append(svg('rect', { x: n.x - 52, y: n.y - 20, width: 104, height: 40, rx: 9 }), svg('text', { x: n.x, y: n.y - 1, 'text-anchor': 'middle', class: 'it-id' }, n.id), svg('text', { x: n.x, y: n.y + 13, 'text-anchor': 'middle', class: 'it-role' }, ''));
    s.append(g);
    return [n.id, g] as const;
  }));
  let mode: keyof typeof modes = 'top';
  const paintSt = (st: St) => {
    for (const [id, g] of nodes) {
      const k = st[id] ?? 'none';
      g.setAttribute('class', `it-node ${k}`);
      g.querySelector('.it-role')!.textContent = { real: '실제 모듈', stub: '스텁(가짜 하위)', driver: '드라이버(가짜 상위)', none: '아직 없음' }[k];
    }
  };
  const tabsEl = el('div', 'seg viz-tabhead');
  let pl: ReturnType<typeof player> | null = null;
  const plHost = el('div');
  const open = (m: keyof typeof modes) => {
    mode = m;
    tabsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === (m === 'top' ? 0 : 1)));
    pl?.dispose();
    const st = modes[m].steps;
    pl = player({ steps: st.length, go: (k, instant) => { paintSt(st[k]!.s); if (!instant) detail.show(st[k]!.t, st[k]!.b); }, reset: () => { paintSt({}); detail.reset(); }, label: (k) => st[k]!.t, delay: 1300 });
    plHost.replaceChildren(pl.el);
    paintSt({});
  };
  for (const m of ['top', 'bottom'] as const) {
    const b = el('button', '', modes[m].name);
    b.addEventListener('click', () => open(m));
    tabsEl.append(b);
  }
  const legend = el('div', 'it-legend');
  for (const [c, t] of [['real', '실제 모듈'], ['stub', '스텁: 호출당하는 하위 모듈 흉내'], ['driver', '드라이버: 호출하는 상위 모듈 흉내']] as const) legend.append(el('span', `it-key ${c}`, t));
  const sc = el('div', 'viz-scroll');
  sc.append(s);
  body.append(tabsEl, plHost, sc, legend, detail.el);
  open('top');
  void mode;
  return {
    el: root,
    focus: (names) => {
      legend.querySelectorAll('.it-key').forEach((k) => k.classList.toggle('focus', nameHits([k.textContent!.split(':')[0]!], names)));
      if (nameHits(['상향식', '드라이버', 'Driver', 'Bottom-up'], names)) open('bottom');
    },
    dispose: () => pl?.dispose(),
  };
}

// ── 클라우드 서비스 모델: 누가 관리하나 ─────────────────
export function cloud(): Viz {
  const { root, body } = frame('클라우드 서비스 모델', 'IaaS · PaaS · SaaS');
  const detail = detailBox('열을 누르면 그 모델에서 사용자가 직접 관리하는 부분과 클라우드 업체가 맡는 부분을 보여 줍니다.');
  const layers = ['응용 프로그램', '데이터', '런타임', '미들웨어', '운영체제', '가상화', '서버', '저장소', '네트워크'];
  const models = [
    { name: '온프레미스', en: 'On-Premises', user: 9, desc: '자체 전산실: 하드웨어부터 응용 프로그램까지 모두 직접 관리한다.' },
    { name: 'IaaS', en: 'Infrastructure as a Service', user: 5, desc: '서버·저장소·네트워크(+가상화)를 빌린다. 운영체제부터는 사용자가 설치·관리. 예: AWS EC2' },
    { name: 'PaaS', en: 'Platform as a Service', user: 2, desc: '운영체제·런타임·미들웨어까지 제공. 사용자는 응용 프로그램과 데이터만. 예: Heroku, Google App Engine' },
    { name: 'SaaS', en: 'Software as a Service', user: 0, desc: '완성된 소프트웨어를 인터넷으로 쓴다. 사용자는 관리할 것이 없다. 예: Gmail, Microsoft 365' },
  ];
  const grid = el('div', 'cloud-grid');
  const cols: HTMLElement[] = [];
  models.forEach((m, k) => {
    const col = el('button', 'cloud-col');
    col.append(el('b', '', m.name));
    layers.forEach((l, i) => {
      const c = el('span', `cloud-cell ${i < m.user ? 'user' : 'vendor'}`, l);
      c.style.opacity = '0';
      setTimeout(() => tween(200, (t) => { c.style.opacity = String(t); }), k * 220 + i * 35);
      col.append(c);
    });
    col.addEventListener('click', () => { cols.forEach((c) => c.classList.toggle('picked', c === col)); detail.show(`${m.name} (${m.en})`, m.desc); });
    grid.append(col);
    cols.push(col);
  });
  const legend = el('div', 'it-legend');
  legend.append(el('span', 'cloud-key user', '사용자가 관리'), el('span', 'cloud-key vendor', '클라우드 업체가 관리'));
  body.append(grid, legend, detail.el);
  return { el: root, focus: (names) => cols.forEach((c, k) => c.classList.toggle('focus', nameHits([models[k]!.name, models[k]!.en], names))), dispose: () => {} };
}

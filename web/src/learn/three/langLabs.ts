// 언어 3D 실습: C 포인터(메모리 칸·주소·화살표), Python 자료형(인덱스·슬라이싱·리스트 메서드·복사).
import { ConeGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import { hsl } from './adapt';
import type { SyncOpts, Want } from './keyed';
import { base, flashAll, hopAll } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info, type World } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** a에서 b로 가는 화살표(막대 + 머리) */
function arrow(w: World, a: Vector3, b: Vector3, color: number): Group {
  const g = new Group();
  const d = b.clone().sub(a).normalize();
  const end = b.clone().sub(d.clone().multiplyScalar(0.25));
  g.add(w.bar(a, end, color, 0.05, 0.95));
  const cone = new Mesh(new ConeGeometry(0.16, 0.36, 12), new MeshBasicMaterial({ color }));
  cone.position.copy(end);
  cone.quaternion.setFromUnitVectors(V(0, 1, 0), d);
  g.add(cone);
  return g;
}

// ───────────────────────── C 포인터 ─────────────────────────

interface Cell { id: string; name: string; addr: number; val: string; x: number; z: number; color?: number }
interface Ptr { id: string; name: string; x: number; z: number; to: string; addr?: number }
const MI: Record<string, Info> = {
  cell: { title: '메모리 칸', sub: '값 · 이름 · 주소', body: '윗면이 저장된 값, 앞의 이름표가 변수 이름과 주소입니다. int는 4바이트라 배열 원소의 주소가 4씩 늘어납니다.' },
  ptr: { title: '포인터 변수', sub: '주소를 담는 변수', body: '포인터는 다른 칸의 "주소"를 값으로 가집니다. 화살표가 가리키는 칸이 *p 입니다.\n\np++는 화살표를 다음 원소로 옮기고(주소 +4), *p는 화살표 끝 칸의 값을 읽습니다.' },
};

export function pointerLab(): Viz {
  return lab({ title: 'C 포인터 3D', en: '*p++ · *++p · ++*p · (*p)++ · *(p+2) · %s · 주소 전달', height: 470, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let cells: Cell[] = [], ptrs: Ptr[] = [], out = '', frames: { name: string; x0: number; x1: number }[] = [];
    const find = (id: string) => cells.find((c) => c.id === id) ?? ptrs.find((p) => p.id === id);
    const posOf = (id: string) => { const c = find(id)!; return V(c.x, 0, c.z); };
    function want(): Want[] {
      const P = w.pal;
      const o: Want[] = [];
      for (const f of frames) o.push({ key: `fr:${f.name}`, kind: 'sign', pos: V((f.x0 + f.x1) / 2, 0.25, -2.6), runs: [{ text: f.name, color: P.text, weight: 800, size: 38 }], height: 0.4, bg: hex(P.slab) });
      for (const c of cells) {
        o.push({ key: `c:${c.id}`, kind: 'block', pos: V(c.x, 0, c.z), size: [1.5, 0.5, 1.1], color: c.color ?? P.cell, text: c.val, textColor: c.color ? '#ffffff' : P.cellText, info: MI.cell });
        o.push({ key: `cn:${c.id}`, kind: 'sign', pos: V(c.x, 0.2, c.z + 0.95), runs: [{ text: c.name, color: P.text, weight: 800, size: 36 }, { text: `  ${c.addr}`, color: P.muted, size: 30, mono: true }], height: 0.34, info: MI.cell });
      }
      for (const p of ptrs) {
        const t = find(p.to)!;
        const addr = (t as { addr?: number }).addr ?? 0;
        o.push({ key: `p:${p.id}`, kind: 'block', pos: V(p.x, 0, p.z), size: [1.5, 0.5, 1.1], color: 0x7c3aed, text: String(addr || '?'), textColor: '#ffffff', info: MI.ptr });
        o.push({ key: `pn:${p.id}`, kind: 'sign', pos: V(p.x, 0.2, p.z + 0.95), runs: [{ text: p.name, color: P.text, weight: 800, size: 36 }, { text: p.addr ? `  ${p.addr}` : '  포인터', color: P.muted, size: 30, mono: !!p.addr }], height: 0.34, info: MI.ptr });
        const a = V(p.x, 0.75, p.z - 0.2), z = posOf(p.to).add(V(0, 0.75, 0.2));
        o.push({ key: `ar:${p.id}`, kind: 'obj', pos: V(0, 0, 0), sig: `${a.toArray()}|${z.toArray()}`, make: () => arrow(w, a, z, 0x7c3aed), info: MI.ptr });
      }
      o.push({ key: 'out', kind: 'sign', pos: V(-6.4, 0.4, 3.3), runs: [{ text: '출력: ', color: P.muted, size: 38 }, { text: out || ' ', color: P.text, weight: 800, mono: true }], height: 0.5, bg: hex(P.pend) });
      return o;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const arrSetup = () => {
      frames = [];
      cells = [10, 20, 30].map((v, i) => ({ id: `a${i}`, name: `a[${i}]`, addr: 1000 + i * 4, val: String(v), x: -3 + i * 2.1, z: -0.8 }));
      ptrs = [{ id: 'p', name: 'p', x: -1, z: 2.4, to: 'a0' }];
      out = '';
    };
    /** 칸의 값이 출력으로 날아간다 */
    const emit = async (id: string, text: string) => {
      const c = k.get(`c:${id}`);
      if (c) {
        const g = w.block(1.2, 0.4, 0.8, w.pal.warn, { text, color: '#ffffff' });
        g.position.copy(c.position).add(V(0, 0.6, 0));
        root.add(g);
        b.temp.add(g);
        await w.move(g, V(-6.4, 0.8, 3.3), 700, 1.2);
        b.temp.delete(g);
        void w.vanish(g, 'shrink', 200);
      }
      out = out ? `${out} ${text}` : text;
      await draw({ ms: 200 });
    };
    const read = async (id: string) => { await flashAll(w, [k.get(`c:${id}`)], w.pal.good, 450); await emit(id, cells.find((c) => c.id === id)!.val); };
    const moveP = async (to: string) => { ptrs[0]!.to = to; await draw({ ms: 600 }); };
    const setVal = async (id: string, v: string) => {
      const o = k.get(`c:${id}`) as Group;
      await w.flip(o, 600, () => w.setTop(o, v, w.pal.cellText));
      cells.find((c) => c.id === id)!.val = v;
      await draw({ ms: 150 });
    };
    async function expr(name: string) {
      arrSetup();
      await draw({ ms: 450, exit: 'shrink' });
      w.fit(-7.4, 4.4, -2.6, 4);
      l.code(`int a[] = {10, 20, 30};\nint *p = a;\nprintf("%d", ${name});`);
      if (name === '*p++') {
        l.say('*p++ = *(p++): 후위 ++가 먼저 묶이지만 "나중에" 증가합니다. 지금 가리키는 값 10을 쓰고, 그 뒤 p가 a[1]로 옮겨 갑니다.', 'info');
        await read('a0'); await moveP('a1');
        l.say('결과 10, p는 a[1](1004)을 가리킵니다. 배열 값은 그대로.', 'ok');
      } else if (name === '*++p') {
        l.say('*++p = *(++p): p를 먼저 a[1]로 옮기고, 옮긴 곳의 값을 읽습니다.', 'info');
        await moveP('a1'); await read('a1');
        l.say('결과 20, p는 a[1]. 배열 값은 그대로.', 'ok');
      } else if (name === '++*p') {
        l.say('++*p = ++(*p): p는 그대로, 가리키는 값 자체를 1 올립니다.', 'info');
        await setVal('a0', '11'); await read('a0');
        l.say('결과 11, a[0]이 11로 바뀌었습니다. p는 a[0] 그대로.', 'ok');
      } else if (name === '(*p)++') {
        l.say('(*p)++: 지금 값 10을 먼저 쓰고, 그 뒤 a[0]을 1 올립니다.', 'info');
        await read('a0'); await setVal('a0', '11');
        l.say('결과 10, 출력이 끝난 뒤 a[0]은 11. p는 그대로.', 'ok');
      } else if (name === '*(p+2)') {
        l.say('*(p+2): p는 그대로 두고, 두 칸 뒤(주소 1000 + 2×4 = 1008)의 값을 읽습니다. p[2]와 같습니다.', 'info');
        const ghost = w.sphere(0.2, 0xfacc15, 0.9);
        ghost.position.copy(posOf('a0').add(V(0, 1.2, 0)));
        root.add(ghost); b.temp.add(ghost);
        await w.move(ghost, posOf('a1').add(V(0, 1.2, 0)), 450, 0.4);
        await w.move(ghost, posOf('a2').add(V(0, 1.2, 0)), 450, 0.4);
        await read('a2');
        b.temp.delete(ghost); void w.vanish(ghost, 'shrink', 200);
        l.say('결과 30, p는 여전히 a[0]. 포인터 + 정수는 "원소 개수"만큼 이동합니다(바이트가 아님).', 'ok');
      }
    }
    async function strDemo(fmt: '%s' | '%c') {
      frames = [];
      cells = ['A', 'B', 'C', '\\0'].map((ch, i) => ({ id: `s${i}`, name: `s[${i}]`, addr: 2000 + i, val: ch, x: -3 + i * 1.9, z: -0.8, color: ch === '\\0' ? 0x64748b : undefined }));
      ptrs = [{ id: 'p', name: 's', x: -1, z: 2.4, to: 's0' }];
      out = '';
      await draw({ ms: 450, exit: 'shrink' });
      w.fit(-7.4, 4.6, -2.6, 4);
      l.code(`char s[] = "ABC";\nprintf("${fmt}", ${fmt === '%s' ? 's' : '*s'});`);
      if (fmt === '%c') { await read('s0'); l.say('%c는 글자(값) 하나만 출력합니다: *s = s[0] = A.', 'ok'); return; }
      for (let i = 0; i < 4; i++) {
        await moveP(`s${i}`);
        if (i === 3) { await flashAll(w, [k.get('c:s3')], w.pal.bad, 600); break; }
        await read(`s${i}`);
      }
      l.say('%s는 주소부터 시작해 널 문자(\\0)를 만날 때까지 한 글자씩 출력합니다 → ABC. 그래서 문자열 끝에는 \\0이 꼭 있어야 합니다.', 'ok');
    }
    async function callDemo(byRef: boolean) {
      frames = [{ name: 'main()', x0: -6, x1: -2.6 }, { name: byRef ? 'swap(int *a, int *b)' : 'swap(int a, int b)', x0: 0.6, x1: 4 }];
      cells = [{ id: 'x', name: 'x', addr: 3000, val: '1', x: -6, z: -0.6 }, { id: 'y', name: 'y', addr: 3004, val: '2', x: -3.6, z: -0.6 }];
      ptrs = [];
      if (!byRef) cells.push({ id: 'ca', name: 'a (복사본)', addr: 5000, val: '1', x: 1.4, z: -0.6, color: 0x0d9488 }, { id: 'cb', name: 'b (복사본)', addr: 5004, val: '2', x: 3.8, z: -0.6, color: 0x0d9488 });
      else ptrs = [{ id: 'pa', name: 'a', x: 1.4, z: 2.0, to: 'x' }, { id: 'pb', name: 'b', x: 3.8, z: 2.0, to: 'y' }];
      out = '';
      await draw({ ms: 500, exit: 'shrink' });
      w.fit(-7.6, 5.4, -3.2, 3.6);
      l.code(byRef ? 'swap(&x, &y);   // 주소를 넘긴다\nvoid swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }' : 'swap(x, y);   // 값을 넘긴다\nvoid swap(int a, int b) { int t = a; a = b; b = t; }');
      if (!byRef) {
        l.say('값 전달: x, y의 값이 함수의 a, b로 "복사"됩니다. 함수는 복사본만 바꿉니다.', 'info');
        await Promise.all([setVal('ca', '2'), setVal('cb', '1')]);
        await sleep(400);
        await flashAll(w, [k.get('c:x'), k.get('c:y')], w.pal.bad, 800);
        l.say('함수가 끝나면 복사본은 사라지고 main의 x = 1, y = 2 그대로입니다. 바꾸려면 주소를 넘겨야 합니다.', 'bad');
      } else {
        l.say('주소 전달: a, b에는 x, y의 주소가 들어 있어(화살표) *a, *b로 main의 칸을 직접 바꿉니다.', 'info');
        await hopAll(w, [k.get('p:pa'), k.get('p:pb')], 0.4, 500);
        await Promise.all([setVal('x', '2'), setVal('y', '1')]);
        await flashAll(w, [k.get('c:x'), k.get('c:y')], w.pal.good, 800);
        l.say('main의 x = 2, y = 1로 실제로 바뀌었습니다. 배열을 넘길 때도 시작 주소가 넘어가므로 원본이 바뀝니다.', 'ok');
      }
    }
    async function dbl() {
      frames = [];
      cells = [{ id: 'x', name: 'x', addr: 3000, val: '7', x: 3.2, z: -0.6 }];
      ptrs = [{ id: 'p', name: 'p', x: -0.4, z: -0.6, to: 'x', addr: 4000 }, { id: 'pp', name: 'pp', x: -4, z: -0.6, to: 'p' }];
      out = '';
      await draw({ ms: 450, exit: 'shrink' });
      w.fit(-6, 5, -2.6, 3);
      l.code('int x = 7;\nint *p = &x;\nint **pp = &p;\nprintf("%d", **pp);');
      await hopAll(w, [k.get('p:pp')], 0.4, 450);
      await hopAll(w, [k.get('p:p')], 0.4, 450);
      await read('x');
      l.say('**pp: pp가 가리키는 p를 따라가고(*pp = p), 다시 p가 가리키는 x를 따라가 7을 읽습니다. 포인터 변수 자체를 함수에서 바꿀 때 이중 포인터를 넘깁니다.', 'ok');
    }
    async function reset() { arrSetup(); await draw({ exit: 'shrink' }); w.fit(-7.4, 4.4, -2.6, 4); l.code('int a[] = {10, 20, 30};\nint *p = a;'); }
    void reset();
    return {
      hint: '식 단추를 누르면 값을 읽어 출력하는 순간과 포인터 화살표가 움직이는 순간이 보입니다. 순서가 핵심입니다.',
      reset,
      groups: [
        { name: '식', en: 'int *p = a', hue: 270, cmds: ['*p++', '*++p', '++*p', '(*p)++', '*(p+2)'].map((e): Cmd => ({ name: e, run: () => expr(e) })) },
        { name: '문자열', en: 'char[]', hue: 30, cmds: [{ name: '%s', run: () => strDemo('%s') }, { name: '%c', run: () => strDemo('%c') }] },
        { name: '함수에 넘기기', en: 'call', hue: 150, cmds: [{ name: '값 전달 swap(x, y)', run: () => callDemo(false) }, { name: '주소 전달 swap(&x, &y)', run: () => callDemo(true) }, { name: '이중 포인터 **pp', run: dbl }] },
      ],
    };
  } });
}

// ───────────────────────── Python ─────────────────────────

const PI: Record<string, Info> = {
  idx: { title: '인덱스', sub: '양수는 앞에서, 음수는 뒤에서', body: '앞에서 0, 1, 2 … 뒤에서 -1, -2 … 로 셉니다. 슬라이싱 s[시작:끝:간격]은 끝을 포함하지 않습니다.' },
  list: { title: '리스트', sub: '순서 있음 · 바꿀 수 있음', body: 'append·insert·pop·remove·reverse로 제자리에서 바뀝니다(mutable). 튜플은 바꿀 수 없습니다.' },
  name: { title: '변수 이름', sub: '객체를 가리키는 이름표', body: 'Python 변수는 객체를 가리키는 이름표입니다. b = a는 같은 리스트를 두 이름이 함께 가리킵니다.' },
};

export function pythonLab(): Viz {
  return lab({ title: 'Python 자료형 3D', en: '인덱스 · 슬라이싱 · 리스트 메서드 · 집합 · 복사', height: 470, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    type It = { id: string; v: string };
    let mode: 'str' | 'list' | 'copy' = 'str';
    let row: It[] = [], res: It[] = [], lists: { id: string; items: It[]; z: number }[] = [], names: { n: string; to: string }[] = [];
    let seq = 0;
    const XS = (i: number, n: number) => (i - (n - 1) / 2) * 1.35;
    function want(): Want[] {
      const P = w.pal;
      const o: Want[] = [];
      if (mode === 'str' || mode === 'list') {
        row.forEach((it, i) => {
          o.push({ key: `r:${it.id}`, kind: 'block', pos: V(XS(i, row.length), 0, 0), size: [1.15, 0.55, 1.0], color: hsl(200 + i * 22, 0.55, 0.5), text: it.v, textColor: '#ffffff', info: mode === 'str' ? PI.idx : PI.list });
          o.push({ key: `ip:${i}`, kind: 'sign', pos: V(XS(i, row.length), 0.15, -0.95), runs: [{ text: String(i), color: P.text, weight: 800, size: 36, mono: true }], height: 0.32, info: PI.idx });
          o.push({ key: `in:${i}`, kind: 'sign', pos: V(XS(i, row.length), 0.15, 0.95), runs: [{ text: String(i - row.length), color: P.muted, size: 34, mono: true }], height: 0.3, info: PI.idx });
        });
        o.push({ key: 'lab', kind: 'sign', pos: V(XS(0, row.length) - 1.6, 0.3, 0), runs: [{ text: mode === 'str' ? 's =' : 'a =', color: P.text, weight: 800, mono: true }], height: 0.48 });
        res.forEach((it, i) => o.push({ key: `x:${it.id}`, kind: 'block', pos: V(XS(i, Math.max(res.length, 1)), 0, 3.2), size: [1.15, 0.5, 0.9], color: P.good, text: it.v, textColor: '#ffffff' }));
        if (res.length || mode === 'str') o.push({ key: 'rlab', kind: 'sign', pos: V(-5.6, 0.3, 3.2), runs: [{ text: '결과', color: P.text, weight: 800, size: 38 }], height: 0.4, bg: hex(P.slab) });
      } else {
        for (const L of lists) {
          L.items.forEach((it, i) => o.push({ key: `l:${L.id}:${it.id}`, kind: 'block', pos: V(XS(i, L.items.length) + 1, 0, L.z), size: [1.15, 0.5, 0.9], color: hsl(200 + i * 30, 0.55, 0.5), text: it.v, textColor: '#ffffff', info: PI.list }));
          o.push({ key: `lb:${L.id}`, kind: 'block', pos: V(1, 0, L.z), size: [L.items.length * 1.35 + 0.5, 0.08, 1.3], color: P.slab, info: PI.list });
        }
        names.forEach((nm, i) => {
          const L = lists.find((x) => x.id === nm.to)!;
          const p = V(-5.5, 0, -1.6 + i * 2.4);
          o.push({ key: `n:${nm.n}`, kind: 'block', pos: p, size: [1.3, 0.55, 0.9], color: 0x7c3aed, text: nm.n, textColor: '#ffffff', info: PI.name });
          const a = p.clone().add(V(0.7, 0.3, 0)), z = V(1 - (L.items.length * 1.35) / 2 - 0.2, 0.3, L.z);
          o.push({ key: `na:${nm.n}`, kind: 'obj', pos: V(0, 0, 0), sig: `${a.toArray()}|${z.toArray()}`, make: () => arrow(w, a, z, 0x7c3aed), info: PI.name });
        });
      }
      return o;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const mk = (v: string): It => ({ id: `i${seq++}`, v });
    async function setStr() { mode = 'str'; row = [...'PYTHON'].map(mk); res = []; await draw({ exit: 'shrink', ms: 450 }); w.fit(-6.6, 5.2, -2.2, 4.2); }
    async function slice(a: number | null, z: number | null, st: number, label: string) {
      if (mode !== 'str') await setStr();
      res = [];
      await draw({ ms: 300, exit: 'shrink' });
      const n = row.length;
      const start = a ?? (st > 0 ? 0 : n - 1), end = z ?? (st > 0 ? n : -1);
      const s0 = start < 0 ? start + n : start, e0 = z !== null && z < 0 ? z + n : end;
      l.code(`s = "PYTHON"\ns${label}`);
      const marker = w.sphere(0.2, 0xfacc15, 0.9);
      root.add(marker); b.temp.add(marker);
      for (let i = s0; st > 0 ? i < e0 : i > e0; i += st) {
        const o = k.get(`r:${row[i]!.id}`)!;
        marker.position.copy(o.position).add(V(0, 1.0, 0));
        await w.hop(o, 0.35, 280);
        const it = mk(row[i]!.v);
        res.push(it);
        await draw({ ms: 450, arc: 1, spawn: (key) => (key === `x:${it.id}` ? o.position.clone() : undefined) });
      }
      if (z !== null && e0 >= 0 && e0 < n) await w.flash(k.get(`r:${row[e0]!.id}`)!, w.pal.bad, 600);
      b.temp.delete(marker); void w.vanish(marker, 'shrink', 200);
      l.say(`s${label} → '${res.map((x) => x.v).join('')}'. 시작 ${start}부터 간격 ${st}로, 끝 ${z ?? '(끝까지)'}${z !== null ? '은 포함하지 않습니다(빨강)' : ''}.`, 'ok');
    }
    async function setList() { mode = 'list'; row = ['1', '2', '3'].map(mk); res = []; await draw({ exit: 'shrink', ms: 450 }); w.fit(-6.2, 6.2, -2.2, 3.6); }
    async function method(m: string) {
      if (mode !== 'list') await setList();
      l.code(`a = [${row.map((x) => x.v).join(', ')}]\na.${m}`);
      if (m === 'append(4)') { row.push(mk('4')); await draw({ ms: 550, spawn: (key, to) => (key.startsWith('r:') && !k.has(key) ? to.clone().add(V(0, 3, 0)) : undefined) }); l.say('append는 끝에 하나를 붙입니다.', 'ok'); }
      else if (m === 'insert(1, 9)') { row.splice(1, 0, mk('9')); await draw({ ms: 600, spawn: (key, to) => (key.startsWith('r:') && !k.has(key) ? to.clone().add(V(0, 3, 0)) : undefined) }); l.say('insert(1, 9): 1번 자리에 끼워 넣고, 뒤의 원소들은 한 칸씩 밀려납니다.', 'ok'); }
      else if (m === 'pop()') {
        const last = row[row.length - 1];
        if (!last) { l.say('빈 리스트에서 pop()하면 IndexError입니다.', 'bad'); return; }
        const o = k.get(`r:${last.id}`)!;
        await w.move(o, V(0, 0.4, 3.2), 600, 1);
        row.pop(); res = [mk(last.v)];
        await draw({ ms: 300 });
        l.say(`pop()은 마지막 원소 ${last.v}를 꺼내 돌려주고 리스트에서 지웁니다. pop(0)은 맨 앞.`, 'ok');
      } else if (m === 'remove(2)') {
        const it = row.find((x) => x.v === '2');
        if (!it) { l.say('값 2가 없으면 remove는 ValueError입니다.', 'bad'); return; }
        await flashAll(w, [k.get(`r:${it.id}`)], w.pal.bad, 500);
        row = row.filter((x) => x !== it);
        await draw({ ms: 600, exit: 'fall' });
        l.say('remove(2)는 "값"이 2인 첫 원소를 지웁니다(인덱스가 아님). 뒤 원소는 앞으로 당겨집니다.', 'ok');
      } else if (m === 'reverse()') { row.reverse(); await draw({ ms: 900, arc: 0.8 }); l.say('reverse()는 제자리에서 순서를 뒤집고 None을 돌려줍니다. 새 리스트가 필요하면 a[::-1].', 'ok'); }
      else if (m === 'extend([5, 6])') { row.push(mk('5'), mk('6')); await draw({ ms: 600, spawn: (key, to) => (key.startsWith('r:') && !k.has(key) ? to.clone().add(V(0, 3, 0)) : undefined) }); l.say('extend는 여러 원소를 하나씩 이어 붙입니다. append([5, 6])이면 리스트 하나가 원소 하나로 들어갑니다.', 'ok'); }
    }
    async function setDemo() {
      mode = 'list'; row = ['1', '2', '3'].map(mk); res = [];
      await draw({ exit: 'shrink', ms: 400 });
      w.fit(-6.2, 6.2, -2.2, 3.6);
      l.code('s = {1, 2, 3}\ns.add(2)\ns.add(4)');
      const dup = w.block(1.15, 0.5, 1.0, w.pal.bad, { text: '2', color: '#ffffff' });
      dup.position.set(0, 3, 0.2); root.add(dup); b.temp.add(dup);
      await w.move(dup, V(XS(1, 3), 0.9, 0.2), 600);
      await w.flash(dup, w.pal.bad, 500);
      b.temp.delete(dup); await w.vanish(dup, 'fall', 500);
      l.say('집합은 중복을 허용하지 않아 add(2)는 아무 일도 하지 않습니다.', 'bad');
      await sleep(600);
      row.push(mk('4'));
      await draw({ ms: 550, spawn: (key, to) => (key.startsWith('r:') && !k.has(key) ? to.clone().add(V(0, 3, 0)) : undefined) });
      l.say('add(4)는 들어갑니다. 집합은 순서가 없어 인덱스로 꺼낼 수 없고, & | - 로 교집합·합집합·차집합을 구합니다.', 'ok');
    }
    async function copyDemo(kind: 'alias' | 'slice') {
      mode = 'copy';
      const base0 = ['1', '2', '3'].map(mk);
      lists = [{ id: 'A', items: base0, z: -1.6 }];
      names = [{ n: 'a', to: 'A' }];
      await draw({ exit: 'shrink', ms: 400 });
      w.fit(-7, 5.6, -3, 3.4);
      if (kind === 'alias') {
        l.code('a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)');
        names.push({ n: 'b', to: 'A' });
        await draw({ ms: 600 });
        l.say('b = a는 리스트를 복사하지 않고, 같은 리스트에 이름표를 하나 더 붙입니다.', 'info');
        await sleep(900);
        lists[0]!.items.push(mk('4'));
        await draw({ ms: 600, spawn: (key, to) => (key.startsWith('l:') && !k.has(key) ? to.clone().add(V(0, 3, 0)) : undefined) });
        l.say('b로 append했는데 a도 [1, 2, 3, 4]가 됩니다 — 같은 객체이기 때문입니다.', 'ok');
      } else {
        l.code('a = [1, 2, 3]\nb = a[:]   # 새 리스트로 복사\nb.append(4)\nprint(a)');
        lists.push({ id: 'B', items: base0.map((x) => mk(x.v)), z: 1.6 });
        names.push({ n: 'b', to: 'B' });
        await draw({ ms: 700, spawn: (key) => { const m = /^l:B:(.+)$/.exec(key); if (!m) return undefined; const i = lists[1]!.items.findIndex((x) => x.id === m[1]); return k.get(`l:A:${base0[i]!.id}`)?.position.clone(); }, arc: 1 });
        l.say('a[:]는 새 리스트를 만들어 원소를 복사합니다(얕은 복사).', 'info');
        await sleep(900);
        lists[1]!.items.push(mk('4'));
        await draw({ ms: 600, spawn: (key, to) => (key.startsWith('l:') && !k.has(key) ? to.clone().add(V(0, 3, 0)) : undefined) });
        l.say('b만 바뀌고 a는 [1, 2, 3] 그대로입니다. 단, 안쪽에 리스트가 들어 있으면 그것은 공유됩니다 → 완전히 나누려면 copy.deepcopy.', 'ok');
      }
    }
    void setStr();
    return {
      hint: '슬라이싱 단추를 누르면 노란 표시가 시작부터 간격만큼 건너뛰며 고른 글자가 결과 줄로 날아갑니다. 위 숫자는 양수 인덱스, 아래는 음수 인덱스.',
      reset: setStr,
      groups: [
        { name: '슬라이싱', en: 's = "PYTHON"', hue: 200, cmds: [
          { name: 's[1:4]', run: () => slice(1, 4, 1, '[1:4]') },
          { name: 's[::-1]', run: () => slice(null, null, -1, '[::-1]') },
          { name: 's[::2]', run: () => slice(null, null, 2, '[::2]') },
          { name: 's[-3:]', run: () => slice(-3, null, 1, '[-3:]') },
          { name: 's[:2]', run: () => slice(null, 2, 1, '[:2]') },
        ] },
        { name: '리스트', en: 'a = [1, 2, 3]', hue: 150, cmds: ['append(4)', 'insert(1, 9)', 'pop()', 'remove(2)', 'reverse()', 'extend([5, 6])'].map((m): Cmd => ({ name: m, run: () => method(m) })) },
        { name: '집합·복사', en: 'set · alias', hue: 30, cmds: [{ name: 'set.add', run: setDemo }, { name: 'b = a', run: () => copyDemo('alias') }, { name: 'b = a[:]', run: () => copyDemo('slice') }] },
      ],
    };
  } });
}

// 트랜잭션 3D 실습: 계좌 막대(잔액 = 높이), 로그 줄, 트랜잭션 상태 그래프.
// 정상 이체(COMMIT), 도중 장애(원자성·UNDO), 커밋 뒤 장애(지속성·REDO), 동시 실행(독립성·갱신 분실과 잠금).
import { Group, Vector3 } from 'three';
import { sleep, type Viz } from '../core';
import type { Want } from './keyed';
import { base, flashAll } from './kit';
import { lab } from './lab';
import { V3 } from './tables';
import { hex, type Info } from './world';

const TI: Record<string, Info> = {
  acct: { title: '계좌 (데이터)', sub: '막대 높이 = 잔액', body: '트랜잭션이 읽고 쓰는 데이터입니다. 이체는 "김 계좌에서 빼기"와 "이 계좌에 더하기" 두 작업이 함께 성공해야 의미가 있습니다.' },
  sum: { title: '일관성 (Consistency)', sub: '합계는 늘 10만 원', body: '이체 전후로 두 계좌의 합은 같아야 합니다. 트랜잭션이 끝나면 데이터베이스는 다시 규칙을 만족하는 상태여야 합니다.' },
  log: { title: '로그 (Log)', sub: '변경 기록', body: '데이터를 바꾸기 전에 "누가, 무엇을, 이전 값 → 이후 값"을 먼저 로그에 적습니다(WAL).\n\n장애가 나면: commit 기록이 있는 트랜잭션은 이후 값으로 REDO(재실행), commit이 없는 트랜잭션은 이전 값으로 UNDO(취소)합니다.' },
  state: { title: '트랜잭션 상태', sub: 'Transaction State', body: '활동 → 부분 완료(마지막 연산까지 실행, 아직 커밋 전) → 완료(커밋).\n실행 중 오류가 나면 실패 → 철회(롤백). 철회된 트랜잭션은 재시작하거나 폐기합니다.' },
  t: { title: '트랜잭션', sub: '작업의 논리적 단위', body: '한꺼번에 모두 수행되거나 전혀 수행되지 않아야 하는 연산들의 묶음입니다.' },
};

const STATES: [string, string, number, number][] = [['active', '활동', 0, 0], ['partial', '부분 완료', 2.6, -1.3], ['commit', '완료', 5.2, -1.3], ['failed', '실패', 2.6, 1.3], ['abort', '철회', 5.2, 1.3]];
const EDGES: [string, string][] = [['active', 'partial'], ['partial', 'commit'], ['active', 'failed'], ['partial', 'failed'], ['failed', 'abort']];
const SX = 4.2, SZ = -0.2;

export function txLab(): Viz {
  return lab({ title: '트랜잭션 3D', en: 'ACID · COMMIT · ROLLBACK · REDO · UNDO', height: 480, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    let bal: Record<string, number> = { 김: 10, 이: 0 };
    let log: { text: string; kind: 'start' | 'w' | 'commit' | 'abort' }[] = [];
    let state: string | null = null;
    let down = false;
    let conc = false;
    const P = () => w.pal;
    const AX: Record<string, number> = { 김: -4.4, 이: -1.8 };
    const H = (v: number) => 0.25 + v * 0.28;

    function want(): Want[] {
      const out: Want[] = [];
      const p = P();
      for (const n of ['김', '이']) {
        const v = bal[n]!;
        out.push({ key: `acct:${n}`, kind: 'block', pos: V3(AX[n]!, 0, 0), size: [1.5, down ? 0.12 : H(v), 1.5], color: down ? p.slab : n === '김' ? p.accent : 0x0d9488, info: TI.acct, opacity: down ? 0.5 : undefined });
        out.push({ key: `acct:${n}:v`, kind: 'sign', pos: V3(AX[n]!, (down ? 0.12 : H(v)) + 0.45, 0), runs: [{ text: down ? '?' : `${v}만`, color: p.text, weight: 800 }], height: 0.5, info: TI.acct });
        out.push({ key: `acct:${n}:n`, kind: 'sign', pos: V3(AX[n]!, 0.25, 1.15), runs: [{ text: `${n} 계좌`, color: p.text, weight: 700, size: 38 }], height: 0.4, bg: hex(p.slab), info: TI.acct });
      }
      if (!down && !conc) out.push({ key: 'sum', kind: 'sign', pos: V3(-3.1, 0.25, 1.9), runs: [{ text: '합계 ', color: p.muted, size: 36 }, { text: `${bal['김']! + bal['이']!}만 원`, color: bal['김']! + bal['이']! === 10 ? p.text : '#dc2626', weight: 800, size: 38 }], height: 0.42, info: TI.sum });
      log.forEach((r, i) => {
        const c = { start: p.ghost, w: p.cell, commit: p.good, abort: p.bad }[r.kind];
        out.push({ key: `log:${i}`, kind: 'block', pos: V3(-6.1 + (i % 4) * 2.45, 0, 3.4 + Math.floor(i / 4) * 0.9), size: [2.3, 0.22, 0.72], color: c, text: r.text, textColor: r.kind === 'w' ? p.cellText : '#ffffff', info: TI.log });
      });
      out.push({ key: 'log:t', kind: 'sign', pos: V3(-7.9, 0.3, 3.4), runs: [{ text: '로그', color: p.text, weight: 800, size: 38 }], height: 0.42, bg: hex(p.slab), info: TI.log });
      for (const [id, name, x, z] of STATES) {
        const on = state === id;
        const color = on ? (id === 'commit' ? p.good : id === 'failed' || id === 'abort' ? p.bad : p.warn) : p.slab;
        out.push({ key: `st:${id}`, kind: 'block', pos: V3(SX + x, 0, SZ + z), size: [2, on ? 0.5 : 0.28, 0.9], color, text: name, textColor: on ? '#ffffff' : p.cellText, glow: on ? 0.25 : 0, info: TI.state });
      }
      EDGES.forEach(([a, z], i) => {
        const A = STATES.find((s) => s[0] === a)!, Z = STATES.find((s) => s[0] === z)!;
        const from = V3(SX + A[2], 0.18, SZ + A[3]), to = V3(SX + Z[2], 0.18, SZ + Z[3]);
        const dir = to.clone().sub(from).normalize();
        const p0 = from.clone().add(dir.clone().multiplyScalar(1.05)), p1 = to.clone().sub(dir.clone().multiplyScalar(1.05));
        out.push({ key: `ed:${i}`, kind: 'obj', pos: p0.clone().add(p1).multiplyScalar(0.5), sig: `${p.muted}`, make: () => w.bar(p0, p1, 0x94a3b8, 0.035, 0.8), info: TI.state });
      });
      return out;
    }
    const draw = (o = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const fit = () => w.fit(-8.5, 10, -2.8, 4.6);

    const go = async (s: string) => { state = s; await draw({ ms: 350 }); await sleep(250); };
    const addLog = async (text: string, kind: 'start' | 'w' | 'commit' | 'abort') => { log.push({ text, kind }); await draw({ ms: 400, spawn: (key: string, to: Vector3) => (key === `log:${log.length - 1}` ? to.clone().add(V3(0, 2.5, 0)) : undefined) }); };
    /** 동전이 한 계좌에서 다른 곳으로 날아간다 */
    async function coins(from: Vector3, to: Vector3, n = 3, color = 0xf59e0b) {
      await Promise.all(Array.from({ length: n }, async (_, i) => {
        const c = w.sphere(0.18, color, 0.5);
        c.position.copy(from);
        root.add(c);
        b.temp.add(c);
        await sleep(i * 140);
        await w.move(c, to, 700, 1.4);
        b.temp.delete(c);
        await w.vanish(c, 'shrink', 200);
      }));
    }
    const top = (n: string) => V3(AX[n]!, H(bal[n]!) + 0.2, 0);
    async function setBal(n: string, v: number) { bal[n] = v; await draw({ ms: 600 }); }
    async function bolt() {
      const z = w.block(14, 0.05, 6, P().bad, undefined, { opacity: 0.35 });
      z.position.set(-1, 0.02, 1);
      root.add(z);
      b.temp.add(z);
      await w.flash(z, P().bad, 500);
      b.temp.delete(z);
      await w.vanish(z, 'shrink', 300);
    }

    async function fresh() {
      bal = { 김: 10, 이: 0 }; log = []; state = null; down = false; conc = false;
      for (const o of b.temp) w.remove(o);
      b.temp.clear();
      await draw({ exit: 'shrink', ms: 450 });
    }

    async function transfer(fail: 'none' | 'mid' | 'after') {
      await fresh();
      l.code('BEGIN;\nUPDATE 계좌 SET 잔액 = 잔액 - 3 WHERE 이름 = \'김\';\nUPDATE 계좌 SET 잔액 = 잔액 + 3 WHERE 이름 = \'이\';\nCOMMIT;');
      await go('active');
      await addLog('<T1 start>', 'start');
      await addLog('<T1, 김, 10→7>', 'w');
      await Promise.all([coins(top('김'), V3(-3.1, 2.4, 0), 3), setBal('김', 7)]);
      if (fail === 'mid') {
        await bolt();
        await go('failed');
        l.say('김 계좌에서 3만 원이 빠져나간 뒤, 이 계좌에 넣기 전에 장애! 합계가 7만 원이 되었습니다(일관성 깨짐).', 'bad');
        await sleep(1500);
        l.code('ROLLBACK;  -- 로그의 이전 값으로 UNDO');
        await flashAll(w, [k.get('log:1')], P().warn, 700);
        await Promise.all([coins(V3(-3.1, 2.4, 0), top('김'), 3), setBal('김', 10)]);
        await addLog('<T1 abort>', 'abort');
        await go('abort');
        l.say('로그의 이전 값(10)으로 UNDO해서 김 계좌가 10만 원으로 돌아왔습니다. 전부 아니면 전무 — 원자성(Atomicity). 상태: 실패 → 철회.', 'ok');
        return;
      }
      await addLog('<T1, 이, 0→3>', 'w');
      await Promise.all([coins(V3(-3.1, 2.4, 0), top('이'), 3), setBal('이', 3)]);
      await go('partial');
      await addLog('<T1 commit>', 'commit');
      await go('commit');
      await flashAll(w, [k.get('acct:김'), k.get('acct:이')], P().good, 700);
      if (fail === 'none') { l.say('두 작업이 모두 끝나고 COMMIT. 합계는 그대로 10만 원(일관성), 결과는 영구히 반영됩니다(지속성). 상태: 활동 → 부분 완료 → 완료.', 'ok'); return; }
      await sleep(600);
      l.code('-- 커밋 직후 전원이 꺼졌다! (메모리 버퍼의 데이터가 날아감)');
      await bolt();
      down = true;
      await draw({ ms: 700 });
      l.say('커밋 직후 장애로 메모리의 데이터가 사라졌습니다. 하지만 로그는 디스크에 안전하게 남아 있습니다.', 'bad');
      await sleep(1600);
      l.code('-- 회복: 로그에 <T1 commit>이 있으므로 REDO');
      down = false;
      bal = { 김: 10, 이: 0 };
      await draw({ ms: 500 });
      for (const [i, n, v] of [[1, '김', 7], [2, '이', 3]] as [number, string, number][]) {
        const lg = k.get(`log:${i}`)!;
        await w.flash(lg, P().good, 500);
        await Promise.all([coins(lg.position.clone().add(V3(0, 0.4, 0)), top(n), 2, P().good), setBal(n, v)]);
      }
      l.say('로그의 이후 값으로 REDO해서 커밋된 결과(김 7만, 이 3만)를 되살렸습니다. 커밋된 것은 장애가 나도 사라지지 않는다 — 지속성(Durability).', 'ok');
    }

    /** 두 트랜잭션이 같은 계좌를 동시에 고친다 */
    async function concurrent(lock: boolean) {
      await fresh();
      conc = true;
      bal = { 김: 10, 이: 0 };
      await draw({ ms: 300 });
      l.code(lock ? '-- T1, T2 모두 김 계좌에 잠금(LOCK)을 걸고 시작\nT1: 김 +1만    T2: 김 +2만' : '-- 잠금 없이 동시에\nT1: 김 +1만    T2: 김 +2만');
      const mk = (name: string, x: number, color: number) => {
        const g = new Group();
        const body = w.block(1, 0.9, 0.7, color, { text: name, color: '#ffffff' });
        g.add(body);
        g.userData.info = TI.t;
        g.position.set(x, 0, -2.4);
        root.add(g);
        b.temp.add(g);
        void w.pop(g);
        return g;
      };
      const t1 = mk('T1', -5.4, 0x6366f1), t2 = mk('T2', -1.0, 0xdb2777);
      const memo = (g: Group, text: string, color: number) => {
        const s = w.sign([{ text, color: '#ffffff', weight: 800 }], 0.42, hex(color));
        s.position.copy(g.position).add(V3(0, 1.45, 0));
        root.add(s);
        b.temp.add(s);
        void w.pop(s, 300);
        return s;
      };
      const read = async (g: Group) => { await w.move(g, V3(g.position.x, 0, -1.25), 400); const s = memo(g, `읽음 ${bal['김']}`, 0x475569); await w.flash(k.get('acct:김')!, P().ghost, 400); return s; };
      const write = async (g: Group, v: number) => { await w.move(g, V3(-4.4 + (g === t1 ? -0.9 : 0.9), 0, -1.0), 350); await setBal('김', v); await w.flash(k.get('acct:김')!, P().warn, 400); };
      if (!lock) {
        const s1 = await read(t1);
        const s2 = await read(t2);
        l.say('T1과 T2가 둘 다 잔액 10을 읽었습니다.', 'info');
        await sleep(700);
        await write(t1, 11);
        l.say('T1이 10 + 1 = 11을 씁니다.', 'info');
        await sleep(700);
        await write(t2, 12);
        void s1; void s2;
        await flashAll(w, [k.get('acct:김')], P().bad, 1000);
        l.say('T2는 예전에 읽은 10에 2를 더해 12를 썼습니다. 13이어야 하는데 T1의 +1이 사라졌습니다 — 갱신 분실(Lost Update). 독립성(Isolation)이 깨진 것.', 'bad');
      } else {
        const key = w.block(0.9, 0.4, 0.5, P().key, { text: 'LOCK', color: '#ffffff' });
        key.position.set(-4.4, H(10) + 0.3, 0);
        root.add(key);
        b.temp.add(key);
        void w.pop(key);
        const s1 = await read(t1);
        await w.move(key, t1.position.clone().add(V3(0, 1.0, 0)), 500, 0.8);
        l.say('T1이 김 계좌에 잠금을 걸었습니다. T2는 잠금이 풀릴 때까지 기다립니다.', 'info');
        await w.flash(t2.children[0]!, P().bad, 700);
        await sleep(500);
        await write(t1, 11);
        void s1;
        await w.move(key, V3(-4.4, H(11) + 0.3, 0), 500, 0.8);
        l.say('T1이 11을 쓰고 커밋, 잠금을 풀었습니다. 이제 T2 차례.', 'info');
        await sleep(600);
        const s2 = await read(t2);
        await w.move(key, t2.position.clone().add(V3(0, 1.0, 0)), 500, 0.8);
        void s2;
        await write(t2, 13);
        await flashAll(w, [k.get('acct:김')], P().good, 900);
        l.say('T2는 T1이 끝난 뒤의 값 11을 읽어 13을 썼습니다. 잠금(로킹)으로 서로의 중간 결과를 못 보게 하면 순서대로 실행한 것과 같아집니다 — 독립성. 2단계 로킹: 잠그기만 하는 단계 → 풀기만 하는 단계.', 'ok');
      }
    }

    async function recovery() {
      await fresh();
      l.code('-- 장애 직전의 로그\n<T1 start> <T1,김,10→7> <T1 commit>\n<T2 start> <T2,이,0→5>   (commit 없음)');
      bal = { 김: 7, 이: 5 };
      for (const [t, kind] of [['<T1 start>', 'start'], ['<T1, 김, 10→7>', 'w'], ['<T1 commit>', 'commit'], ['<T2 start>', 'start'], ['<T2, 이, 0→5>', 'w']] as [string, 'start' | 'w' | 'commit'][]) await addLog(t, kind);
      await draw({ ms: 400 });
      await bolt();
      l.say('장애 발생! 로그를 거꾸로 읽어 commit이 있는지 확인합니다.', 'bad');
      await sleep(1000);
      await flashAll(w, [k.get('log:3'), k.get('log:4')], P().bad, 800);
      await Promise.all([coins(top('이'), k.get('log:4')!.position.clone().add(V3(0, 0.4, 0)), 3, P().bad), setBal('이', 0)]);
      l.say('T2는 commit 기록이 없으므로 이전 값(0)으로 UNDO(취소).', 'info');
      await sleep(900);
      await flashAll(w, [k.get('log:0'), k.get('log:1'), k.get('log:2')], P().good, 800);
      await Promise.all([coins(k.get('log:1')!.position.clone().add(V3(0, 0.4, 0)), top('김'), 2, P().good), setBal('김', 7)]);
      l.say('T1은 start와 commit이 모두 있으므로 이후 값(7)으로 REDO(재실행). 즉시 갱신 기법은 REDO + UNDO, 지연 갱신은 REDO만 씁니다.', 'ok');
    }

    async function reset() { await fresh(); fit(); }
    void reset();

    return {
      hint: '계좌 이체 단추를 눌러 보세요. 막대 높이가 잔액, 앞쪽 줄이 로그, 오른쪽이 트랜잭션 상태입니다.',
      reset,
      groups: [
        { name: 'ACID', en: '이체해 보기', hue: 215, cmds: [
          { name: '정상 이체', tip: 'COMMIT', run: () => transfer('none') },
          { name: '도중 장애', tip: '원자성 · ROLLBACK', run: () => transfer('mid') },
          { name: '커밋 뒤 장애', tip: '지속성 · REDO', run: () => transfer('after') },
        ] },
        { name: '병행 제어', en: 'Isolation', hue: 280, cmds: [
          { name: '잠금 없이', run: () => concurrent(false) },
          { name: '잠금(LOCK)', run: () => concurrent(true) },
        ] },
        { name: '회복', en: 'Recovery', hue: 150, cmds: [
          { name: 'REDO · UNDO', run: recovery },
        ] },
      ],
    };
  } });
}

// 기존 그림 틀(seq·graph·ladder·board·fields)과 같은 입력을 받아 3D 실습판으로 보여 준다.
// 개념 정의는 그대로 두고 import만 바꾸면 3D가 된다.
import { Color, Vector3 } from 'three';
import { el } from '../../view/stage';
import { sleep, type Viz } from '../core';
import { openModal } from '../modal';
import type { BoardSpec } from '../templates/board';
import type { FieldsSpec } from '../templates/fields';
import type { GraphSpec } from '../templates/graph';
import type { LadderSpec } from '../templates/ladder';
import type { SeqSpec, SeqStep } from '../templates/seq';
import { flowLab, type FLink, type FNode, type FStep, type Shape, type Tone } from './flow';
import type { SyncOpts, Want } from './keyed';
import { base, hopAll } from './kit';
import { lab, type Cmd, type CmdGroup } from './lab';
import { hex, type Info } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const hsl = (h: number, s = 0.62, l = 0.5) => new Color().setHSL((((h % 360) + 360) % 360) / 360, s, l).getHex();
const short = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** 이름으로 노드 모양을 짐작한다 */
export function guessShape(text: string): Shape {
  const t = text.toLowerCase();
  if (/공격자|해커|사용자|사람|고객|관리자|직원|개발자|테스터|감염|피해자|kim|dba|운영자|학생|소비자/.test(t)) return 'person';
  if (/방화벽|firewall|ids|ips|waf/.test(t)) return 'wall';
  if (/\bdb\b|데이터베이스|저장소|레지스트리|repository|로그/.test(t)) return 'db';
  if (/서버|server|웹 서버|dns|메일|ca\b|인증 기관|kdc|클라우드 서비스/.test(t)) return 'server';
  if (/라우터|공유기|게이트웨이|nat|vpn 장비/.test(t)) return 'router';
  if (/스위치|switch/.test(t)) return 'switch';
  if (/허브|hub|모두|브로드캐스트|같은 네트워크/.test(t)) return 'hub';
  if (/인터넷|클라우드|cloud|망\b/.test(t)) return 'cloud';
  if (/스마트폰|모바일|폰|iot/.test(t)) return 'phone';
  if (/문서|파일|코드|명세|계획|보고서/.test(t)) return 'doc';
  if (/cpu|프로세스|스레드|트랜잭션|모듈|함수|객체|클래스|컴포넌트/.test(t)) return 'chip';
  if (/pc|클라이언트|브라우저|송신|수신|컴퓨터|단말|호스트|노드/.test(t)) return 'pc';
  return 'box';
}

const ACTOR_HUES = [215, 160, 280, 30, 340, 190];

// ───────────────────────── seq: 주고받기 ─────────────────────────

export function seq(spec: SeqSpec): () => Viz {
  const n = spec.actors.length;
  const gap = n <= 2 ? 7.5 : n === 3 ? 5.6 : 4.4;
  const nodes: FNode[] = spec.actors.map((a, i) => ({
    id: `a${i}`, name: a.name, sub: a.sub, at: [(i - (n - 1) / 2) * gap, 0],
    shape: guessShape(`${a.name} ${a.sub ?? ''}`), color: a.bad ? 'bad' : hsl(ACTOR_HUES[i % ACTOR_HUES.length]!, 0.55, 0.5),
    info: { title: a.name, sub: a.sub, body: `${a.name}${a.sub ? ` (${a.sub})` : ''} — 시나리오 단추를 누르면 이 노드가 무엇을 주고받는지 볼 수 있습니다.` },
  }));
  const links: FLink[] = nodes.slice(1).map((x, i) => [nodes[i]!.id, x.id, 'muted']);
  const kindTone = (k?: SeqStep['kind']): Tone => (k === 'bad' || k === 'lost' ? 'bad' : k === 'reply' ? 0x0d9488 : k === 'info' ? 'ghost' : k === 'ok' ? 'good' : 'accent');
  const stepOf = (s: SeqStep): FStep => {
    const A = spec.actors[s.from]?.name ?? '', B = spec.actors[s.to]?.name ?? '';
    const say = s.note ? `${s.label} — ${s.note}` : s.label;
    const wait = Math.min(2400, 700 + (s.note?.length ?? 0) * 22);
    const tone = s.kind === 'bad' || s.kind === 'lost' ? 'bad' as const : 'info' as const;
    if (s.from === s.to) return { mark: [{ at: `a${s.from}`, label: short(s.label, 22), color: kindTone(s.kind) }], say, tone, log: `${A}: ${s.label}`, wait: wait + 300 };
    return { send: { from: `a${s.from}`, to: `a${s.to}`, label: short(s.label), color: kindTone(s.kind), fate: s.kind === 'lost' ? 'lost' : 'ok', many: s.many, ms: s.many ? 900 : 1150 }, say, tone, log: `${A} → ${B}: ${s.label}`, wait };
  };
  return flowLab({
    title: spec.title, en: spec.en, height: 440,
    hint: `시나리오 단추를 누르면 노드 사이로 패킷이 오갑니다.${spec.scenarios[0]?.desc ? ` ${spec.scenarios[0].desc}` : ''}`,
    nodes, links,
    view: [-(n - 1) / 2 * gap - 2.2, (n - 1) / 2 * gap + 2.2, -2.4, 2.6],
    groups: [{ name: '시나리오', en: 'Scenario', hue: 210, items: spec.scenarios.map((sc) => ({
      name: sc.name,
      steps: [...(sc.desc ? [{ say: sc.desc, wait: Math.min(2200, 600 + sc.desc.length * 18) } as FStep] : []), ...sc.steps.map(stepOf)],
    })) }],
  });
}

// ───────────────────────── graph: 노드와 길 ─────────────────────────

export function graph(spec: GraphSpec): () => Viz {
  const s = Math.min(14 / spec.w, 8.5 / spec.h);
  const pos = (x: number, y: number): [number, number] => [(x - spec.w / 2) * s, (y - spec.h / 2) * s];
  const deg = (id: string, es = spec.edges) => ({ in: es.filter((e) => e.b === id || (e.dir === false && e.a === id)).length, out: es.filter((e) => e.a === id || (e.dir === false && e.b === id)).length });
  const nodes: FNode[] = spec.nodes.map((n, i) => ({
    id: n.id, name: n.name, sub: n.en, at: pos(n.x, n.y),
    shape: n.kind === 'cloud' ? 'cloud' : n.kind === 'state' ? 'disk' : guessShape(n.name),
    color: n.kind === 'bad' ? 'bad' : hsl(ACTOR_HUES[i % ACTOR_HUES.length]!, 0.5, 0.52),
    info: { title: n.name, sub: n.en, body: `${n.desc ?? ''}${spec.degree ? `\n\n팬인(들어오는 선) ${deg(n.id).in} · 팬아웃(나가는 선) ${deg(n.id).out}` : ''}` || n.name },
  }));
  const linkOf = (es = spec.edges): FLink[] => es.map((e) => [e.a, e.b, 'muted', e.label ?? (e.cost !== undefined ? String(e.cost) : undefined), e.dir !== false]);
  const items = (spec.scenarios ?? []).map((sc) => {
    const steps: FStep[] = [];
    if (sc.desc) steps.push({ say: sc.desc, wait: 400 });
    if (sc.hl?.length) steps.push({ flash: [sc.hl, 'warn'], wait: 200 });
    for (const p of sc.path ?? []) steps.push({ travel: { path: p, label: '', color: 'key', notes: sc.notes }, wait: 300 });
    if (sc.desc) steps.push({ say: sc.desc, wait: 100 });
    return { name: sc.name, links: sc.edges ? linkOf(sc.edges) : undefined, steps };
  });
  if (spec.degree) items.push({ name: '팬인 · 팬아웃 세기', links: undefined, steps: [
    { say: '각 모듈로 들어오는 선(팬인)과 나가는 선(팬아웃)을 셉니다. 팬인이 높으면 재사용이 많고, 팬아웃이 높으면 의존이 많습니다.', wait: 600 },
    ...spec.nodes.map((n): FStep => ({ mark: [{ at: n.id, label: `in ${deg(n.id).in} · out ${deg(n.id).out}`, color: 'accent' }], wait: 900 })),
  ] });
  const xs = nodes.map((n) => n.at[0]), zs = nodes.map((n) => n.at[1]);
  return flowLab({
    title: spec.title, en: spec.en, height: 460,
    hint: items.length ? '단추를 누르면 토큰이 길을 따라 움직입니다. 노드를 누르면 설명이 나옵니다.' : '노드를 누르면 설명이 나옵니다.',
    nodes, links: linkOf(),
    view: [Math.min(...xs) - 1.8, Math.max(...xs) + 1.8, Math.min(...zs) - 2.2, Math.max(...zs) + 2.3],
    groups: items.length ? [{ name: '보기', en: 'Scenario', hue: 200, items }] : [{ name: '보기', hue: 200, items: [{ name: '한 바퀴 보기', steps: spec.nodes.map((n): FStep => ({ flash: [[n.id], 'warn'], say: `${n.name}${n.en ? ` (${n.en})` : ''}: ${n.desc ?? ''}`, wait: 1300 })) }] }],
  });
}

// ───────────────────────── ladder: 순서·강도 ─────────────────────────

export function ladder(spec: LadderSpec): () => Viz {
  return () => lab({ title: spec.title, en: spec.en, height: 460, setup: (l) => {
    const b = base(l);
    const { w, k, root } = b;
    const n = spec.items.length;
    const [h1, h2] = spec.hue ?? [140, 0];
    const color = (i: number) => hsl(h1 + (h2 - h1) * (n > 1 ? i / (n - 1) : 0), 0.6, 0.52);
    const shape = spec.shape ?? 'bars';
    let cur = -1;
    // 위치: i = 0이 맨 위(첫 항목)
    const place = (i: number): { p: Vector3; size: [number, number, number] } => {
      const lv = n - 1 - i;
      if (shape === 'stairs') return { p: V(-((n - 1) * 1.15) / 2 + lv * 1.15, 0, (n - 1) * 0.45 - lv * 0.9), size: [3.4, 0.35 + lv * 0.38, 1.1] };
      if (shape === 'stack') return { p: V(0, lv * 0.62, 0), size: [5.2, 0.55, 2.2] };
      return { p: V(0, 0, i * 1.15 - ((n - 1) * 1.15) / 2), size: [6.4 - (n > 1 ? (i * 3.2) / (n - 1) : 0), 0.42, 0.95] };
    };
    const info = (i: number): Info => ({ title: `${i + 1}. ${spec.items[i]!.name}`, sub: spec.items[i]!.en, body: spec.items[i]!.desc });
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      spec.items.forEach((it, i) => {
        const { p, size } = place(i);
        const on = i === cur;
        out.push({ key: `s:${i}`, kind: 'block', pos: p, size, color: color(i), text: shape === 'stack' ? '' : it.name, textColor: '#ffffff', glow: on ? 0.35 : 0, info: info(i) });
        const top = p.y + size[1];
        const tag = [it.en, it.tag].filter(Boolean).join(' · ');
        if (shape === 'stack') out.push({ key: `t:${i}`, kind: 'sign', pos: V(0, p.y + size[1] / 2, size[2] / 2 + 0.05), runs: [{ text: `${i + 1}  `, color: '#ffffffaa', weight: 800, size: 40 }, { text: it.name, color: '#ffffff', weight: 800, size: 42 }, ...(tag ? [{ text: `  ${tag}`, color: '#ffffffcc', size: 32 }] : [])], height: 0.42, info: info(i) });
        else if (tag) out.push({ key: `t:${i}`, kind: 'sign', pos: V(p.x + (shape === 'stairs' ? 0 : size[0] / 2 + 1.6), shape === 'stairs' ? top + 0.35 : 0.3, p.z), runs: [{ text: tag, color: P.muted, size: 34 }], height: 0.32, info: info(i) });
      });
      const a = place(0), z = place(n - 1);
      const endPos = (pl: { p: Vector3; size: number[] }, up: boolean) => shape === 'stack' ? V(pl.size[0]! / 2 + 1.7, pl.p.y + 0.3, 0) : shape === 'stairs' ? V(pl.p.x, pl.p.y + pl.size[1]! + (up ? 1.1 : 0.9), pl.p.z - 0.2) : V(-(pl.size[0]! / 2) - 1.9, 0.3, pl.p.z);
      out.push({ key: 'end:top', kind: 'sign', pos: endPos(a, true), runs: [{ text: `▲ ${spec.top}`, color: P.text, weight: 700, size: 34 }], height: 0.36, bg: hex(P.slab) });
      out.push({ key: 'end:bot', kind: 'sign', pos: endPos(z, false), runs: [{ text: `▼ ${spec.bottom}`, color: P.text, weight: 700, size: 34 }], height: 0.36, bg: hex(P.slab) });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const marker = w.sphere(0.22, 0xfacc15, 0.9);
    marker.visible = false;
    root.add(marker);
    const fit = () => {
      if (shape === 'stack') w.fit(-4.5, 6.5, -2, 2.5 + n * 0.2);
      else if (shape === 'stairs') w.fit(-((n - 1) * 1.15) / 2 - 2.2, ((n - 1) * 1.15) / 2 + 2.2, -(n - 1) * 0.45 - 2, (n - 1) * 0.45 + 1.5);
      else w.fit(-5.5, 5.5, -((n - 1) * 1.15) / 2 - 1.5, ((n - 1) * 1.15) / 2 + 1);
    };

    async function pick(i: number, scene: boolean) {
      cur = i;
      await draw({ ms: 250 });
      const { p, size } = place(i);
      marker.visible = true;
      await w.move(marker, V(p.x - (shape === 'bars' ? size[0] / 2 - 0.4 : 0), p.y + size[1] + 0.45, p.z), 500, 0.6);
      await hopAll(w, [k.get(`s:${i}`)], 0.25, 400);
      const it = spec.items[i]!;
      l.say(`${i + 1}. ${it.name}${it.en ? ` (${it.en})` : ''} — ${it.desc}`, 'info');
      if (scene && it.scene) openModal(`${i + 1}. ${it.name}`, [it.scene(), it.desc], it.en);
    }
    w.onPick = (inf, o) => {
      const key = [...Array(n).keys()].find((i) => k.get(`s:${i}`) === o || k.get(`t:${i}`) === o);
      if (key !== undefined) void pick(key, true);
      else openModal(inf.title, inf.body.split('\n\n'), inf.sub);
    };

    async function reset() {
      cur = -1;
      marker.visible = false;
      await draw({ exit: 'shrink', spawn: (key: string, to: Vector3) => (key.startsWith('s:') ? to.clone().add(V(0, 3, 0)) : undefined), ms: 600 });
      fit();
      const chips: Node[] = [];
      if (spec.mnemonic) chips.push(Object.assign(el('span', 'lab-chip'), { textContent: spec.mnemonic }));
      if (spec.note) chips.push(Object.assign(el('span', 'lab-chip muted'), { textContent: spec.note }));
      l.status(...chips);
    }
    void reset();
    const groups: CmdGroup[] = [
      { name: '순서', en: `${spec.top} → ${spec.bottom}`, hue: h1, cmds: [{ name: '▶ 차례로 짚기', run: async () => { for (let i = 0; i < n; i++) { await pick(i, false); await sleep(Math.min(2600, 900 + spec.items[i]!.desc.length * 20)); } } }] },
      { name: '항목', en: spec.items.some((i) => i.scene) ? '누르면 예시 애니메이션' : '누르면 설명', hue: h2, cmds: spec.items.map((it, i): Cmd => ({ name: `${i + 1}. ${it.name}`, tip: it.en, run: () => pick(i, true) })) },
    ];
    return { hint: spec.items.some((i) => i.scene) ? '항목 단추나 블록을 누르면 예시 애니메이션과 설명이 나옵니다.' : '항목 단추나 블록을 누르면 설명이 나옵니다. ▶ 차례로 짚기로 순서를 익혀 보세요.', reset, groups };
  } });
}

// ───────────────────────── board: 분류 ─────────────────────────

export function board(spec: BoardSpec): () => Viz {
  return () => lab({ title: spec.title, en: spec.en, height: 470, setup: (l) => {
      const b = base(l);
      const { w, k } = b;
      const G = spec.groups;
      const hue = (gi: number) => G[gi]!.hue ?? (gi * 360) / G.length + 200;
      const IW = 1.9, ID = 0.85, GAP = 0.9;
      const ncol = (gi: number) => Math.min(3, Math.max(1, Math.ceil(Math.sqrt(G[gi]!.items.length))));
      const gw = (gi: number) => ncol(gi) * (IW + 0.12) + 0.5;
      const perRow = G.length <= 4 ? G.length : 3;
      const rowW = (r: number) => G.slice(r * perRow, r * perRow + perRow).reduce((s, _g, j) => s + gw(r * perRow + j) + GAP, -GAP);
      const rowsOf = (gi: number) => Math.ceil(G[gi]!.items.length / ncol(gi));
      const rowDepth = (r: number) => Math.max(...G.slice(r * perRow, r * perRow + perRow).map((_g, j) => rowsOf(r * perRow + j))) * (ID + 0.12) + 2.6;
      const gx = (gi: number) => { const r = Math.floor(gi / perRow); let x = -rowW(r) / 2; for (let j = r * perRow; j < gi; j++) x += gw(j) + GAP; return x + gw(gi) / 2; };
      const gz = (gi: number) => { const r = Math.floor(gi / perRow); let z = 0; for (let j = 0; j < r; j++) z += rowDepth(j); return z; };
      const home = (gi: number, ii: number) => V(gx(gi) - gw(gi) / 2 + 0.25 + (ii % ncol(gi)) * (IW + 0.12) + IW / 2, 0.14, gz(gi) + 0.2 + Math.floor(ii / ncol(gi)) * (ID + 0.12) + ID / 2);
      const all = G.flatMap((g, gi) => g.items.map((it, ii) => ({ it, gi, ii, key: `i:${gi}:${ii}` })));
      const nrows = Math.ceil(G.length / perRow);
      const zEnd = gz(G.length - 1) + rowDepth(nrows - 1);
      // 퀴즈: 섞인 순서, 놓인 것, 지금 문제
      let quiz: { order: typeof all; placed: Set<string>; cur: number } | null = null;
      const poolPos = (j: number) => V(-((Math.min(6, all.length) - 1) * (IW + 0.15)) / 2 + (j % 6) * (IW + 0.15), 0.14, zEnd + 0.4 + Math.floor(j / 6) * (ID + 0.2));
      const itemInfo = (gi: number, ii: number): Info => { const it = G[gi]!.items[ii]!; return { title: it.name, sub: [it.en, G[gi]!.name].filter(Boolean).join(' · '), body: it.desc ?? `${G[gi]!.name}에 속합니다.` }; };
      const groupInfo = (gi: number): Info => ({ title: G[gi]!.name, sub: G[gi]!.en, body: G[gi]!.desc ?? G[gi]!.items.map((i) => i.name).join(', ') });
      function want(): Want[] {
        const P = w.pal;
        const out: Want[] = [];
        G.forEach((g, gi) => {
          const depth = rowsOf(gi) * (ID + 0.12) + 0.4;
          out.push({ key: `g:${gi}`, kind: 'block', pos: V(gx(gi), 0, gz(gi) + depth / 2), size: [gw(gi), 0.14, depth], color: hsl(hue(gi), 0.55, P.bg > 0x808080 ? 0.85 : 0.22), info: groupInfo(gi) });
          out.push({ key: `gn:${gi}`, kind: 'sign', pos: V(gx(gi), 0.65, gz(gi) - 0.35), runs: [{ text: g.name, color: '#ffffff', weight: 800, size: 42 }, ...(g.en ? [{ text: `  ${g.en}`, color: '#ffffffcc', size: 30 }] : [])], height: 0.46, bg: hex(hsl(hue(gi), 0.6, 0.45)), info: groupInfo(gi) });
        });
        all.forEach(({ it, gi, ii, key }) => {
          let p = home(gi, ii);
          let col = hsl(hue(gi), 0.6, 0.5);
          if (quiz && !quiz.placed.has(key)) {
            const j = quiz.order.findIndex((x) => x.key === key);
            p = j === quiz.cur ? V(0, 1.4, zEnd - 0.6) : poolPos(j);
            col = j === quiz.cur ? P.key : 0x64748b;
          }
          out.push({ key, kind: 'block', pos: p, size: [IW, 0.36, ID], color: col, text: it.scene ? `▶ ${it.name}` : it.name, textColor: '#ffffff', info: itemInfo(gi, ii) });
        });
        return out;
      }
      const draw = (o: SyncOpts = {}) => k.sync(want(), o);
      w.onRepaint = () => void draw({ ms: 0 });
      const fit = () => w.fit(-Math.max(...[...Array(nrows).keys()].map(rowW)) / 2 - 0.6, Math.max(...[...Array(nrows).keys()].map(rowW)) / 2 + 0.6, -1.4, zEnd + (quiz ? Math.ceil(all.length / 6) * 1.05 + 0.8 : 0.4));
      const show = (gi: number, ii: number) => {
        const it = G[gi]!.items[ii]!;
        void hopAll(w, [k.get(`i:${gi}:${ii}`)], 0.4, 450);
        l.say(`${it.name}${it.en ? ` (${it.en})` : ''} — ${it.desc ?? G[gi]!.name}`, 'info');
        if (it.scene) openModal(it.name, [it.scene(), it.desc ?? ''], it.en);
      };
      w.onPick = (inf, o) => {
        const hit = all.find((x) => k.get(x.key) === o);
        if (hit && !quiz) { show(hit.gi, hit.ii); return; }
        const g = G.findIndex((_g, gi) => k.get(`g:${gi}`) === o || k.get(`gn:${gi}`) === o);
        if (quiz && g >= 0) { void answer(g); return; }
        if (g >= 0 && G[g]!.scene) { openModal(G[g]!.name, [G[g]!.scene!(), G[g]!.desc ?? ''], G[g]!.en); return; }
        openModal(inf.title, inf.body.split('\n\n'), inf.sub);
      };
      async function groupShow(gi: number) {
        if (quiz) { await answer(gi); return; }
        const g = G[gi]!;
        l.say(`${g.name}${g.en ? ` (${g.en})` : ''}: ${g.desc ?? g.items.map((i) => i.name).join(', ')}`, 'info');
        for (let ii = 0; ii < g.items.length; ii++) {
          void hopAll(w, [k.get(`i:${gi}:${ii}`)], 0.4, 420);
          await sleep(110);
        }
        if (g.scene) openModal(g.name, [g.scene(), g.desc ?? ''], g.en);
      }
      async function startQuiz() {
        const order = [...all].sort(() => Math.random() - 0.5);
        quiz = { order, placed: new Set(), cur: 0 };
        fit();
        await draw({ ms: 800, arc: 1 });
        l.say(`"${order[0]!.it.name}"은(는) 어느 무리일까요? 무리 단추나 3D 바닥판을 누르세요.`, 'info');
      }
      async function answer(gi: number) {
        if (!quiz) return;
        const q = quiz.order[quiz.cur]!;
        const o = k.get(q.key);
        if (q.gi !== gi) {
          if (o) {
            const back = o.position.clone();
            await w.move(o, V(gx(gi), 1.0, gz(gi) + 0.8), 450, 0.6);
            await w.flash(o, w.pal.bad, 400);
            await w.move(o, back, 450, 0.6);
          }
          l.say(`✕ ${G[gi]!.name}이(가) 아닙니다. 다시 골라 보세요. (${q.it.name})`, 'bad');
          return;
        }
        quiz.placed.add(q.key);
        quiz.cur++;
        await draw({ ms: 650, arc: 0.8 });
        if (o) void w.flash(o, w.pal.good, 500);
        if (quiz.cur >= quiz.order.length) {
          quiz = null;
          await draw({ ms: 400 });
          fit();
          l.say('🎉 모두 제자리에 놓았습니다!', 'ok');
          return;
        }
        l.say(`○ 맞습니다: ${q.it.name} → ${G[gi]!.name}. 다음: "${quiz.order[quiz.cur]!.it.name}"은(는)?`, 'ok');
      }
      async function reset() { quiz = null; await draw({ exit: 'shrink', spawn: (key: string, to: Vector3) => (key.startsWith('i:') ? to.clone().add(V(0, 3, 0)) : undefined), ms: 700 }); fit(); if (spec.note) l.status(Object.assign(el('span', 'lab-chip muted'), { textContent: spec.note })); }
      void reset();
      const groups: CmdGroup[] = [{ name: '무리', en: '누르면 항목들이 들썩', hue: 210, cmds: G.map((g, gi): Cmd => ({ name: g.name, tip: g.en, run: () => groupShow(gi) })) }];
      if (spec.quiz !== false && G.length > 1) groups.push({ name: '연습', hue: 40, cmds: [{ name: '🧩 분류 퀴즈', run: startQuiz }] });
      return { hint: all.some((x) => x.it.scene) ? '블록을 누르면 설명이, ▶ 표시 블록은 예시 애니메이션이 나옵니다.' : '블록을 누르면 설명이 나옵니다. 🧩 분류 퀴즈로 직접 나눠 보세요.', reset, groups };
  } });
}

// ───────────────────────── fields: 필드 구조 ─────────────────────────

export function fields(spec: FieldsSpec): () => Viz {
  return () => lab({ title: spec.title, en: spec.en, height: 400, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const R = spec.rows;
    const total = (r: number) => R[r]!.fields.reduce((s, f) => s + (f.w ?? 1), 0);
    const unit = Math.min(1.9, 12.5 / Math.max(...R.map((_r, i) => total(i))));
    const fx = (r: number, i: number) => { const t = total(r) * unit; let x = -t / 2; for (let j = 0; j < i; j++) x += (R[r]!.fields[j]!.w ?? 1) * unit; return x + ((R[r]!.fields[i]!.w ?? 1) * unit) / 2; };
    const rz = (r: number) => r * 2.2 - ((R.length - 1) * 2.2) / 2;
    let shown = new Set<string>(R.flatMap((r, ri) => r.fields.map((_f, i) => `${ri}:${i}`)));
    const finfo = (ri: number, i: number): Info => { const f = R[ri]!.fields[i]!; return { title: f.name, sub: f.en, body: f.desc }; };
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      R.forEach((row, ri) => {
        if (row.label) out.push({ key: `rl:${ri}`, kind: 'sign', pos: V(-(total(ri) * unit) / 2 - 0.2, 0.95, rz(ri) - 0.75), runs: [{ text: row.label, color: P.text, weight: 800, size: 38 }], height: 0.4, bg: hex(P.slab) });
        row.fields.forEach((f, i) => {
          if (!shown.has(`${ri}:${i}`)) return;
          const c = hsl(f.hue ?? 200 + i * 37, 0.55, 0.5);
          out.push({ key: `f:${ri}:${i}`, kind: 'block', pos: V(fx(ri, i), 0, rz(ri)), size: [(f.w ?? 1) * unit - 0.06, 0.55, 1.2], color: c, text: f.text ?? f.name, textColor: '#ffffff', info: finfo(ri, i) });
        });
      });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    const fit = () => { const t = Math.max(...R.map((_r, i) => total(i))) * unit; w.fit(-t / 2 - 0.5, t / 2 + 0.5, rz(0) - 1.6, rz(R.length - 1) + 1); };
    w.onPick = (inf, o) => {
      const hit = R.flatMap((r, ri) => r.fields.map((_f, i) => [ri, i] as const)).find(([ri, i]) => k.get(`f:${ri}:${i}`) === o);
      if (hit) { void hopAll(w, [o], 0.35, 400); const f = R[hit[0]]!.fields[hit[1]]!; l.say(`${f.name}${f.en ? ` (${f.en})` : ''} — ${f.desc}`, 'info'); }
      openModal(inf.title, inf.body.split('\n\n'), inf.sub);
    };
    async function build(ri: number) {
      shown = new Set([...shown].filter((x) => !x.startsWith(`${ri}:`)));
      await draw({ exit: 'fly', ms: 400 });
      for (let i = 0; i < R[ri]!.fields.length; i++) {
        shown.add(`${ri}:${i}`);
        await draw({ spawn: (key: string, to: Vector3) => (key === `f:${ri}:${i}` ? to.clone().add(V(0, 3.5, 0)) : undefined), ms: 500 });
        const f = R[ri]!.fields[i]!;
        l.say(`${f.name}${f.en ? ` (${f.en})` : ''} — ${f.desc}`, 'info');
        await sleep(Math.min(2400, 800 + f.desc.length * 18));
      }
    }
    async function reset() { shown = new Set(R.flatMap((r, ri) => r.fields.map((_f, i) => `${ri}:${i}`))); await draw({ exit: 'shrink' }); fit(); if (spec.note) l.status(Object.assign(el('span', 'lab-chip muted'), { textContent: spec.note })); }
    void reset();
    return {
      hint: '▶ 조립을 누르면 필드가 하나씩 들어오며 설명이 나옵니다. 블록을 누르면 그 필드의 설명이 나옵니다.',
      reset,
      groups: [{ name: '조립', en: 'Build', hue: 200, cmds: R.map((r, ri): Cmd => ({ name: `▶ ${r.label ?? spec.title}`, run: () => build(ri) })) }],
    };
  } });
}


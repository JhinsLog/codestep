// 실습판들이 같이 쓰는 작은 도구: 무대 준비, 여러 블록 번쩍이기, 거부되는 행 튕겨 내기, 위에서 떨어뜨리기.
import { Group, Object3D, Vector3 } from 'three';
import { sleep } from '../core';
import { Keyed } from './keyed';
import type { Lab } from './lab';
import { CD, CH, PITCH, colW, tLayout, type TView } from './tables';
import type { World } from './world';

export interface Base { w: World; k: Keyed; root: Group; temp: Set<Object3D> }

export function base(l: Lab): Base {
  const w = l.world;
  const root = new Group();
  w.scene.add(root);
  return { w, k: new Keyed(w, root), root, temp: new Set() };
}

/** 임시 물체를 모두 치운다 */
export function clearTemp(b: Base) {
  for (const o of b.temp) b.w.remove(o);
  b.temp.clear();
}

export function flashAll(w: World, os: (Object3D | undefined)[], color: number, ms = 700): Promise<unknown> {
  return Promise.all(os.filter(Boolean).map((o) => w.flash(o!, color, ms)));
}
export function hopAll(w: World, os: (Object3D | undefined)[], dy = 0.35, ms = 450): Promise<unknown> {
  return Promise.all(os.filter(Boolean).map((o) => w.hop(o!, dy, ms)));
}

/** 표의 한 행 블록들 */
export const rowOf = (k: Keyed, t: string, id: string) => k.starting(`${t}:c:${id}:`);
/** 표의 한 열 블록들(머리 포함) */
export const colOf = (k: Keyed, t: string, col: string, head = true) =>
  k.matching((key) => (head && key === `${t}:h:${col}`) || (key.startsWith(`${t}:c:`) && key.endsWith(`:${col}`)));

/** 새 이름표가 위에서 떨어져 내려오게 */
export const dropIn = (pred: (key: string) => boolean, dy = 4.5) => (key: string, to: Vector3) => (pred(key) ? to.clone().add(new Vector3(0, dy, 0)) : undefined);

/** 받아들여지지 않는 행: 표 끝으로 내려오다 막혀 빨갛게 번쩍이고 떨어진다 */
export async function bounceRow(b: Base, t: TView, vals: Record<string, string | null>, wall: (Object3D | undefined)[]) {
  const { w, root } = b;
  const L = tLayout(t);
  const z = L.rz(t.rows.length);
  const blocks = t.cols.map((c, i) => {
    const v = vals[c.name];
    const o = w.block(colW(c), CH, CD, w.pal.bad, { text: v ?? 'NULL', color: '#ffffff' });
    o.position.set(L.xs[i]!, 4.5, z + 0.5);
    root.add(o);
    b.temp.add(o);
    return o;
  });
  await Promise.all(blocks.map((o, i) => sleep(i * 60).then(() => w.move(o, new Vector3(o.position.x, 0.9, z + 0.5), 520))));
  await Promise.all([flashAll(w, wall, w.pal.bad, 900), hopAll(w, blocks, 0.35, 400)]);
  await Promise.all(blocks.map((o) => { b.temp.delete(o); return w.vanish(o, 'fall', 700); }));
}

/** 표 범위(카메라 맞춤용) */
export function bounds(ts: { cols: TView['cols']; rows: unknown[]; x: number; z: number }[], pad = 0.6): [number, number, number, number] {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const t of ts) {
    const L = tLayout(t);
    x0 = Math.min(x0, L.x0); x1 = Math.max(x1, L.x1); z0 = Math.min(z0, L.z0 - 1.2); z1 = Math.max(z1, L.z1);
  }
  return [x0 - pad, x1 + pad, z0, z1 + pad];
}

export { PITCH };

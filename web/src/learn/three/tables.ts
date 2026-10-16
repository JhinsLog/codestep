// 3D 표(릴레이션) 그리기: 열 이름 블록 한 줄 + 행 블록 여러 줄. 여러 실습판이 같이 쓴다.
// 이름표: `${표}:h:${열}`(머리), `${표}:c:${행}:${열}`(칸), `${표}:name`, `${표}:base`
import { Vector3 } from 'three';
import type { Want } from './keyed';
import { hex, type Info, type World } from './world';

export const PITCH = 0.95, CD = 0.8, GX = 0.12, HH = 0.5, CH = 0.3, Y0 = 0.12, CW = 1.5;
export const V3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

export interface TCol { name: string; w?: number; key?: 'pk' | 'fk' | 'pkfk' }
export interface TRow { id: string; v: Record<string, string | null> }
export interface TView {
  key: string;
  name: string;
  /** 이름 앞의 작은 글씨 (TABLE, 결과 …) */
  kind?: string;
  cols: TCol[];
  rows: TRow[];
  /** 표 가운데의 x, 머리줄의 z */
  x: number;
  z: number;
  tone?: 'base' | 'ghost' | 'result';
  /** 칠하기: `행id:열` · `r:행id` · `c:열` · `h:열` → 색 */
  hi?: Map<string, number>;
  info?: Info;
  cellInfo?: (r: TRow, c: TCol) => Info | undefined;
  headInfo?: (c: TCol) => Info | undefined;
  /** 이름 표지판 숨기기 */
  noName?: boolean;
}

export const colW = (c: TCol) => c.w ?? CW;
export function tLayout(t: { cols: TCol[]; rows: unknown[]; x: number; z: number }) {
  const W = t.cols.reduce((s, c) => s + colW(c), 0) + GX * Math.max(0, t.cols.length - 1);
  let x = t.x - W / 2;
  const xs = t.cols.map((c) => { const m = x + colW(c) / 2; x += colW(c) + GX; return m; });
  return { W, xs, x0: t.x - W / 2, x1: t.x + W / 2, z0: t.z - CD / 2, z1: t.z + t.rows.length * PITCH + CD / 2, rz: (i: number) => t.z + (i + 1) * PITCH };
}

/** 글자색: 바탕이 어두우면 흰 글씨 */
export function ink(color: number, dark: string, light = '#ffffff'): string {
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? dark : light;
}

export const FK = 0x8b5cf6;

export function tableWants(w: World, t: TView): Want[] {
  const P = w.pal;
  const out: Want[] = [];
  const L = tLayout(t);
  const ghost = t.tone === 'ghost';
  const hi = t.hi ?? new Map<string, number>();
  if (!t.noName) out.push({ key: `${t.key}:name`, kind: 'sign', pos: V3(t.x, 1.25, t.z - 0.3), runs: [{ text: `${t.kind ?? 'TABLE'} `, color: P.muted, size: 36 }, { text: t.name, color: P.text, weight: 800 }], height: 0.48, bg: hex(P.slab), info: t.info });
  if (!ghost) out.push({ key: `${t.key}:base`, kind: 'block', pos: V3(t.x, 0, t.z + (t.rows.length * PITCH) / 2), size: [L.W + 0.45, Y0, t.rows.length * PITCH + CD + 0.45], color: P.slab, info: t.info });
  t.cols.forEach((c, i) => {
    const base = t.tone === 'result' ? P.good : ghost ? P.ghost : c.key === 'pk' || c.key === 'pkfk' ? P.key : c.key === 'fk' ? FK : P.accent;
    const color = hi.get(`h:${c.name}`) ?? hi.get(`c:${c.name}`) ?? base;
    out.push({ key: `${t.key}:h:${c.name}`, kind: 'block', pos: V3(L.xs[i]!, Y0, t.z), size: [colW(c), HH, CD], color, text: c.name, textColor: ghost ? P.text : ink(color, P.cellText), opacity: ghost ? 0.6 : undefined, info: t.headInfo?.(c) ?? t.info });
  });
  t.rows.forEach((r, ri) => t.cols.forEach((c, i) => {
    const v = r.v[c.name];
    const h = hi.get(`${r.id}:${c.name}`) ?? hi.get(`r:${r.id}`) ?? hi.get(`c:${c.name}`);
    const color = h ?? (ghost ? P.ghost : P.cell);
    out.push({ key: `${t.key}:c:${r.id}:${c.name}`, kind: 'block', pos: V3(L.xs[i]!, Y0, L.rz(ri)), size: [colW(c), CH, CD], color, text: v ?? 'NULL', textColor: v == null ? P.muted : h !== undefined ? ink(color, P.cellText) : P.cellText, opacity: ghost ? 0.4 : undefined, info: t.cellInfo?.(r, c) ?? t.info });
  }));
  return out;
}

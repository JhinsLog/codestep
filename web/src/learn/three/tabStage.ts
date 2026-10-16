// 여러 표가 놓인 무대: 결과 표의 칸은 원래 칸 자리에서 날아온다(from). 조인·관계대수·SELECT 처리 순서가 같이 쓴다.
import type { SyncOpts, Want } from './keyed';
import type { Base } from './kit';
import { tLayout, tableWants, type TCol, type TRow, type TView } from './tables';
import type { Info } from './world';

export interface SRow extends TRow {
  /** 열 → 이 칸이 날아올 원래 칸의 이름표 */
  from?: Record<string, string>;
}
export interface STable {
  key: string; name: string; kind?: string; cols: TCol[]; rows: SRow[]; x: number; z: number;
  tone?: TView['tone']; info?: Info; hi?: Map<string, number>; noName?: boolean;
  cellInfo?: TView['cellInfo'];
}

export const cellKey = (t: string, id: string, col: string) => `${t}:c:${id}:${col}`;

export class TabStage {
  tables: STable[] = [];
  extra: () => Want[] = () => [];
  constructor(readonly b: Base) {
    b.w.onRepaint = () => void this.draw({ ms: 0 });
  }
  get(key: string) { return this.tables.find((t) => t.key === key); }
  set(t: STable) {
    const i = this.tables.findIndex((x) => x.key === t.key);
    if (i >= 0) this.tables[i] = t; else this.tables.push(t);
  }
  drop(key: string) { this.tables = this.tables.filter((t) => t.key !== key); }

  want(): Want[] {
    return [...this.tables.flatMap((t) => tableWants(this.b.w, { ...t, hi: t.hi })), ...this.extra()];
  }

  /** 새 칸은 from이 가리키는 칸 자리에서 날아온다 */
  async draw(o: SyncOpts & { fit?: boolean } = {}) {
    const { k } = this.b;
    if (o.fit !== false && o.ms !== 0) this.fit();
    const pos = new Map(k.keys().map((kk) => [kk, k.get(kk)!.position.clone()]));
    const spawn = (key: string, to: import('three').Vector3) => {
      const user = o.spawn?.(key, to);
      if (user) return user;
      const m = /^([^:]+):c:([^:]+):(.+)$/.exec(key);
      if (!m) return undefined;
      const src = this.get(m[1]!)?.rows.find((r) => r.id === m[2])?.from?.[m[3]!];
      return src ? pos.get(src) : undefined;
    };
    await k.sync(this.want(), { arc: 1.1, ...o, spawn });
  }

  /** 모든 표가 들어오게 카메라를 맞춘다 */
  fit(pad = 0.6, front = 0.6) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const t of this.tables) {
      const L = tLayout(t);
      x0 = Math.min(x0, L.x0); x1 = Math.max(x1, L.x1); z0 = Math.min(z0, L.z0 - 1.2); z1 = Math.max(z1, L.z1);
    }
    if (x0 === Infinity) { x0 = -3; x1 = 3; z0 = -1; z1 = 2; }
    this.b.w.fit(x0 - pad, x1 + pad, z0, z1 + front);
  }
}

export const cols = (...spec: [string, number?, TCol['key']?][]): TCol[] => spec.map(([name, w, key]) => ({ name, w, key }));
export const rows = (names: string[], data: (string | null)[][], pre: string): SRow[] =>
  data.map((d, i) => ({ id: `${pre}${i}`, v: Object.fromEntries(names.map((c, j) => [c, d[j] ?? null])) }));

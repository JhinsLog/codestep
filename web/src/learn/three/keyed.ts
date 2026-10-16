// 이름표(key)로 물체를 맞춰 그리는 도구: "지금 있어야 할 것" 목록을 주면
// 새로 생긴 것은 튀어나오고, 자리가 바뀐 것은 미끄러지고, 없어진 것은 사라진다.
import { Object3D, Vector3, type Group } from 'three';
import type { Run } from '../../view/three/text';
import type { Info, World } from './world';

export type Want =
  | { key: string; kind: 'block'; pos: Vector3; size: [number, number, number]; color: number; text?: string; textColor?: string; opacity?: number; glow?: number; info?: Info }
  | { key: string; kind: 'sign'; pos: Vector3; runs: Run[]; height: number; bg?: string; info?: Info }
  | { key: string; kind: 'obj'; pos: Vector3; make: () => Object3D; sig?: string; info?: Info };

export type Exit = 'shrink' | 'fall' | 'fly';

export interface SyncOpts {
  ms?: number;
  /** 사라지는 모양 (이름표별로 다르게 줄 수도 있다) */
  exit?: Exit | ((key: string) => Exit);
  /** 새로 생기는 물체의 출발 위치. 없으면 제자리에서 튀어나온다 */
  spawn?: (key: string, to: Vector3) => Vector3 | undefined;
  /** 출발 위치에서 날아올 때의 포물선 높이 */
  arc?: number;
}

export class Keyed {
  private readonly objs = new Map<string, Object3D>();
  private readonly sigs = new Map<string, string>();
  constructor(private readonly w: World, private readonly root: Object3D) {}

  get(key: string): Object3D | undefined { return this.objs.get(key); }
  has(key: string): boolean { return this.objs.has(key); }
  keys(): string[] { return [...this.objs.keys()]; }
  /** 이름표 앞부분이 같은 물체들 */
  starting(prefix: string): Object3D[] { return [...this.objs].filter(([k]) => k.startsWith(prefix)).map(([, o]) => o); }

  private make(w: Want): Object3D {
    let o: Object3D;
    if (w.kind === 'block') {
      o = this.w.block(w.size[0], w.size[1], w.size[2], w.color, w.text !== undefined ? { text: w.text, color: w.textColor ?? this.w.pal.cellText } : undefined, { opacity: w.opacity, info: w.info });
      if (w.glow) this.w.tint(o as Group, w.color, w.glow);
    } else if (w.kind === 'sign') {
      o = this.w.sign(w.runs, w.height, w.bg);
      if (w.info) o.userData.info = w.info;
    } else {
      o = w.make();
      if (w.info) o.userData.info = w.info;
    }
    return o;
  }

  private sig(w: Want): string {
    if (w.kind === 'sign') return `S${JSON.stringify(w.runs)}|${w.height}|${w.bg ?? ''}`;
    if (w.kind === 'obj') return `O${w.sig ?? ''}`;
    return 'B';
  }

  async sync(want: Want[], o: SyncOpts = {}): Promise<void> {
    const ms = o.ms ?? 600;
    const keep = new Set(want.map((w) => w.key));
    const jobs: Promise<void>[] = [];
    for (const [k, obj] of [...this.objs]) {
      if (keep.has(k)) continue;
      this.objs.delete(k);
      this.sigs.delete(k);
      const how = typeof o.exit === 'function' ? o.exit(k) : o.exit ?? 'shrink';
      jobs.push(this.w.vanish(obj, how));
    }
    for (const w of want) {
      let obj = this.objs.get(w.key);
      const sig = this.sig(w);
      if (obj && this.sigs.get(w.key) !== sig) {
        // 모양이 바뀐 표지판·물체는 새로 만들어 같은 자리에 둔다
        const at = obj.position.clone();
        this.w.remove(obj);
        obj = this.make(w);
        obj.position.copy(at);
        this.root.add(obj);
        this.objs.set(w.key, obj);
        this.sigs.set(w.key, sig);
      }
      if (!obj) {
        obj = this.make(w);
        this.objs.set(w.key, obj);
        this.sigs.set(w.key, sig);
        this.root.add(obj);
        const from = o.spawn?.(w.key, w.pos);
        if (from) {
          obj.position.copy(from);
          jobs.push(this.w.move(obj, w.pos, ms + 150, o.arc ?? 0));
        } else {
          obj.position.copy(w.pos);
          jobs.push(this.w.pop(obj, ms * 0.8));
        }
        continue;
      }
      if (w.kind === 'block') {
        const g = obj as Group;
        if (w.info) g.userData.info = w.info;
        this.w.tint(g, w.color, w.glow ?? 0);
        this.w.opacity(g, w.opacity ?? 1);
        const [a, b, c] = w.size;
        // 크기가 그대로면 바로, 바뀌면 다 자란 뒤에 윗면 글자를 붙인다
        jobs.push(this.w.reshape(g, a, b, c, ms).then(() => this.w.setTop(g, w.text ?? '', w.textColor ?? this.w.pal.cellText)));
      } else if (w.info) obj.userData.info = w.info;
      jobs.push(this.w.move(obj, w.pos, ms));
    }
    await Promise.all(jobs);
  }

  /** 모두 치운다(움직임 없이) */
  clear() {
    for (const obj of this.objs.values()) this.w.remove(obj);
    this.objs.clear();
    this.sigs.clear();
  }
}

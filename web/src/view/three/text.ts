// 3D 장면의 글자. 캔버스에 글자를 그려 텍스처로 쓴다(웹 글꼴·외부 자원 없이).
// 같은 글자·모양은 텍스처 하나를 같이 쓰고, 아무도 안 쓰면 GPU 메모리를 돌려준다.
import { CanvasTexture, SRGBColorSpace } from 'three';

export const SANS = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", sans-serif';
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "D2Coding", monospace';

/** 한 줄 안에서 모양이 다른 조각들 (예: 굵은 이름 + 흐린 타입) */
export interface Run {
  text: string;
  color: string;
  size?: number;      // px, 기본 44
  weight?: number;    // 기본 600
  mono?: boolean;
}

export interface Tex {
  tex: CanvasTexture;
  aspect: number;     // 너비 / 높이
}

interface Entry extends Tex { users: number; key: string }

const cache = new Map<string, Entry>();
const byTex = new Map<CanvasTexture, Entry>();
let anisotropy = 1;

export function setAnisotropy(n: number): void {
  anisotropy = n;
}

function make(key: string, draw: () => HTMLCanvasElement): Tex {
  let e = cache.get(key);
  if (!e) {
    const canvas = draw();
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = anisotropy;
    e = { tex, aspect: canvas.width / canvas.height, users: 0, key };
    cache.set(key, e);
    byTex.set(tex, e);
  }
  e.users++;
  return e;
}

export function release(t: Tex | null | undefined): void {
  if (!t) return;
  const e = byTex.get(t.tex);
  if (!e) return;
  if (--e.users > 0) return;
  cache.delete(e.key);
  byTex.delete(e.tex);
  e.tex.dispose();
}

const font = (r: Run) => `${r.weight ?? 600} ${r.size ?? 44}px ${r.mono ? MONO : SANS}`;

/** 글자 조각들을 한 줄로. 표지판(Sprite)용, 배경은 투명 */
export function label(runs: Run[], bg?: string): Tex {
  return make(`L${bg ?? ''}|${JSON.stringify(runs)}`, () => {
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    const padX = bg ? 22 : 6;
    const max = Math.max(...runs.map((r) => r.size ?? 44));
    const h = Math.ceil(max * 1.45) + (bg ? 16 : 4);
    let w = padX * 2;
    for (const r of runs) { g.font = font(r); w += g.measureText(r.text).width; }
    c.width = Math.min(2048, Math.ceil(w));
    c.height = h;
    if (bg) {
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(0, 0, c.width, h, h / 2);
      g.fill();
    }
    let x = padX;
    g.textBaseline = 'middle';
    for (const r of runs) {
      g.font = font(r);
      g.fillStyle = r.color;
      g.fillText(r.text, x, h / 2 + 2);
      x += g.measureText(r.text).width;
    }
    return c;
  });
}

/** 정육면체 한 면에 들어갈 값. 길면 글자를 줄이고 그래도 길면 자른다 */
export function face(text: string, color: string): Tex {
  return make(`F${color}|${text}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    let size = 104;
    let t = text;
    const fits = () => { g.font = `700 ${size}px ${MONO}`; return g.measureText(t).width <= 224; };
    while (!fits() && size > 40) size -= 6;
    while (!fits() && t.length > 2) t = `${t.slice(0, -2)}…`;
    g.fillText(t, 128, 136);
    return c;
  });
}

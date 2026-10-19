// 3D 무대: 한 단계(Step)의 호출 스택·힙을 입체로 그리고, 단계 사이의 변화를 움직임으로 보여준다.
//
//   호출 스택  — 함수 하나가 판 하나. 호출하면 위에서 떨어져 쌓이고, 끝나면 떠올라 사라진다
//   변수·칸    — 값이 적힌 상자. 값이 바뀌면 상자가 구르고, 출처가 보이면 값이 날아온다
//   힙         — 배열은 상자 줄, 스택은 탑, 맵은 키→값 줄, 객체는 필드 판
//   참조       — 변수 상자에서 객체로 이어지는 곡선 화살표
//   인덱스     — i, j 같은 변수가 배열 칸 위에 깃발로 떠서 칸 사이를 미끄러진다
//
// Trace 계약만 보므로 어느 언어의 기록이든 같은 화면이 나온다.
import {
  AmbientLight, CanvasTexture, Color, SRGBColorSpace, ConeGeometry, DirectionalLight, Fog, GridHelper, Group, HemisphereLight,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry,
  QuadraticBezierCurve3, Raycaster, Scene, ShadowMaterial, Sprite, SpriteMaterial, TubeGeometry,
  Vector2, Vector3, WebGLRenderer, type Object3D,
  MOUSE,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Frame, HeapObj, Step, Value, Var } from '../trace/types';
import type { Spot } from './narrate';
import { el, fnLabel, shortAddr, showValue, type RenderCtx, type StageView } from './stage';
import { face, label, release, setAnisotropy, MONO, type Run, type Tex } from './three/text';
import { isDark, onTheme } from '../theme';
import { snapshots, type Snapshot } from './three/history';
import { argSource, findSource, sameValue, type Ctx, type Dest, type Source } from './three/flow';

// ── 치수 ───────────────────────────────────────────────

const C = 0.9;            // 상자 한 변
const PITCH = 1.06;       // 배열 칸 간격
const VAR_PITCH = 1.32;   // 변수 간격 (이름표 자리)
const LEVEL = 2.1;        // 프레임 층 높이
const MINI = 0.42;        // 접힌 프레임 층 높이
const FULL_FRAMES = 5;    // 펼쳐 보이는 위쪽 프레임 수
const ROW_CELLS = 12;
const MAX_CELLS = 48;
const MAX_ENTRIES = 24;
const ROW_D = 1.5;        // 배열 줄 간격
const SLAB_H = 0.2;
const HIST_ROWS = 8;        // 회차 기록을 보여 주는 최대 줄 수
const HIST_PITCH = 0.62;    // 기록 줄 간격
const HIST_CELL = 0.6;      // 기록 칸 간격
const HIST_LABEL_W = 1.85;  // 기록 줄 이름('3회차 후') 자리

const INDEX_NAME = /^(i|j|k|l|r|m|lo|hi|left|right|mid|low|high|idx|index|start|end|top|front|rear|p|q|pos|cur)$/i;

// ── 색 ─────────────────────────────────────────────────

interface Palette {
  bg: number; grid: number; shadow: number;
  text: string; muted: string; accent: string; gold: string; danger: string;
  slab: number; slabTop: number; slabMini: number; slabExc: number; heapSlab: number;
  box: Record<'num' | 'str' | 'bool' | 'ref' | 'null' | 'other', [number, string]>;
  arrow: number; arrowHot: number; flash: number; ret: number; marker: number;
  zoneStack: number; zoneHeap: number; gc: number;
}

const LIGHT: Palette = {
  bg: 0xf6f7f9, grid: 0xe3e7ec, shadow: 0.13,
  text: '#1c2128', muted: '#667085', accent: '#2563eb', gold: '#b7791f', danger: '#b42318',
  slab: 0xffffff, slabTop: 0xdbe7ff, slabMini: 0xe9edf2, slabExc: 0xfde8e7, heapSlab: 0xfbfcfd,
  box: {
    num: [0xe4ecff, '#1d4ed8'], str: [0xfdecd6, '#a1460a'], bool: [0xeee6ff, '#6d28d9'],
    ref: [0x334155, '#ffffff'], null: [0xe5e7eb, '#6b7280'], other: [0xeceff3, '#475467'],
  },
  arrow: 0x2563eb, arrowHot: 0xf59e0b, flash: 0xf59e0b, ret: 0xfbbf24, marker: 0x2563eb,
  zoneStack: 0xe3eafb, zoneHeap: 0xe5f1e7, gc: 0xc9ced6,
};

const DARK: Palette = {
  bg: 0x0f1115, grid: 0x232833, shadow: 0.35,
  text: '#e6e8ec', muted: '#8b93a1', accent: '#6ea0ff', gold: '#fbbf24', danger: '#ff8a80',
  slab: 0x1f2430, slabTop: 0x1d2b4a, slabMini: 0x191d26, slabExc: 0x3a1717, heapSlab: 0x1a1e27,
  box: {
    num: [0x1f3157, '#bcd2ff'], str: [0x45301a, '#f6c08a'], bool: [0x33285a, '#d4c2ff'],
    ref: [0x6ea0ff, '#0f1115'], null: [0x2a2f3a, '#9aa3ae'], other: [0x2a2f3a, '#c0c6d0'],
  },
  arrow: 0x6ea0ff, arrowHot: 0xfbbf24, flash: 0xfbbf24, ret: 0xd69e2e, marker: 0x6ea0ff,
  zoneStack: 0x141b2b, zoneHeap: 0x122019, gc: 0x3a404b,
};

const boxColors = (p: Palette, v: Value): [number, string] =>
  v.t === 'num' ? p.box.num
    : v.t === 'str' || v.t === 'char' ? p.box.str
      : v.t === 'bool' ? p.box.bool
        : v.t === 'ref' ? p.box.ref
          : v.t === 'null' ? p.box.null : p.box.other;

// 참조는 객체 번호(#43)로 적는다. 자바는 실제 메모리 주소를 보여 주지 않으므로 JVM이 객체마다 붙인 고유 번호를 쓴다
const faceText = (v: Value): string =>
  v.t === 'ref' ? (v.addr ? shortAddr(v.addr) : `#${v.id}`) : showValue(v);

/** 참조가 가리키는 도착점 키: 배열의 특정 칸이면 'id[칸]' */
const refTarget = (v: Value & { t: 'ref' }): string => (v.idx !== undefined && v.idx !== null ? `${v.id}[${v.idx}]` : v.id);

/** 마우스 설명용 값 표기. 참조는 "참조값 #43 → 힙의 int[]" */
function say(v: Value, heap: Record<string, HeapObj>): string {
  if (v.t !== 'ref') return v.t === 'str' && v.addr ? `${showValue(v, heap)} (문자열 상수, 주소 ${v.addr})` : showValue(v, heap);
  if (v.id.startsWith('@var:')) return `포인터 ${v.addr ?? ''} → 변수 ${v.id.split(':')[2]}의 주소`;
  const o = heap[v.id];
  const at = v.idx !== undefined && v.idx !== null ? `[${v.idx}] 칸` : '';
  if (v.addr) return `포인터 ${v.addr} → ${o ? `${shortType(o.type)}${at}` : '?'}${o?.region === 'heap' ? ' (malloc 메모리)' : ''}`;
  return `참조값 #${v.id} → 힙의 ${o ? shortType(o.type) : '객체'}`;
}
const shortType = (t: string) => t.replace(/\b[\w$]+\./g, '');

// ── 장면 요소 ──────────────────────────────────────────

/** 공용 도형 (모든 상자가 같이 쓴다) */
class Shapes {
  readonly box = new RoundedBoxGeometry(C, C, C, 3, 0.09);
  readonly face = new PlaneGeometry(C * 0.86, C * 0.86);
  readonly cone = new ConeGeometry(0.16, 0.34, 18);
  readonly head = new ConeGeometry(0.11, 0.3, 14);
  readonly plane = new PlaneGeometry(1, 1);
  dispose() {
    this.box.dispose(); this.face.dispose(); this.cone.dispose(); this.head.dispose(); this.plane.dispose();
  }
}

/** 장면에 놓이는 것. 목표 위치·크기로 매 프레임 조금씩 다가간다 */
abstract class Item {
  readonly group = new Group();
  readonly target = new Vector3();
  targetScale = 1;
  gen = 0;
  dying = false;
  delay = 0;                        // 이 시간(초)이 지난 뒤에 움직이기 시작한다 (GC 표시를 잠깐 보여 줄 때)
  ttl = 0;                          // 0보다 크면 이 시간 뒤에 스스로 사라진다
  readonly half = new Vector3(0.5, 0.5, 0.5);   // 화면 맞춤에 쓰는 반 크기
  constructor(public key: string) {
    this.group.scale.setScalar(0.001);
  }

  /** a: 이번 프레임에 남은 거리의 몇 분의 일을 갈지 (0~1). 아직 움직이면 true */
  tick(a: number, dt: number): boolean {
    if (this.delay > 0) { this.delay -= dt; return true; }
    if (this.ttl > 0) {
      this.ttl -= dt;
      if (this.ttl <= 0) { this.dying = true; this.targetScale = 0; }
    }
    let moving = this.ttl > 0;
    const p = this.group.position;
    if (p.distanceToSquared(this.target) > 1e-6) { p.lerp(this.target, a); moving = true; } else p.copy(this.target);
    const s = this.group.scale.x;
    const d = this.targetScale - s;
    if (Math.abs(d) > 2e-3) { this.group.scale.setScalar(Math.max(0.001, s + d * a)); moving = true; }
    else this.group.scale.setScalar(Math.max(0.001, this.targetScale));
    return moving;
  }

  abstract dispose(): void;
}

function sprite(t: Tex, height: number, cx = 0.5, cy = 0.5): Sprite {
  const s = new Sprite(new SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false }));
  s.scale.set(height * t.aspect, height, 1);
  s.center.set(cx, cy);
  return s;
}

/** 글자 표지판 (항상 화면을 본다) */
class Label extends Item {
  private tex: Tex | null = null;
  private sp: Sprite | null = null;
  private sig = '';

  set(runs: Run[], height: number, cx = 0.5, cy = 0.5, bg?: string) {
    const sig = JSON.stringify([runs, height, cx, cy, bg]);
    if (sig === this.sig) return;
    this.sig = sig;
    this.clear();
    this.tex = label(runs, bg);
    this.sp = sprite(this.tex, height, cx, cy);
    this.group.add(this.sp);
  }

  private clear() {
    if (this.sp) { this.group.remove(this.sp); this.sp.material.dispose(); }
    release(this.tex);
    this.sp = null;
    this.tex = null;
  }

  dispose() { this.clear(); }
}

/** 바닥에 누운 글자 (구역 이름, 객체 이름판) */
class FloorText extends Item {
  private tex: Tex | null = null;
  private mesh: Mesh<PlaneGeometry, MeshBasicMaterial> | null = null;
  private sig = '';
  constructor(key: string, private readonly shapes: Shapes) { super(key); }

  /** ax: 0이면 왼쪽 끝이 위치, 1이면 오른쪽 끝 */
  set(runs: Run[], height: number, ax = 0) {
    const sig = JSON.stringify([runs, height, ax]);
    if (sig === this.sig) return;
    this.sig = sig;
    this.clear();
    this.tex = label(runs);
    const m = new Mesh(this.shapes.plane, new MeshBasicMaterial({ map: this.tex.tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(height * this.tex.aspect, height, 1);
    m.position.x = (0.5 - ax) * height * this.tex.aspect;
    m.position.y = 0.01;
    this.mesh = m;
    this.group.add(m);
  }

  private clear() {
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.material.dispose(); }
    release(this.tex);
    this.mesh = null;
    this.tex = null;
  }

  dispose() { this.clear(); }
}

/** 바닥 구역 (스택 영역·힙 영역) */
class FloorRect extends Item {
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  constructor(key: string, shapes: Shapes) {
    super(key);
    this.mesh = new Mesh(shapes.plane, new MeshBasicMaterial({ transparent: true, opacity: 0.75, depthWrite: false }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.003;
    this.mesh.renderOrder = -1;
    this.group.add(this.mesh);
  }

  set(w: number, d: number, color: number) {
    this.mesh.scale.set(w, d, 1);
    this.mesh.material.color.setHex(color);
    this.half.set(w / 2, 0, d / 2);
  }

  dispose() { this.mesh.material.dispose(); }
}

/** 화면 출력판: System.out으로 찍은 글이 쌓이는 단말기 화면 */
class Board extends Item {
  static readonly W = 4.6;
  static readonly H = 2.6;
  readonly mesh: Mesh<RoundedBoxGeometry, MeshStandardMaterial>;
  private readonly screen: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly canvas = document.createElement('canvas');
  private readonly tex: CanvasTexture;
  private sig = '';
  private glowT = 0;
  info = '';

  constructor(key: string) {
    super(key);
    const { W, H } = Board;
    this.half.set(W / 2, H / 2, 0.1);
    this.mesh = new Mesh(new RoundedBoxGeometry(W, H, 0.18, 2, 0.07),
      new MeshStandardMaterial({ color: 0x1b2130, roughness: 0.55, emissive: 0x22c55e, emissiveIntensity: 0 }));
    this.mesh.castShadow = true;
    this.mesh.userData.item = this;
    this.canvas.width = 1024;
    this.canvas.height = Math.round((1024 * (H - 0.3)) / (W - 0.3));
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.screen = new Mesh(new PlaneGeometry(W - 0.3, H - 0.3), new MeshBasicMaterial({ map: this.tex }));
    this.screen.position.z = 0.095;
    this.group.add(this.mesh, this.screen);
  }

  /** text: 지금까지의 출력, fresh: 이 위치부터는 새로 나온 글 (밝게) */
  show(text: string, fresh: number) {
    const sig = `${fresh}|${text}`;
    if (sig === this.sig) return;
    this.sig = sig;
    const g = this.canvas.getContext('2d')!;
    const { width: w, height: h } = this.canvas;
    g.fillStyle = '#0b0f14';
    g.fillRect(0, 0, w, h);
    g.font = `600 50px ${MONO}`;
    g.textBaseline = 'top';
    const lines: { text: string; at: number }[] = [];
    let at = 0;
    for (const t of text.split('\n')) { lines.push({ text: t, at }); at += t.length + 1; }
    if (lines.length && lines.at(-1)!.text === '') lines.pop();
    if (lines.length === 0) {
      g.fillStyle = '#5b6576';
      g.fillText('(아직 출력 없음)', 28, 26);
    }
    const max = Math.floor((h - 40) / 64);
    lines.slice(-max).forEach((l, i) => {
      let t = l.text;
      while (t.length > 1 && g.measureText(t).width > w - 56) t = `${t.slice(0, -2)}…`;
      // 새로 나온 글(fresh 뒤)이 걸친 줄은 밝은 초록, 나머지는 회색
      const isNew = fresh < text.length && l.at + l.text.length >= fresh;
      g.fillStyle = isNew ? '#7ee787' : '#c9d1d9';
      g.fillText(t, 28, 24 + i * 64);
    });
    this.tex.needsUpdate = true;
  }

  ping() { this.glowT = 1; }

  override tick(a: number, dt: number): boolean {
    let moving = super.tick(a, dt);
    if (this.glowT > 0) {
      this.glowT = Math.max(0, this.glowT - dt * 1.2);
      this.mesh.material.emissiveIntensity = this.glowT * 0.7;
      moving = true;
    }
    return moving;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.screen.geometry.dispose();
    this.screen.material.dispose();
    this.tex.dispose();
  }
}

/** 판: 프레임·객체의 바탕 */
class Slab extends Item {
  readonly mesh: Mesh<RoundedBoxGeometry, MeshStandardMaterial>;
  private size = '';
  info = '';
  heapId?: string;
  constructor(key: string) {
    super(key);
    this.mesh = new Mesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.05), new MeshStandardMaterial({ roughness: 0.85 }));
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.mesh.userData.item = this;
    this.group.add(this.mesh);
  }

  shape(w: number, h: number, d: number, color: number) {
    this.half.set(w / 2, h / 2, d / 2);
    const sig = `${w.toFixed(2)}x${h.toFixed(2)}x${d.toFixed(2)}`;
    if (sig !== this.size) {
      this.size = sig;
      this.mesh.geometry.dispose();
      this.mesh.geometry = new RoundedBoxGeometry(w, h, d, 2, Math.min(0.08, h / 2 - 0.001));
    }
    this.mesh.material.color.setHex(color);
  }

  glow(on: boolean, color: number) {
    this.mesh.material.emissive.setHex(color);
    this.mesh.material.emissiveIntensity = on ? 0.35 : 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

type SrcMeta = Omit<Source, 'value' | 'key'>;

/** 값 상자: 앞면과 윗면에 값, 위에 이름표 */
class VBox extends Item {
  readonly body = new Group();
  readonly mesh: Mesh<RoundedBoxGeometry, MeshStandardMaterial>;
  private readonly front: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly top: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private tex: Tex | null = null;
  private nameTex: Tex | null = null;
  private nameSp: Sprite | null = null;
  private nameSig = '';
  value: Value = { t: 'null' };
  shown = '';
  info = '';
  src: SrcMeta | null = null;
  flash = 0;
  private roll = 0;

  constructor(key: string, shapes: Shapes) {
    super(key);
    this.half.set(C / 2, C / 2 + 0.45, C / 2);   // 위쪽 이름표 자리까지
    this.mesh = new Mesh(shapes.box, new MeshStandardMaterial({ roughness: 0.55, emissiveIntensity: 0 }));
    this.mesh.castShadow = true;
    this.mesh.userData.item = this;
    this.front = new Mesh(shapes.face, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
    this.front.position.z = C / 2 + 0.004;
    // 윗면 글자는 앞에 다른 상자가 있어 앞면이 가려지는 자리(맵, 여러 줄 배열)에서만 켠다
    this.top = new Mesh(shapes.face, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
    this.top.rotation.x = -Math.PI / 2;
    this.top.position.y = C / 2 + 0.004;
    this.top.visible = false;
    this.body.add(this.mesh, this.front, this.top);
    this.group.add(this.body);
  }

  /** 보이는 값을 바꾼다 */
  look(v: Value, p: Palette) {
    const text = faceText(v);
    const [bg, fg] = boxColors(p, v);
    this.value = v;
    this.mesh.material.color.setHex(bg);
    if (text === this.shown && this.tex) return;
    this.shown = text;
    release(this.tex);
    this.tex = face(text, fg);
    this.front.material.map = this.tex.tex;
    this.front.material.needsUpdate = true;
    this.top.material.map = this.tex.tex;
    this.top.material.needsUpdate = true;
  }

  name(runs: Run[] | null) {
    const sig = JSON.stringify(runs);
    if (sig === this.nameSig) return;
    this.nameSig = sig;
    if (this.nameSp) { this.group.remove(this.nameSp); this.nameSp.material.dispose(); }
    release(this.nameTex);
    this.nameSp = null;
    this.nameTex = null;
    if (!runs) return;
    this.nameTex = label(runs);
    this.nameSp = sprite(this.nameTex, 0.4, 0.5, 0);
    this.nameSp.position.y = C / 2 + 0.16;
    this.group.add(this.nameSp);
  }

  showTop(on: boolean) { this.top.visible = on; }

  /** 가비지: 회색으로 흐려진다 */
  fade(gray: number) {
    this.mesh.material.color.setHex(gray);
    this.mesh.material.emissiveIntensity = 0;
    this.flash = 0;
    for (const m of [this.front.material, this.top.material]) { m.opacity = 0.45; }
  }

  /** 납작한 판 모양(회차 기록용): 윗면 글자만 보인다 */
  flat() {
    this.body.scale.y = 0.3;
    this.front.visible = false;
    this.top.visible = true;
  }

  /** 값이 바뀐 자리에서 구르기 */
  tumble() { this.roll = 1; }
  ping() { this.flash = 1; }

  override tick(a: number, dt: number): boolean {
    let moving = super.tick(a, dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 1.4);
      this.mesh.material.emissiveIntensity = this.flash * 0.85;
      moving = true;
    }
    if (this.roll > 0) {
      this.roll = Math.max(0, this.roll - dt * 3.2);
      const e = this.roll * this.roll * (3 - 2 * this.roll);
      this.body.rotation.x = -e * Math.PI / 2;
      moving = true;
    } else this.body.rotation.x = 0;
    return moving;
  }

  setFlashColor(c: number) { this.mesh.material.emissive.setHex(c); }

  dispose() {
    release(this.tex);
    release(this.nameTex);
    this.nameSp?.material.dispose();
    this.mesh.material.dispose();
    this.front.material.dispose();
    this.top.material.dispose();
  }
}

/** 인덱스 깃발: 배열 칸 위의 i, j */
class Marker extends Item {
  private readonly cone: Mesh<ConeGeometry, MeshStandardMaterial>;
  private tex: Tex | null = null;
  private sp: Sprite | null = null;
  private sig = '';
  constructor(key: string, shapes: Shapes, color: number) {
    super(key);
    this.cone = new Mesh(shapes.cone, new MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 }));
    this.cone.rotation.x = Math.PI;
    this.cone.castShadow = true;
    this.group.add(this.cone);
  }

  set(runs: Run[], outside: boolean) {
    this.cone.material.opacity = outside ? 0.45 : 1;
    this.cone.material.transparent = outside;
    const sig = JSON.stringify(runs);
    if (sig === this.sig) return;
    this.sig = sig;
    if (this.sp) { this.group.remove(this.sp); this.sp.material.dispose(); }
    release(this.tex);
    this.tex = label(runs);
    this.sp = sprite(this.tex, 0.4, 0.5, 0);
    this.sp.position.y = 0.2;
    this.group.add(this.sp);
  }

  dispose() {
    this.cone.material.dispose();
    this.sp?.material.dispose();
    release(this.tex);
  }
}

/** 참조 화살표: 변수 상자 → 객체 */
class Arrow {
  readonly group = new Group();
  private readonly tube: Mesh<TubeGeometry, MeshStandardMaterial>;
  private readonly cone: Mesh<ConeGeometry, MeshStandardMaterial>;
  grow = 0;
  gen = 0;
  hot = false;
  to = '';        // 가리키는 객체 id
  fromKey = '';   // 출발 상자 키
  constructor(shapes: Shapes, private color: number, private hotColor: number) {
    const mat = new MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.2 });
    this.tube = new Mesh(new TubeGeometry(), mat);
    this.cone = new Mesh(shapes.head, mat);
    this.group.add(this.tube, this.cone);
  }

  private sig = '';

  update(from: Vector3, to: Vector3) {
    // 끝점·자란 정도·강조가 그대로면 다시 만들지 않는다
    const sig = `${from.x.toFixed(3)},${from.y.toFixed(3)},${from.z.toFixed(3)}>${to.x.toFixed(3)},${to.y.toFixed(3)},${to.z.toFixed(3)}|${this.grow.toFixed(3)}|${this.hot}`;
    if (sig === this.sig) return;
    this.sig = sig;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y += 0.9 + from.distanceTo(to) * 0.22;
    const curve = new QuadraticBezierCurve3(from, mid, to);
    this.tube.geometry.dispose();
    this.tube.geometry = new TubeGeometry(curve, 28, 0.035, 6, false);
    const count = this.tube.geometry.index?.count ?? 0;
    this.tube.geometry.setDrawRange(0, Math.floor((count * this.grow) / 6) * 6);
    const t = Math.min(1, this.grow);
    const end = curve.getPoint(t);
    const dir = curve.getTangent(t);
    this.cone.position.copy(end).addScaledVector(dir, -0.12);
    this.cone.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
    this.cone.visible = this.grow > 0.05;
    this.tube.material.color.setHex(this.hot ? this.hotColor : this.color);
    this.tube.material.emissive.setHex(this.hot ? this.hotColor : this.color);
  }

  dispose() {
    this.tube.geometry.dispose();
    this.tube.material.dispose();
  }
}

/** 날아가는 값: 출처 상자에서 목적지 상자로 */
interface Flight {
  obj: Object3D;
  dispose: () => void;
  spin: boolean;
  from: Vector3;
  to: () => Vector3;
  t: number;
  dur: number;
  arc: number;
  land: () => void;
}

// ── 무대 ───────────────────────────────────────────────

export class Stage3D implements StageView {
  private readonly host: HTMLElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(38, 1, 0.1, 500);
  private readonly controls: OrbitControls;
  private readonly sun = new DirectionalLight(0xffffff, 2.1);
  private readonly hemi = new HemisphereLight(0xffffff, 0xdde3ea, 1.5);
  private readonly ambient = new AmbientLight(0xffffff, 0.35);
  private readonly floor: Mesh<PlaneGeometry, ShadowMaterial>;
  private readonly fog = new Fog(0xffffff, 30, 80);
  private grid: GridHelper;
  private readonly shapes = new Shapes();
  private pal: Palette;

  private readonly items = new Map<string, Item>();
  private readonly arrows = new Map<string, Arrow>();
  private flights: Flight[] = [];
  private refs: { key: string; from: string; to: string }[] = [];
  // 화살표 도착점: 객체 id, 배열 칸('id[3]'), 변수('@var:프레임:이름') → 위치와 따라 움직일 요소
  private readonly anchors = new Map<string, { pos: Vector3; item: string }>();
  private inlined = new Set<string>();       // 함수 판 위에 그린 객체 (C의 스택 배열·구조체)
  private inlinedPrev = new Set<string>();

  private gen = 0;
  private shown: number | null = null;
  private lastStep: { step: Step; ctx: RenderCtx } | null = null;
  private readonly heapSeq = new Map<string, number>();
  private stackW = 4;
  private heapFront: number | null = null;
  private heapMaxX = 0;
  private lang: RenderCtx['lang'] = 'java';
  private histCache: { steps: Step[]; all: Map<string, Snapshot[]> } | null = null;
  private histNow = new Map<string, Snapshot[]>();   // 지금 단계까지의 회차 기록 (객체 id → 줄들)   // 힙 객체들의 맨 앞 z (구역 이름 자리)
  private tempo = 800;
  private readonly reduced: boolean;

  private userCam = false;
  private readonly fitTarget = new Vector3();
  private readonly fitPos = new Vector3();
  private fitting = false;
  private readonly viewDir = new Vector3(0.2, 0.78, 1).normalize();

  private raf = 0;
  private idle = 0;
  private lastT = 0;
  private hovered: Item | null = null;
  private readonly mouse = new Vector2();
  private readonly ray = new Raycaster();
  private pointerPending = false;

  private readonly ui: { banner: HTMLElement; msg: HTMLElement; tip: HTMLElement; reset: HTMLButtonElement };
  private readonly ro: ResizeObserver;
  private readonly offTheme: () => void;

  constructor(parent: HTMLElement) {
    this.host = el('div', 's3d');
    parent.append(this.host);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pal = isDark() ? DARK : LIGHT;

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    setAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.host.append(this.renderer.domElement);

    // 화면 위 글: 사건 배너, 빈 화면 안내, 조작법, 시점 버튼, 마우스 설명
    const banner = el('div', 's3d-banner');
    const msg = el('div', 's3d-msg');
    const help = el('div', 's3d-help', '드래그 이동 · 우클릭 드래그 회전 · 휠 확대 · 더블클릭 시점 초기화');
    const reset = el('button', 's3d-reset', '⟲ 시점 맞추기');
    reset.hidden = true;
    reset.addEventListener('click', () => this.resetView());
    const tip = el('div', 's3d-tip');
    tip.hidden = true;
    this.host.append(banner, msg, help, reset, tip, ...legend());
    this.ui = { banner, msg, tip, reset };

    this.camera.position.set(6, 10, 18);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // 왼쪽 드래그 = 이동, 오른쪽 드래그 = 회전 (사용자 요청), 휠 = 확대
    this.controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 140;
    this.controls.addEventListener('change', () => this.wake());
    this.controls.addEventListener('start', () => {
      this.userCam = true;
      this.fitting = false;
      this.ui.reset.hidden = false;
    });

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.ambient);

    this.floor = new Mesh(new PlaneGeometry(600, 600), new ShadowMaterial({ opacity: this.pal.shadow }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.grid = this.makeGrid();
    this.applyPalette();

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', (e) => this.onPointer(e));
    canvas.addEventListener('pointerleave', () => this.hover(null));
    canvas.addEventListener('dblclick', () => this.resetView());

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host);
    this.offTheme = onTheme(this.onTheme);
    this.resize();
    this.zones();
    this.fit(true);
  }

  // ── StageView ────────────────────────────────────────

  clear(message?: string) {
    for (const it of this.items.values()) this.drop(it);
    this.items.clear();
    for (const a of this.arrows.values()) { this.scene.remove(a.group); a.dispose(); }
    this.arrows.clear();
    for (const f of this.flights) this.endFlight(f);
    this.flights = [];
    this.refs = [];
    this.heapSeq.clear();
    this.stackW = 4;
    this.shown = null;
    this.lastStep = null;
    this.heapFront = null;
    this.histCache = null;
    this.ui.banner.replaceChildren();
    this.ui.msg.textContent = message ?? '실행하면 여기에 변수와 자료구조가 3D로 나타납니다.';
    this.ui.msg.hidden = false;
    this.zones();
    if (!this.userCam) this.fit(true);
    this.wake();
  }

  setTempo(ms: number) {
    this.tempo = ms;
  }

  render(raw: Step, _prev: Step | undefined, ctx: RenderCtx) {
    this.ui.msg.hidden = true;
    this.lastStep = { step: raw, ctx };
    this.lang = ctx.lang ?? 'java';
    const step = tidy(raw);
    const gen = ++this.gen;
    const from = this.shown;
    const fromStep = from !== null && ctx.steps[from] ? tidy(ctx.steps[from]) : undefined;
    const animate = from !== null && !this.reduced;
    // 바로 다음 단계이거나, 그 사이에 더 깊은 함수만 다녀왔으면(넘어가기) 값의 출처를 보여준다
    let flowOk = animate && from !== null && ctx.index > from;
    if (flowOk && from !== null) {
      const base = ctx.steps[from]!.frames.length;
      for (let i = from + 1; i < ctx.index; i++) if (ctx.steps[i]!.frames.length <= base) { flowOk = false; break; }
    }

    // 지금 장면의 상자들 = 이번 변화의 출처 후보
    const sources: Source[] = [];
    const srcPos = new Map<string, Vector3>();
    if (flowOk) {
      for (const it of this.items.values()) {
        if (!(it instanceof VBox) || it.dying || !it.src) continue;
        sources.push({ ...it.src, key: it.key, value: it.value });
        srcPos.set(it.key, it.target.clone());
      }
    }

    const changes: Change[] = [];
    const L: Layout = { gen, step, changes };

    for (const id of Object.keys(step.heap)) if (!this.heapSeq.has(id)) this.heapSeq.set(id, this.heapSeq.size);
    const owners = ownersOf(step, fromStep);

    // 회차 기록: 전체 기록에서 한 번만 계산하고, 지금 단계까지만 보여 준다 (시작 + 한 바퀴 이상일 때부터)
    if (this.histCache?.steps !== ctx.steps) this.histCache = { steps: ctx.steps, all: snapshots(ctx.steps, ctx.source, ctx.lang) };
    this.histNow = new Map();
    for (const [id, list] of this.histCache.all) {
      const upto = list.filter((h) => h.step <= ctx.index);
      if (upto.length >= 2 && step.heap[id]) this.histNow.set(id, upto);
    }

    this.anchors.clear();
    this.inlinedPrev = this.inlined;
    this.inlined = new Set();
    this.layoutStack(L, step, fromStep);
    this.layoutHeap(L, step, owners, fromStep);
    this.layoutReturn(L, step);
    this.layoutOutput(L, step, fromStep, ctx, animate && from !== null && ctx.index > from);
    this.zones(step);

    // 넘어가기로 건너뛴 함수 호출의 반환값도 출처 후보
    if (flowOk && from !== null) {
      const depth = step.frames.length;
      for (let i = ctx.index - 1; i > from; i--) {
        const s = ctx.steps[i]!;
        if (s.event === 'return' && s.ret && s.frames.length === depth + 1) {
          const top = this.items.get(frameKey(step.frames, depth - 1));
          const p = (top ? top.target.clone() : new Vector3()).add(new Vector3(1, LEVEL, 0));
          sources.push({ key: '~ret', kind: 'ret', name: '', value: s.ret });
          srcPos.set('~ret', p);
          break;
        }
      }
      const rb = this.items.get('ret');
      if (rb && !sources.some((s) => s.key === 'ret') && fromStep?.event === 'return' && fromStep.ret) {
        sources.push({ key: 'ret', kind: 'ret', name: '', value: fromStep.ret });
        srcPos.set('ret', rb.target.clone());
      }
    }

    // 이번에 안 그린 것은 치운다. 앞으로 가는 중에 힙 객체가 사라졌다면 아무도 가리키지 않게 된 것 → GC 대상으로 보여 준다
    const forward = animate && from !== null && ctx.index > from;
    const garbage = new Map<string, Vector3>();
    for (const it of [...this.items.values()]) {
      if (it.gen === gen || it.dying) continue;
      const m = /^H([^/#~]+)/.exec(it.key);
      const gone = !!m && forward && step.frames.length > 0 && !(m[1]! in step.heap) && !this.inlinedPrev.has(m[1]!);
      if (gone && it instanceof Slab && !it.key.includes('/')) garbage.set(m![1]!, it.target.clone());
      this.retire(it, animate, gone);
    }
    for (const [id, pos] of garbage) {
      const key = `gc:${id}:${gen}`;
      const lb = this.label(gen, key, pos.add(new Vector3(0, 1.5, 0)), new Vector3(0, -0.4, 0));
      const msg = ctx.lang === 'c' ? `#${id} free로 해제되었거나 가리키는 포인터가 없음` : `#${id} 참조 없음 → GC 대상`;
      lb.set([{ text: msg, color: '#ffffff', size: 38, weight: 700 }], 0.42, 0.5, 0, '#b42318');
      lb.ttl = 1.8;
    }

    this.spotStep = step;
    this.applyChanges(changes, { flowOk, animate, sources, srcPos, owners, step, fromStep, ctx });
    this.syncArrows(gen, animate);
    this.banner(step);
    if (!this.userCam) this.fit(!animate);
    this.shown = ctx.index;
    this.wake();
  }

  private spotStep: Step | null = null;

  /** 해설에서 누른 용어의 자리(프레임·변수·힙 객체)를 잠깐 빛낸다 */
  spot(s: Spot) {
    const step = this.spotStep;
    if (!step) return;
    const top = step.frames.length - 1;
    const keys: string[] = [];
    if (s.kind === 'stack') step.frames.forEach((_f, i) => keys.push(frameKey(step.frames, i)));
    else if (s.kind === 'frame') keys.push(frameKey(step.frames, top));
    else if (s.kind === 'var') keys.push(`${frameKey(step.frames, top)}/${s.name}`);
    else if (s.kind === 'heap') for (const id of Object.keys(step.heap)) keys.push(`H${id}`);
    else if (s.kind === 'obj' && s.id) keys.push(`H${s.id}`);
    const mats = keys.map((k) => (this.items.get(k) as { mesh?: Mesh<RoundedBoxGeometry, MeshStandardMaterial> } | undefined)?.mesh?.material).filter((m): m is MeshStandardMaterial => !!m);
    if (!mats.length) return;
    const t0 = performance.now(), dur = 1800;
    const tick = () => {
      const t = (performance.now() - t0) / dur;
      for (const m of mats) { m.emissive.setHex(0xfacc15); m.emissiveIntensity = t >= 1 ? 0 : Math.abs(Math.sin(t * Math.PI * 3)) * 0.6; }
      this.wake();
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.offTheme();
    this.controls.dispose();
    for (const it of this.items.values()) this.drop(it);
    for (const a of this.arrows.values()) a.dispose();
    for (const f of this.flights) this.endFlight(f);
    this.shapes.dispose();
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.grid.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.host.remove();
  }

  // ── 배치: 호출 스택 ──────────────────────────────────

  private layoutStack(L: Layout, step: Step, fromStep: Step | undefined) {
    const p = this.pal;
    const frames = step.frames;
    const n = frames.length;
    const folded = Math.max(0, n - FULL_FRAMES);
    let y = 0;
    let widest = 3.4;
    frames.forEach((f, i) => {
      const fk = frameKey(frames, i);
      const isTop = i === n - 1;
      const existed = this.items.has(fk);
      const birthLift = existed ? null : new Vector3(0, 3.2, 0);   // 새 프레임은 위에서 떨어진다

      if (i < folded) {
        const w = 3.0;
        const slab = this.slab(L.gen, fk, new Vector3(w / 2, y + 0.07, 0), birthLift);
        slab.shape(w, 0.14, 1.3, p.slabMini);
        slab.glow(false, 0);
        slab.info = `${fnLabel(f.fn)} · ${f.line}줄 (접힘: 위쪽 ${FULL_FRAMES}개만 펼쳐 보입니다)`;
        this.label(L.gen, `${fk}#h`, new Vector3(-0.25, y + 0.1, 0.3), birthLift)
          .set([{ text: `${fnLabel(f.fn)}`, color: p.muted, size: 34, mono: true }], 0.3, 1, 0.5);
        y += MINI;
        return;
      }

      // 변수마다 차지하는 폭: 스칼라·참조는 상자 하나, C의 스택 배열·구조체는 판 위에 펼친 크기
      const parts = f.locals.map((v) => {
        const o = inlineOf(v.value, step.heap);
        if (!o) return { v, o: null, w: VAR_PITCH, rows: 1 };
        const [w, rows] = inlineSize(o, step.heap);
        return { v, o, w: w + 0.45, rows };
      });
      const rows = Math.max(1, ...parts.map((x) => x.rows));
      const depth = Math.max(2.1, rows * ROW_D + 0.6);
      const level = i - folded;
      const zc = -level * 0.35;
      const w = Math.max(3.4, parts.reduce((a, x) => a + x.w, 0) + 0.8);
      widest = Math.max(widest, w);
      const slab = this.slab(L.gen, fk, new Vector3(w / 2, y + SLAB_H / 2, zc), birthLift);
      const exc = isTop && step.event === 'exception';
      slab.shape(w, SLAB_H, depth, exc ? p.slabExc : isTop ? p.slabTop : p.slab);
      slab.glow(false, 0);
      slab.info = `${f.cls ? `${shortType(f.cls)}.` : ''}${fnLabel(f.fn)} · ${f.line}줄 · 지역 변수 ${f.locals.length}개`;
      this.label(L.gen, `${fk}#h`, new Vector3(-0.3, y + 0.55, zc + 0.6), birthLift).set([
        { text: `${fnLabel(f.fn)}`, color: isTop ? p.accent : p.text, size: 46, weight: 700, mono: true },
        ...(f.line ? [{ text: `  ${f.line}줄`, color: p.muted, size: 34, weight: 500 }] : []),
      ], 0.46, 1, 0.5);

      const before = fromStep ? findFrame(fromStep.frames, frames, i) : undefined;
      const cy = y + SLAB_H + C / 2 + 0.02;
      const z0 = zc - depth / 2 + 0.85;    // 첫 줄 위치 (스칼라 상자도 이 줄)
      let x = 0.45;
      for (const { v, o, w: pw } of parts) {
        if (o && v.value.t === 'ref') {
          this.placeInline(L, v, v.value.id, o, x, cy, z0, birthLift, !existed, f.locals);
          x += pw;
          continue;
        }
        const pos = new Vector3(x + C / 2 + 0.1, cy, rows > 1 ? z0 : zc + 0.15);
        const b = this.vbox(L, `${fk}/${v.name}`, v.value, pos, birthLift, {
          dest: { kind: 'var', name: v.name, frame: fk, isNew: !before?.locals.some((xx) => xx.name === v.name) },
          parentNew: !existed,
          frameIndex: i,
          paramIndex: v.name === 'this' ? -1 : f.locals.filter((xx) => xx.name !== 'this').indexOf(v),
        });
        b.src = { kind: 'var', name: v.name, frame: fk };
        b.info = `${v.type} ${v.name} = ${say(v.value, step.heap)}`;
        b.name([
          { text: v.name, color: p.text, size: 44, weight: 700, mono: true },
          { text: ` ${shortType(v.type)}`, color: p.muted, size: 32, weight: 500, mono: true },
        ]);
        if (v.value.t === 'ref') this.refs.push({ key: `${fk}/${v.name}`, from: b.key, to: refTarget(v.value) });
        this.anchors.set(`@var:${i}:${v.name}`, { pos: pos.clone().add(new Vector3(0, C / 2, 0)), item: b.key });
        x += pw;
      }
      y += LEVEL + (rows > 1 ? 0.2 : 0);
    });
    this.stackW = Math.max(this.stackW, widest);
  }

  /**
   * C: 함수 안의 배열·구조체를 그 함수 판 위에 칸으로 펼친다 (스택 메모리 안에 있다는 것이 보이게).
   * 칸의 키는 힙 객체와 같은 모양(H{id}/{i})이라 포인터 화살표·값 흐름·인덱스 깃발이 그대로 동작한다.
   */
  private placeInline(L: Layout, v: Var, id: string, o: HeapObj, x0: number, cy: number, z0: number,
    birth: Vector3 | null, parentNew: boolean, locals: Var[]) {
    const p = this.pal;
    const heap = L.step.heap;
    this.inlined.add(id);
    const label = (key: string, pos: Vector3, text: string, addr?: string) =>
      this.label(L.gen, key, pos, birth).set([
        { text, color: p.text, size: 42, weight: 700, mono: true },
        ...(addr ? [{ text: `  ${shortAddr(addr)}`, color: p.muted, size: 30, weight: 500, mono: true }] : []),
      ], 0.38, 0, 0);
    const cell = (oid: string, i: number, val: Value, pos: Vector3, info: string) => {
      const b = this.vbox(L, `H${oid}/${i}`, val, pos, birth, {
        dest: { kind: 'cell', name: '', holder: oid, idx: i, isNew: false }, parentNew, frameIndex: -1, paramIndex: -1,
      });
      b.src = { kind: 'cell', name: '', holder: oid, idx: i };
      b.info = info;
      b.name(null);
      this.anchors.set(`${oid}[${i}]`, { pos: pos.clone().add(new Vector3(0, C / 2, 0)), item: b.key });
      if (val.t === 'ref') this.refs.push({ key: b.key, from: b.key, to: refTarget(val) });
      return b;
    };
    const field = (oid: string, fv: Var, pos: Vector3, owner: string, small: boolean) => {
      const b = this.vbox(L, `H${oid}/.${fv.name}`, fv.value, pos, birth, {
        dest: { kind: 'field', name: fv.name, holder: oid, isNew: false }, parentNew, frameIndex: -1, paramIndex: -1,
      });
      b.src = { kind: 'field', name: fv.name, holder: oid };
      b.info = `${fv.type} ${owner}.${fv.name} = ${say(fv.value, heap)}`;
      b.name([{ text: fv.name, color: p.text, size: small ? 36 : 42, weight: 700, mono: true }]);
      if (fv.value.t === 'ref') this.refs.push({ key: b.key, from: b.key, to: refTarget(fv.value) });
      return b;
    };
    const idxLabel = (key: string, pos: Vector3, text: string) =>
      this.label(L.gen, key, pos.clone().add(new Vector3(0, -C / 2 + 0.02, C / 2 + 0.3)), birth)
        .set([{ text, color: p.muted, size: 34, mono: true }], 0.28, 0.5, 0.5);

    label(`H${id}#n`, new Vector3(x0, cy + C / 2 + 0.25, z0 - 0.15), `${v.name} ${shortType(o.type)}`, o.addr);
    const firstKey = o.kind === 'object' ? `H${id}/.${o.fields[0]?.name ?? ''}` : `H${id}/0`;

    if (o.kind === 'object') {
      o.fields.forEach((fv, k) => field(id, fv, new Vector3(x0 + C / 2 + k * VAR_PITCH, cy, z0 + 0.15), v.name, false));
    } else if (o.kind === 'array') {
      const n = Math.min(o.items.length, MAX_CELLS);
      const subs = o.items.slice(0, n).map((it) => inlineOf(it, heap));
      if (n && subs.every((x) => x?.kind === 'array')) {
        // 2차원 배열: 줄마다 한 행
        subs.forEach((row, r) => {
          const rid = (o.items[r] as { id: string }).id;
          this.inlined.add(rid);
          const rr = row as HeapObj & { items: Value[] };
          this.anchors.set(rid, { pos: new Vector3(x0 + PITCH / 2, cy + C / 2, z0 + r * ROW_D), item: `H${rid}/0` });
          rr.items.slice(0, ROW_CELLS).forEach((val, c) => {
            const pos = new Vector3(x0 + c * PITCH + PITCH / 2, cy, z0 + r * ROW_D);
            cell(rid, c, val, pos, `${v.name}[${r}][${c}] = ${say(val, heap)}`);
            idxLabel(`H${rid}/${c}#i`, pos, `[${r}][${c}]`);
          });
        });
      } else if (n && subs.every((x) => x?.kind === 'object')) {
        // 구조체 배열: 칸마다 필드 묶음
        const nf = Math.max(...subs.map((x) => (x as HeapObj & { fields: Var[] }).fields.length));
        const gw = nf * 0.98 + 0.35;
        subs.forEach((el2, k) => {
          const eid = (o.items[k] as { id: string }).id;
          this.inlined.add(eid);
          const gx = x0 + (k % 4) * gw;
          const gz = z0 + Math.floor(k / 4) * ROW_D;
          (el2 as HeapObj & { fields: Var[] }).fields.forEach((fv, j) => {
            field(eid, fv, new Vector3(gx + C / 2 + j * 0.98, cy, gz), `${v.name}[${k}]`, true);
          });
          this.anchors.set(eid, { pos: new Vector3(gx + C / 2, cy + C / 2, gz), item: `H${eid}/.${(el2 as HeapObj & { fields: Var[] }).fields[0]?.name ?? ''}` });
          this.anchors.set(`${id}[${k}]`, { pos: new Vector3(gx + C / 2, cy + C / 2, gz), item: `H${eid}/.${(el2 as HeapObj & { fields: Var[] }).fields[0]?.name ?? ''}` });
          this.label(L.gen, `H${eid}#k`, new Vector3(gx + 0.1, SLAB_H + 0.1 + (cy - C / 2 - SLAB_H), gz + C / 2 + 0.3), birth)
            .set([{ text: `[${k}]`, color: p.muted, size: 34, mono: true }], 0.28, 0, 0.5);
        });
      } else {
        const posOf = (i: number) => new Vector3(x0 + (i % ROW_CELLS) * PITCH + PITCH / 2, cy, z0 + Math.floor(i / ROW_CELLS) * ROW_D);
        for (let i = 0; i < n; i++) {
          const val = o.items[i]!;
          const pos = posOf(i);
          cell(id, i, val, pos, `${v.name}[${i}] = ${say(val, heap)}${o.addr && o.elem ? `  (주소 ${addrPlus(o.addr, i * o.elem)})` : ''}`);
          idxLabel(`H${id}/${i}#i`, pos, String(i));
        }
        if (o.len > n) {
          this.label(L.gen, `H${id}#more`, posOf(n), birth).set([{ text: `… +${o.len - n}`, color: p.muted, size: 38, mono: true }], 0.34);
        }
        this.markers(L, id, o.items.length, n, locals, posOf);
      }
    }
    this.anchors.set(id, { pos: new Vector3(x0 + PITCH / 2, cy + C / 2, z0), item: firstKey });
  }


  // ── 배치: 반환값 ────────────────────────────────────

  private layoutReturn(L: Layout, step: Step) {
    if (step.event !== 'return' || !step.ret) return;
    const fk = frameKey(step.frames, step.frames.length - 1);
    const slab = this.items.get(fk);
    if (!slab) return;
    const f = step.frames.at(-1)!;
    const w = Math.max(3.4, f.locals.length * VAR_PITCH + 0.7);
    const pos = slab.target.clone().add(new Vector3(w / 2 + 1.1, 1.0 + C / 2, 0.15));
    const b = this.vbox(L, 'ret', step.ret, pos, new Vector3(0, -0.8, 0), {
      dest: { kind: 'var', name: '', isNew: true }, parentNew: true, frameIndex: -1, paramIndex: -1,
    });
    b.src = { kind: 'ret', name: '' };
    b.info = `${fnLabel(f.fn)}의 반환값 = ${say(step.ret, step.heap)}`;
    b.setFlashColor(this.pal.ret);
    b.name([{ text: '반환값', color: this.pal.gold, size: 40, weight: 700 }]);
    b.mesh.material.emissive.setHex(this.pal.ret);
    b.mesh.material.emissiveIntensity = 0.35;
    if (step.ret.t === 'ref') this.refs.push({ key: 'ret', from: 'ret', to: refTarget(step.ret) });
  }

  // ── 배치: 힙 ────────────────────────────────────────

  private layoutHeap(L: Layout, step: Step, owners: Map<string, string[]>, fromStep: Step | undefined) {
    // 참조를 따라간 순서로 놓는다: 연결 리스트는 head → next → next 가 한 줄로 이어진다
    const ids = reachOrder(step, (a, b) => this.heapSeq.get(a)! - this.heapSeq.get(b)!).filter((id) => !this.inlined.has(id));
    const { x0, z0, rowW } = this.heapOrigin();
    let x = x0;
    let z = z0;
    let rowD = 0;
    this.heapMaxX = x0 + 6;
    const inner = step.frames.at(-1)?.locals ?? [];
    for (const id of ids) {
      const o = step.heap[id]!;
      const hist = this.histNow.get(id) ?? [];
      const [w, d] = measure(o, hist.length, Math.min(MAX_CELLS, 'items' in o ? o.items.length : 0));
      if (x > x0 && x + w > x0 + rowW) {
        x = x0;
        z += rowD + 1.9;
        rowD = 0;
      }
      this.placeObject(L, id, o, x, z, w, d, owners.get(id) ?? [], inner, fromStep?.heap[id], hist);
      this.heapMaxX = Math.max(this.heapMaxX, x + w);
      x += w + 1.5;
      rowD = Math.max(rowD, d);
    }
    this.heapFront = ids.length ? z + rowD + 1.3 : null;
  }

  private placeObject(L: Layout, id: string, o: HeapObj, x0: number, z0: number, w: number, d: number,
    names: string[], inner: Var[], before: HeapObj | undefined, hist: Snapshot[]) {
    const p = this.pal;
    const hk = `H${id}`;
    const existed = this.items.has(hk);
    const birth = existed ? null : new Vector3(0, -0.6, 0);
    const heap = L.step.heap;
    const tower = o.kind === 'stack';

    const slab = this.slab(L.gen, hk, new Vector3(x0 + w / 2, SLAB_H / 2, z0 + d / 2), birth);
    slab.shape(w, SLAB_H, d, p.heapSlab);
    slab.heapId = id;
    slab.info = `${o.type} · ${KIND[o.kind]}${'len' in o ? ` · 크기 ${o.len}` : ''}${names.length ? ` · ${names.join(', ')}이(가) 가리킴` : ''}`;
    // 화살표 도착점: 넓은 배치는 왼쪽 가장자리, 좁은 배치(스택이 뒤)는 뒤쪽 가장자리
    this.anchors.set(id, { item: hk, pos: this.wide()
      ? new Vector3(x0 + 0.12, SLAB_H + 0.05, z0 + Math.min(d / 2, 0.9))
      : new Vector3(x0 + Math.min(w / 2, 0.75), SLAB_H + 0.05, z0 + 0.1) });

    // 앞쪽 바닥의 이름판
    this.floorText(L.gen, `${hk}#n`, new Vector3(x0, 0, z0 + d + 0.42), birth).set([
      { text: `#${id} `, color: p.muted, size: 40, weight: 700, mono: true },
      { text: shortType(o.type), color: p.text, size: 46, weight: 700, mono: true },
      { text: `  ${KIND[o.kind]}${'len' in o ? ` ${o.len}` : ''}`, color: p.muted, size: 36, weight: 500 },
      ...(names.length ? [{ text: `  ← ${names.slice(0, 3).join(', ')}`, color: p.accent, size: 38, weight: 700, mono: true }] : []),
    ], 0.48, 0);

    const cellOpts = (i: number, isNew: boolean) => ({
      dest: { kind: 'cell' as const, name: '', holder: id, idx: i, isNew }, parentNew: !existed, frameIndex: -1, paramIndex: -1,
    });

    switch (o.kind) {
      case 'array': case 'list': case 'deque': case 'set': case 'stack': {
        const n = Math.min(o.items.length, MAX_CELLS);
        const old = before && 'items' in before ? before.items : undefined;
        const posOf = (i: number) => tower
          ? new Vector3(x0 + 0.75 + Math.floor(i / 10) * 1.2, SLAB_H + C / 2 + 0.02 + (i % 10) * (C + 0.05), z0 + 0.75)
          : new Vector3(x0 + 0.3 + (i % ROW_CELLS) * PITCH + PITCH / 2, SLAB_H + C / 2 + 0.02, z0 + 0.2 + Math.floor(i / ROW_CELLS) * ROW_D + 0.62);
        for (let i = 0; i < n; i++) {
          const v = o.items[i]!;
          const pos = posOf(i);
          // 스택에 새로 쌓이는 칸은 위에서 떨어진다
          const b = this.vbox(L, `${hk}/${i}`, v, pos, tower ? new Vector3(0, 2.4, 0) : new Vector3(0, 1.6, 0),
            cellOpts(i, !old || i >= old.length));
          b.src = { kind: 'cell', name: '', holder: id, idx: i };
          b.showTop(!tower && n > ROW_CELLS);
          this.anchors.set(`${id}[${i}]`, { pos: pos.clone().add(new Vector3(0, C / 2, 0)), item: b.key });
          b.info = `${names[0] ?? shortType(o.type)}[${i}] = ${say(v, heap)}`;
          b.name(null);
          if (v.t === 'ref') this.refs.push({ key: `${hk}/${i}`, from: b.key, to: refTarget(v) });
          if (!tower && o.kind !== 'set') {
            this.label(L.gen, `${hk}/${i}#i`, pos.clone().add(new Vector3(0, -C / 2 + 0.02, C / 2 + 0.3)), birth)
              .set([{ text: String(i), color: p.muted, size: 34, mono: true }], 0.28, 0.5, 0.5);
          }
        }
        if (tower && n > 0) {
          this.label(L.gen, `${hk}#top`, posOf(n - 1).add(new Vector3(C / 2 + 0.15, 0, 0)), birth)
            .set([{ text: '← top', color: p.accent, size: 40, weight: 700, mono: true }], 0.36, 0, 0.5);
        }
        if (o.kind === 'deque' && n > 0) {
          this.label(L.gen, `${hk}#front`, posOf(0).add(new Vector3(0, C / 2 + 0.2, 0)), birth)
            .set([{ text: '앞', color: p.accent, size: 38, weight: 700 }], 0.32, 0.5, 0);
          this.label(L.gen, `${hk}#rear`, posOf(n - 1).add(new Vector3(0, C / 2 + 0.2, 0)), birth)
            .set([{ text: '뒤', color: p.accent, size: 38, weight: 700 }], 0.32, 0.5, 0);
        }
        if (o.len > n) {
          this.label(L.gen, `${hk}#more`, tower ? posOf(n).setX(x0 + 0.75) : posOf(n), birth)
            .set([{ text: `… +${o.len - n}`, color: p.muted, size: 38, mono: true }], 0.34);
        }
        if (o.len === 0) {
          this.label(L.gen, `${hk}#empty`, new Vector3(x0 + w / 2, SLAB_H + 0.3, z0 + d / 2), birth)
            .set([{ text: '(비어 있음)', color: p.muted, size: 36 }], 0.32);
        }
        if (!tower && (o.kind === 'array' || o.kind === 'list')) this.markers(L, id, o.items.length, n, inner, posOf);
        if (hist.length) this.historyRows(L, id, hk, hist, x0, z0 + 0.2 + Math.max(1, Math.ceil(n / ROW_CELLS)) * ROW_D + 0.3, posOf, names);
        break;
      }
      case 'map': {
        const n = Math.min(o.entries.length, MAX_ENTRIES);
        const old = before?.kind === 'map' ? before.entries : undefined;
        for (let r = 0; r < n; r++) {
          const [k, v] = o.entries[r]!;
          const kt = showValue(k, heap);
          const zr = z0 + 0.2 + r * 1.25 + 0.6;
          const isNew = !old?.some(([ok]) => sameValue(ok, k));
          const kb = this.vbox(L, `${hk}/k:${kt}`, k, new Vector3(x0 + 0.3 + C / 2, SLAB_H + C / 2 + 0.02, zr), new Vector3(0, 1.6, 0), {
            dest: { kind: 'key', name: '', holder: id, isNew }, parentNew: !existed, frameIndex: -1, paramIndex: -1,
          });
          kb.info = `키 ${kt}`;
          kb.showTop(n > 1);
          kb.name(null);
          const vb = this.vbox(L, `${hk}/v:${kt}`, v, new Vector3(x0 + 0.3 + C / 2 + 2.1, SLAB_H + C / 2 + 0.02, zr), new Vector3(0, 1.6, 0), {
            dest: { kind: 'val', name: '', holder: id, isNew }, parentNew: !existed, frameIndex: -1, paramIndex: -1,
          });
          vb.info = `${kt} → ${say(v, heap)}`;
          vb.showTop(n > 1);
          vb.name(null);
          this.label(L.gen, `${hk}/a:${kt}`, new Vector3(x0 + 0.3 + C + 0.6, SLAB_H + C / 2, zr), birth)
            .set([{ text: '→', color: p.muted, size: 48, weight: 700 }], 0.4);
          if (k.t === 'ref') this.refs.push({ key: kb.key, from: kb.key, to: refTarget(k) });
          if (v.t === 'ref') this.refs.push({ key: vb.key, from: vb.key, to: refTarget(v) });
        }
        if (o.len > n) {
          this.label(L.gen, `${hk}#more`, new Vector3(x0 + w / 2, SLAB_H + 0.3, z0 + d - 0.3), birth)
            .set([{ text: `… +${o.len - n}`, color: p.muted, size: 38, mono: true }], 0.34);
        }
        if (o.len === 0) {
          this.label(L.gen, `${hk}#empty`, new Vector3(x0 + w / 2, SLAB_H + 0.3, z0 + d / 2), birth)
            .set([{ text: '(비어 있음)', color: p.muted, size: 36 }], 0.32);
        }
        break;
      }
      case 'object': {
        const old = before?.kind === 'object' ? before.fields : undefined;
        o.fields.forEach((f, j) => {
          const b = this.vbox(L, `${hk}/.${f.name}`, f.value, new Vector3(x0 + 0.3 + C / 2 + j * VAR_PITCH + 0.1, SLAB_H + C / 2 + 0.02, z0 + d / 2), new Vector3(0, 1.6, 0), {
            dest: { kind: 'field', name: f.name, holder: id, isNew: !!old && !old.some((x) => x.name === f.name) },
            parentNew: !existed, frameIndex: -1, paramIndex: -1,
          });
          b.src = { kind: 'field', name: f.name, holder: id };
          b.info = `${f.type} ${shortType(o.type)}.${f.name} = ${say(f.value, heap)}`;
          b.name([
            { text: f.name, color: p.text, size: 42, weight: 700, mono: true },
            { text: ` ${shortType(f.type)}`, color: p.muted, size: 30, weight: 500, mono: true },
          ]);
          if (f.value.t === 'ref') this.refs.push({ key: b.key, from: b.key, to: refTarget(f.value) });
        });
        break;
      }
      case 'opaque': {
        const b = this.vbox(L, `${hk}/opaque`, { t: 'unknown', text: '…' }, new Vector3(x0 + w / 2, SLAB_H + C / 2 + 0.02, z0 + d / 2), null, {
          dest: { kind: 'field', name: '', isNew: false }, parentNew: true, frameIndex: -1, paramIndex: -1,
        });
        b.info = `${o.type} — 라이브러리 내부 구조는 펼치지 않습니다`;
        b.name(null);
        break;
      }
    }
  }

  /**
   * 회차별 기록: 바깥 반복문이 한 바퀴 돌 때마다의 배열 모습을 배열 아래에 납작한 칸 줄로 쌓는다.
   * 새 줄은 지금 배열 칸에서 내려와 자리를 잡는다 ("이번 바퀴의 결과가 쌓였다").
   * 바로 앞 줄과 값이 달라진 칸은 노랗게 표시한다.
   */
  private historyRows(L: Layout, id: string, hk: string, hist: Snapshot[], x0: number, zTop: number,
    posOf: (i: number) => Vector3, names: string[]) {
    const p = this.pal;
    const shown = hist.slice(-HIST_ROWS);
    const skipped = hist.length - shown.length;
    shown.forEach((h, r) => {
      const prev = hist[skipped + r - 1];
      const z = zTop + r * HIST_PITCH + HIST_PITCH / 2;
      const last = r === shown.length - 1;
      this.label(L.gen, `${hk}#h${h.step}`, new Vector3(x0 + 0.25, SLAB_H + 0.12, z), null).set([
        { text: h.label, color: last ? p.accent : p.muted, size: 36, weight: last ? 700 : 600 },
      ], 0.32, 0, 0.5);
      const n = Math.min(h.items.length, MAX_CELLS);
      for (let i = 0; i < n; i++) {
        const v = h.items[i]!;
        const pos = new Vector3(x0 + HIST_LABEL_W + i * HIST_CELL + HIST_CELL / 2, SLAB_H + 0.09, z);
        const key = `${hk}/h${h.step}/${i}`;
        const fresh = !this.items.has(key);
        // 새 기록 줄은 지금 배열 칸 자리에서 출발해 내려온다
        const b = this.take(key, () => new VBox(key, this.shapes), pos, fresh ? posOf(i).sub(pos) : null, L.gen);
        b.look(v, this.pal);
        b.flat();
        b.targetScale = HIST_CELL / C * 0.85;
        b.name(null);
        b.info = `${h.label}: ${names[0] ?? '배열'}[${i}] = ${say(v, L.step.heap)}`;
        const changed = !!prev && !sameValue(prev.items[i] ?? { t: 'null' }, v);
        b.mesh.material.emissive.setHex(p.flash);
        b.mesh.material.emissiveIntensity = changed ? 0.45 : 0;
      }
    });
    if (skipped > 0) {
      this.label(L.gen, `${hk}#hmore`, new Vector3(x0 + 0.25, SLAB_H + 0.12, zTop - 0.12), null)
        .set([{ text: `… 앞의 ${skipped}줄 생략`, color: p.muted, size: 30 }], 0.22, 0, 0.5);
    }
  }

  /** 정수 인덱스 변수(i, j, …)를 배열 칸 위 깃발로 */
  private markers(L: Layout, id: string, len: number, shown: number, inner: Var[], posOf: (i: number) => Vector3) {
    const at = new Map<number, number>();
    for (const v of inner) {
      if (v.value.t !== 'num' || v.value.float || v.value.v === null || !Number.isInteger(v.value.v)) continue;
      if (!INDEX_NAME.test(v.name)) continue;
      const i = v.value.v;
      if (len === 0 || i < 0 || i > len || i > shown) continue;   // 끝 바로 다음(i == 길이)까지는 흐리게 보여 준다
      const stackN = at.get(i) ?? 0;
      at.set(i, stackN + 1);
      const pos = posOf(i).add(new Vector3(0, C / 2 + 0.42 + stackN * 0.9, 0));
      const key = `M${id}:${v.name}`;
      let m = this.items.get(key) as Marker | undefined;
      if (!m || m.dying) {
        if (m) this.rename(m);
        m = new Marker(key, this.shapes, this.pal.marker);
        this.add(m, pos.clone().add(new Vector3(0, 1.2, 0)));
      }
      m.gen = L.gen;
      m.target.copy(pos);
      m.targetScale = 1;
      m.set([{ text: `${v.name}=${i}`, color: this.pal.accent, size: 40, weight: 700, mono: true }], i >= len);
    }
  }

  // ── 요소 만들기·다시 쓰기 ────────────────────────────

  private add(it: Item, start: Vector3) {
    it.group.position.copy(start);
    this.items.set(it.key, it);
    this.scene.add(it.group);
  }

  /** 사라지는 중인 요소는 키를 비워 둔다 (같은 키로 새 요소가 바로 들어올 수 있게) */
  private rename(it: Item) {
    this.items.delete(it.key);
    it.key = `${it.key}~${this.gen}~${Math.random().toString(36).slice(2, 6)}`;
    this.items.set(it.key, it);
  }

  private take<T extends Item>(key: string, make: () => T, pos: Vector3, birth: Vector3 | null, gen: number): T {
    let it = this.items.get(key) as T | undefined;
    if (it && it.dying) { this.rename(it); it = undefined; }
    if (!it) {
      it = make();
      this.add(it, birth ? pos.clone().add(birth) : pos);
      if (!birth) it.group.scale.setScalar(0.001);
    }
    it.gen = gen;
    it.target.copy(pos);
    it.targetScale = 1;
    return it;
  }

  private slab(gen: number, key: string, pos: Vector3, birth: Vector3 | null): Slab {
    return this.take(key, () => new Slab(key), pos, birth, gen);
  }

  private label(gen: number, key: string, pos: Vector3, birth: Vector3 | null): Label {
    return this.take(key, () => new Label(key), pos, birth, gen);
  }

  private floorText(gen: number, key: string, pos: Vector3, birth: Vector3 | null): FloorText {
    return this.take(key, () => new FloorText(key, this.shapes), pos, birth, gen);
  }

  private vbox(L: Layout, key: string, v: Value, pos: Vector3, birth: Vector3 | null, opts: Omit<Change, 'box' | 'value' | 'before'>): VBox {
    const had = this.items.get(key);
    const fresh = !had || had.dying;
    const b = this.take(key, () => new VBox(key, this.shapes), pos, birth, L.gen);
    b.setFlashColor(this.pal.flash);
    if (fresh) {
      b.look(v, this.pal);
      L.changes.push({ box: b, value: v, before: undefined, ...opts });
    } else if (!sameValue(b.value, v)) {
      L.changes.push({ box: b, value: v, before: b.value, ...opts });
    } else b.look(v, this.pal);
    return b;
  }

  /** 이번 단계에 없는 요소 치우기: 프레임은 떠오르며, 나머지는 줄어들며 */
  private retire(it: Item, animate: boolean, garbage = false) {
    it.dying = true;
    it.targetScale = 0;
    if (/^F\d/.test(it.key)) it.target.y += 2.6;
    if (garbage) {
      // 회색으로 바뀐 채 잠깐 머문 뒤 바닥으로 가라앉는다
      if (it instanceof Slab) it.mesh.material.color.setHex(this.pal.gc);
      if (it instanceof VBox) it.fade(this.pal.gc);
      it.delay = 1.0;
      it.target.y -= 1.0;
    }
    if (!animate) it.group.scale.setScalar(0.001);
    this.rename(it);
  }

  private drop(it: Item) {
    this.scene.remove(it.group);
    it.dispose();
    if (this.hovered === it) this.hover(null);
  }

  // ── 변화 보여주기 ────────────────────────────────────

  private applyChanges(changes: Change[], o: {
    flowOk: boolean; animate: boolean; sources: Source[]; srcPos: Map<string, Vector3>;
    owners: Map<string, string[]>; step: Step; fromStep: Step | undefined; ctx: RenderCtx;
  }) {
    const kinds = new Map(Object.entries(o.step.heap).map(([id, h]) => [id, h.kind]));
    const oldLens = new Map<string, number>();
    for (const [id, h] of Object.entries(o.fromStep?.heap ?? {})) {
      oldLens.set(id, 'items' in h ? h.items.length : h.kind === 'map' ? h.entries.length : 0);
    }
    const lineOf = (fi: number) => {
      const f = o.fromStep;
      if (!f) return '';
      const ln = fi >= 0 && fi < f.frames.length ? f.frames[fi]!.line : f.line;
      return o.ctx.source[ln - 1] ?? '';
    };
    const varsOf = (fi: number) => {
      const f = o.fromStep?.frames[fi >= 0 ? fi : (o.fromStep?.frames.length ?? 1) - 1];
      return new Map((f?.locals ?? []).map((v) => [v.name, v.value]));
    };

    for (const ch of changes) {
      const b = ch.box;
      const isNew = ch.before === undefined;
      if (!o.animate) { b.look(ch.value, this.pal); continue; }

      let src: Source | 'drop' | null = null;
      if (o.flowOk) {
        const fi = ch.dest.kind === 'var' ? ch.frameIndex : (o.fromStep?.frames.length ?? 1) - 1;
        if (ch.parentNew && ch.dest.kind === 'var' && ch.paramIndex >= 0 && ch.frameIndex > 0) {
          // 새로 호출된 함수의 매개변수 ← 호출한 줄의 인자
          const f = o.step.frames[ch.frameIndex]!;
          const callerKey = frameKey(o.step.frames, ch.frameIndex - 1);
          const ctx: Ctx = { line: lineOf(ch.frameIndex - 1), owners: o.owners, kinds, oldLens, vars: varsOf(ch.frameIndex - 1), sources: o.sources };
          src = argSource(ctx.line, f.fn, f.cls, ch.paramIndex, ch.value, ctx, { ...ch.dest, frame: callerKey });
        } else if (!ch.parentNew) {
          const ctx: Ctx = { line: lineOf(fi), owners: o.owners, kinds, oldLens, vars: varsOf(fi), sources: o.sources };
          src = findSource(ch.dest, ch.value, ctx);
        }
      }

      if (src) {
        const from = src === 'drop' ? b.target.clone().add(new Vector3(0, 3.4, 0)) : o.srcPos.get(src.key);
        if (from) {
          if (isNew) b.targetScale = 0.001;
          this.fly(from, b, ch.value, () => {
            b.look(ch.value, this.pal);
            b.targetScale = 1;
            if (isNew) b.group.scale.setScalar(0.6);
            b.ping();
          });
          continue;
        }
      }
      b.look(ch.value, this.pal);
      if (!isNew) { b.tumble(); b.ping(); }
    }
  }

  private fly(from: Vector3, dest: VBox, v: Value, land: () => void) {
    const [bg, fg] = boxColors(this.pal, v);
    const mat = new MeshStandardMaterial({ color: bg, roughness: 0.5, emissive: this.pal.flash, emissiveIntensity: 0.45 });
    const tex = face(faceText(v), fg);
    const faceMat = [new MeshBasicMaterial({ map: tex.tex, transparent: true, depthWrite: false })];
    const g = new Group();
    const m = new Mesh(this.shapes.box, mat);
    m.castShadow = true;
    const fr = new Mesh(this.shapes.face, faceMat[0]);
    fr.position.z = C / 2 + 0.004;
    g.add(m, fr);
    g.position.copy(from);
    g.scale.setScalar(0.92);
    this.scene.add(g);
    const dist = from.distanceTo(dest.target);
    this.flights.push({
      obj: g, spin: true, from: from.clone(), to: () => dest.target,
      dispose: () => { mat.dispose(); for (const m of faceMat) m.dispose(); release(tex); },
      t: 0, dur: Math.min(0.75, Math.max(0.22, (this.tempo / 1000) * 0.6)) * (0.8 + Math.min(1, dist / 12) * 0.4),
      arc: 0.8 + dist * 0.18, land,
    });
  }

  private endFlight(f: Flight) {
    this.scene.remove(f.obj);
    f.dispose();
  }

  /** 출력 쪽지: 새로 찍은 글이 지금 함수에서 출력판으로 날아간다 */
  private flyText(text: string, from: Vector3, to: () => Vector3, land: () => void) {
    const tex = label([{ text, color: '#0b0f14', size: 40, weight: 700, mono: true }], '#7ee787');
    const sp = sprite(tex, 0.42);
    sp.position.copy(from);
    this.scene.add(sp);
    const dist = from.distanceTo(to());
    this.flights.push({
      obj: sp, spin: false, from: from.clone(), to,
      dispose: () => { sp.material.dispose(); release(tex); },
      t: 0, dur: Math.min(0.9, Math.max(0.3, (this.tempo / 1000) * 0.7)),
      arc: 1.0 + dist * 0.15, land,
    });
  }

  // ── 화살표 ──────────────────────────────────────────

  private syncArrows(gen: number, animate: boolean) {
    for (const r of this.refs) {
      if (!this.anchors.has(r.to)) continue;
      let a = this.arrows.get(r.key);
      const target = r.to;
      if (a && a.to !== target) {
        // 가리키는 객체가 바뀌면 화살표를 새로 그린다 (끝이 자라나며 옮겨 간다)
        a.grow = animate ? 0 : 1;
      }
      if (!a) {
        a = new Arrow(this.shapes, this.pal.arrow, this.pal.arrowHot);
        a.grow = animate ? 0 : 1;
        this.arrows.set(r.key, a);
        this.scene.add(a.group);
      }
      a.to = target;
      a.fromKey = r.from;
      a.gen = gen;
    }
    for (const [k, a] of this.arrows) {
      if (a.gen === gen) continue;
      this.scene.remove(a.group);
      a.dispose();
      this.arrows.delete(k);
    }
    this.refs = [];
    this.updateArrows(0);
  }

  private updateArrows(dt: number): boolean {
    let growing = false;
    for (const a of this.arrows.values()) {
      const fromItem = this.items.get(a.fromKey);
      const anc = this.anchors.get(a.to);
      const target = anc ? this.items.get(anc.item) : undefined;
      if (!fromItem || !anc || !target) { a.group.visible = false; continue; }
      const anchor = anc.pos;
      a.group.visible = true;
      if (a.grow < 1) { a.grow = Math.min(1, a.grow + dt * 2.6); growing = true; }
      const from = fromItem.group.position.clone().add(new Vector3(0, C / 2 * fromItem.group.scale.x, 0));
      const to = anchor.clone().add(target.group.position).sub(target.target);   // 객체가 움직이는 중이면 따라간다
      a.update(from, to);
    }
    return growing;
  }

  // ── 배너·구역 ───────────────────────────────────────

  private banner(step: Step) {
    const inner = step.frames.at(-1);
    const b = this.ui.banner;
    b.replaceChildren();
    if (step.event === 'call') b.append(el('div', 'banner call', `→ ${fnLabel(inner?.fn ?? '')} 호출됨`));
    if (step.event === 'return') {
      b.append(el('div', 'banner ret', step.ret
        ? `↩ ${fnLabel(inner?.fn ?? '')} 이 ${showValue(step.ret, step.heap)} 를 돌려줌`
        : `↩ ${fnLabel(inner?.fn ?? '')} 종료`));
    }
    if (step.event === 'exception') b.append(el('div', 'banner exc', `⚠ 예외: ${step.exception ?? ''}`));
  }

  /** 넓은 화면은 스택 오른쪽에 힙, 좁은 화면은 스택 앞에 힙 (탑은 위로, 힙은 앞으로 자라서 화면을 고르게 쓴다) */
  private wide(): boolean {
    return this.camera.aspect >= 1.6;
  }

  private heapOrigin(): { x0: number; z0: number; rowW: number } {
    return this.wide()
      ? { x0: this.stackW + 3.2, z0: -1.2, rowW: Math.max(9, Math.min(22, 8 * this.camera.aspect)) }
      : { x0: 0, z0: 5.2, rowW: Math.max(this.stackW, Math.min(16, 9.5 * this.camera.aspect)) };
  }

  /** 바닥 구역: 스택 영역과 힙 영역을 색으로 나누고 각각 무엇인지 적는다 */
  private zones(step?: Step) {
    const p = this.pal;
    const g = this.gen;
    const h = this.heapOrigin();
    const full = Math.min(step?.frames.length ?? 1, FULL_FRAMES);
    // 스택 영역
    const sx0 = -3.1;
    const sx1 = this.stackW + 0.6;
    const sz0 = -(Math.max(1, full) - 1) * 0.35 - 1.4;
    const sz1 = 3.0;
    this.take('zone:stack:area', () => new FloorRect('zone:stack:area', this.shapes),
      new Vector3((sx0 + sx1) / 2, 0, (sz0 + sz1) / 2), null, g).set(sx1 - sx0, sz1 - sz0, p.zoneStack);
    this.floorText(g, 'zone:stack', new Vector3(sx0 + 0.3, 0, 1.75), null)
      .set([{ text: '호출 스택', color: p.text, size: 52, weight: 700 }, { text: '  Stack', color: p.muted, size: 40, weight: 600 }], 0.56, 0);
    this.floorText(g, 'zone:stack:d', new Vector3(sx0 + 0.3, 0, 2.45), null)
      .set([{ text: this.lang === 'c' ? '함수를 부르면 판이 쌓이고 지역 변수·배열이 그 안에 생긴다. 끝나면 사라진다' : '함수를 부르면 판이 쌓이고, 끝나면 사라집니다', color: p.muted, size: 34, weight: 500 }], 0.34, 0);
    // 힙 영역
    const hz0 = this.wide() ? h.z0 - 2.6 : h.z0 - 0.7;
    const front = this.heapFront ?? h.z0 + 1.5;
    const hx1 = Math.max(this.heapMaxX, h.x0 + 6) + 0.6;
    const hz1 = front + 1.5;
    this.take('zone:heap:area', () => new FloorRect('zone:heap:area', this.shapes),
      new Vector3((h.x0 - 0.6 + hx1) / 2, 0, (hz0 + hz1) / 2), null, g).set(hx1 - h.x0 + 0.6, hz1 - hz0, p.zoneHeap);
    this.floorText(g, 'zone:heap', new Vector3(h.x0 - 0.3, 0, front), null).set([
      { text: '힙', color: p.text, size: 52, weight: 700 }, { text: '  Heap', color: p.muted, size: 40, weight: 600 },
      ...(this.heapFront === null ? [{ text: '  — 아직 객체 없음', color: p.muted, size: 40, weight: 500 }] : []),
    ], 0.56, 0);
    this.floorText(g, 'zone:heap:d', new Vector3(h.x0 - 0.3, 0, front + 0.7), null)
      .set([{ text: this.lang === 'c' ? 'malloc으로 받은 메모리. 다 쓰면 free로 돌려준다 (안 하면 메모리 누수)' : 'new로 만든 객체. 참조가 없어지면 GC가 치웁니다', color: p.muted, size: 34, weight: 500 }], 0.34, 0);
  }

  // ── 배치: 화면 출력판 ───────────────────────────────

  /** System.out 출력이 있는 프로그램이면 출력판을 세우고, 새 출력은 지금 함수에서 날아간다 */
  private layoutOutput(L: Layout, step: Step, fromStep: Step | undefined, ctx: RenderCtx, forward: boolean) {
    if (!ctx.stdout) return;
    const p = this.pal;
    const { W, H } = Board;
    const pos = this.wide()
      ? new Vector3(this.heapOrigin().x0 + W / 2, H / 2 + 0.02, -6.4)
      : new Vector3(this.stackW + 1.8 + W / 2, H / 2 + 0.02, -1.2);
    const board = this.take('out', () => new Board('out'), pos, null, L.gen);
    const src = OUT_NAME[ctx.lang ?? 'java'];
    board.info = `화면 출력: ${src}로 찍은 글이 여기에 쌓입니다`;
    this.label(L.gen, 'out#t', pos.clone().add(new Vector3(-W / 2, H / 2 + 0.12, 0)), null).set([
      { text: '화면 출력', color: p.text, size: 44, weight: 700 }, { text: `  ${src}`, color: p.muted, size: 36, weight: 600, mono: true },
    ], 0.42, 0, 0);
    const out = ctx.stdout.slice(0, step.out);
    const before = Math.min(fromStep?.out ?? 0, out.length);
    if (forward && out.length > before) {
      board.show(ctx.stdout.slice(0, before), before);
      const added = out.slice(before).replace(/\n$/, '').split('\n').at(-1) ?? '';
      const top = this.items.get(frameKey(step.frames, step.frames.length - 1))
        ?? this.items.get(frameKey(fromStep?.frames ?? [], (fromStep?.frames.length ?? 1) - 1));
      const from = (top ? top.target.clone() : new Vector3()).add(new Vector3(1.2, 1.4, 0.4));
      this.flyText(added.length > 28 ? `${added.slice(0, 27)}…` : added || '↵', from, () => board.target, () => {
        board.show(out, before);
        board.ping();
      });
    } else board.show(out, forward ? before : out.length);
  }


  // ── 카메라 ──────────────────────────────────────────

  private bounds(): { center: Vector3; radius: number; min: Vector3; max: Vector3 } {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const it of this.items.values()) {
      // 바닥 구역과 그 설명 글은 꾸밈이라 화면 맞춤에서 뺀다 (잘려도 괜찮다)
      if (it.dying || it.key.startsWith('zone:')) continue;
      min.min(it.target.clone().sub(it.half));
      max.max(it.target.clone().add(it.half));
    }
    if (!Number.isFinite(min.x)) { min.set(-1, 0, -3.5); max.set(this.stackW + 9, 2, 3); }
    // 여백: 옆·앞뒤는 상자 반쯤, 위는 이름표·깃발 자리만큼
    min.x -= 1.0; max.x += 1.0;
    min.z -= 0.9; max.z += 0.9;
    min.y = Math.min(min.y, 0);
    max.y += 0.9;
    const center = min.clone().add(max).multiplyScalar(0.5);
    return { center, radius: Math.max(6, max.distanceTo(min) / 2), min, max };
  }

  private fit(instant: boolean) {
    const { center, radius, min, max } = this.bounds();
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360) * 0.94;
    const tanH = tanV * this.camera.aspect;
    // 카메라 좌표계(오른쪽·위·뒤)로 상자 모서리 8개를 옮겨, 모두 화면에 들어오는 가장 가까운 거리
    const back = this.viewDir.clone();
    const right = new Vector3(0, 1, 0).cross(back).normalize();
    const up = back.clone().cross(right);
    let dist = 4;
    let cx = 0;
    let cy = 0;
    // 전체를 감싼 상자가 아니라 물체 하나하나의 모서리를 쓴다 (빈 구석까지 화면에 넣지 않게)
    const pts: Vector3[] = [];
    for (const it of this.items.values()) {
      if (it.dying || it.key.startsWith('zone:')) continue;
      const a = it.target.clone().sub(it.half).addScalar(-0.25);
      const b = it.target.clone().add(it.half).addScalar(0.25);
      for (const x of [a.x, b.x]) for (const y of [a.y, b.y]) for (const z of [a.z, b.z]) pts.push(new Vector3(x, y, z).sub(center));
    }
    if (pts.length === 0) {
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) pts.push(new Vector3(x, y, z).sub(center));
    }
    // 화면 위아래·좌우 여백을 고르게: 투영 범위의 가운데로 시점을 옮긴다
    const rs = pts.map((q) => q.dot(right));
    const us = pts.map((q) => q.dot(up));
    cx = (Math.max(...rs) + Math.min(...rs)) / 2;
    cy = (Math.max(...us) + Math.min(...us)) / 2;
    const look = center.clone().addScaledVector(right, cx).addScaledVector(up, cy);
    for (const q0 of pts) {
      const q = q0.clone().addScaledVector(right, -cx).addScaledVector(up, -cy);
      const depth = q.dot(back);
      dist = Math.max(dist, Math.abs(q.dot(right)) / tanH + depth, Math.abs(q.dot(up)) / tanV + depth);
    }
    this.fitTarget.copy(look);
    this.fitPos.copy(look).addScaledVector(this.viewDir, dist);
    // 먼 바닥 격자가 줄무늬로 보이지 않게 안개로 흐린다
    this.fog.near = dist * 1.05;
    this.fog.far = dist * 2.0;
    this.placeSun(center, radius);
    if (instant) {
      this.camera.position.copy(this.fitPos);
      this.controls.target.copy(this.fitTarget);
      this.controls.update();
      this.fitting = false;
    } else this.fitting = true;
  }

  private placeSun(center: Vector3, radius: number) {
    this.sun.position.copy(center).add(new Vector3(-radius * 0.5, radius * 1.4, radius * 0.9));
    this.sun.target.position.copy(center);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -radius * 1.3;
    cam.right = cam.top = radius * 1.3;
    cam.near = 0.5;
    cam.far = radius * 5;
    cam.updateProjectionMatrix();
  }

  private resetView() {
    this.userCam = false;
    this.ui.reset.hidden = true;
    this.fit(false);
    this.wake();
  }

  // ── 그리기 고리 ─────────────────────────────────────

  private wake() {
    this.idle = 0;
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number) => {
    this.raf = 0;
    const dt = this.lastT ? Math.min(0.25, (now - this.lastT) / 1000) : 1 / 60;
    this.lastT = now;
    const k = this.reduced ? 40 : Math.max(7, 5200 / Math.max(250, this.tempo));
    const a = 1 - Math.exp(-dt * k);
    let busy = false;

    for (const it of [...this.items.values()]) {
      if (it.tick(a, dt)) busy = true;
      if (it.dying && it.group.scale.x < 0.03) {
        this.items.delete(it.key);
        this.drop(it);
      }
    }

    for (const f of this.flights) {
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
      const to = f.to();
      f.obj.position.lerpVectors(f.from, to, e);
      f.obj.position.y += Math.sin(Math.PI * e) * f.arc;
      if (f.spin) f.obj.rotation.y = Math.sin(Math.PI * e) * 0.35;
      busy = true;
      if (f.t >= 1) f.land();
    }
    const done = this.flights.filter((f) => f.t >= 1);
    if (done.length) {
      for (const f of done) this.endFlight(f);
      this.flights = this.flights.filter((f) => f.t < 1);
    }

    if (this.updateArrows(dt)) busy = true;

    if (this.fitting) {
      const fa = 1 - Math.exp(-dt * 5);
      this.camera.position.lerp(this.fitPos, fa);
      this.controls.target.lerp(this.fitTarget, fa);
      if (this.camera.position.distanceToSquared(this.fitPos) < 1e-4) this.fitting = false;
      busy = true;
    }
    if (this.controls.update()) busy = true;

    if (this.pointerPending) { this.pointerPending = false; this.pick(); }
    this.renderer.render(this.scene, this.camera);

    this.idle = busy ? 0 : this.idle + 1;
    if (this.idle < 3) this.raf = requestAnimationFrame(this.frame);
    else this.lastT = 0;
  };

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;
    const wasWide = this.wide();
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // 넓은/좁은 배치가 바뀌면 다시 놓는다 (값 날리기 없이 자리만 옮긴다)
    if (wasWide !== this.wide() && this.lastStep) {
      this.shown = null;
      this.render(this.lastStep.step, undefined, this.lastStep.ctx);
    }
    if (!this.userCam) this.fit(true);
    this.wake();
  }

  // ── 마우스 ──────────────────────────────────────────

  private onPointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ui.tip.style.left = `${e.clientX - r.left + 14}px`;
    this.ui.tip.style.top = `${e.clientY - r.top + 14}px`;
    this.pointerPending = true;
    this.wake();
  }

  private pick() {
    this.ray.setFromCamera(this.mouse, this.camera);
    const meshes: Object3D[] = [];
    for (const it of this.items.values()) {
      if (it.dying) continue;
      if (it instanceof VBox || it instanceof Slab) meshes.push(it.mesh);
    }
    const hit = this.ray.intersectObjects(meshes, false)[0];
    this.hover((hit?.object.userData.item as Item | undefined) ?? null);
  }

  private hover(it: Item | null) {
    if (it === this.hovered) return;
    // 이전 강조 끄기
    for (const a of this.arrows.values()) a.hot = false;
    for (const x of this.items.values()) if (x instanceof Slab) x.glow(false, 0);
    this.hovered = it;
    const info = it instanceof VBox || it instanceof Slab ? it.info : '';
    this.ui.tip.hidden = !info;
    this.ui.tip.textContent = info;
    if (it instanceof VBox && it.value.t === 'ref') {
      const id = it.value.id;
      for (const a of this.arrows.values()) if (a.fromKey === it.key) a.hot = true;
      const s = this.items.get(`H${id}`);
      if (s instanceof Slab) s.glow(true, this.pal.arrowHot);
    } else if (it instanceof Slab && it.heapId) {
      for (const a of this.arrows.values()) if (a.to === it.heapId) a.hot = true;
      it.glow(true, this.pal.arrowHot);
    }
    this.updateArrows(0);
    this.wake();
  }

  // ── 색 바꾸기 (밝은/어두운 화면) ─────────────────────

  private makeGrid(): GridHelper {
    const g = new GridHelper(240, 240, this.pal.grid, this.pal.grid);
    g.position.set(20, 0.001, 0);
    this.scene.add(g);
    return g;
  }

  private applyPalette() {
    this.scene.background = new Color(this.pal.bg);
    this.fog.color.setHex(this.pal.bg);
    this.scene.fog = this.fog;
    this.floor.material.opacity = this.pal.shadow;
    this.hemi.groundColor.setHex(this.pal === DARK ? 0x1a1e27 : 0xdde3ea);
    this.hemi.intensity = this.pal === DARK ? 1.0 : 1.5;
  }

  private readonly onTheme = () => {
    this.pal = isDark() ? DARK : LIGHT;
    this.scene.remove(this.grid);
    this.grid.dispose();
    this.grid = this.makeGrid();
    this.applyPalette();
    // 색이 박힌 텍스처·재질을 모두 새로 만든다
    const last = this.lastStep;
    const keepUser = this.userCam;
    this.clear();
    this.userCam = keepUser;
    if (last) this.render(last.step, undefined, last.ctx);
  };
}

const OUT_NAME = { java: 'System.out', python: 'print', c: 'printf' } as const;

// ── 범례 ───────────────────────────────────────────────

const LEGEND_KEY = 'codestep.legend';
const LEGEND: [string, string, string][] = [
  ['val', '값 상자', 'int·double·char·boolean 같은 기본형 값을 그대로 담습니다'],
  ['ref', '참조 상자 #번호', '객체의 참조값을 담습니다. 화살표 끝의 힙 객체를 가리킵니다'],
  ['frame', '판 (스택 프레임)', '함수 호출 하나. 맨 위 판이 지금 실행 중인 함수입니다'],
  ['pin', '깃발', '배열 칸을 가리키는 인덱스 변수 (i, j …)'],
  ['hist', '회차별 기록', '바깥 반복문이 한 바퀴 돌 때마다 배열 모습을 쌓습니다. 노란 칸은 그 바퀴에 바뀐 값'],
  ['gc', '회색으로 가라앉음', '가리키는 참조가 없어져 가비지 컬렉션(GC) 대상이 된 객체'],
  ['out', '화면 출력', 'System.out·print·printf로 찍은 글. 새 글은 초록색'],
  ['flash', '노란 빛', '방금 값이 바뀐 자리'],
];

/** 오른쪽 위 "범례" 단추와 펼치는 설명 */
function legend(): HTMLElement[] {
  const btn = el('button', 's3d-legend-btn', 'ⓘ 범례');
  const box = el('div', 's3d-legend');
  for (const [kind, name, desc] of LEGEND) {
    const row = el('div', 'lg-row');
    row.append(el('span', `lg-sw lg-${kind}`), el('b', '', name), el('span', 'lg-desc', desc));
    box.append(row);
  }
  box.append(el('p', 'lg-note', '자바는 실제 메모리 주소를 보여 주지 않습니다. #번호는 JVM이 객체마다 붙인 고유 번호라서, 번호가 같으면 같은 객체입니다.'));
  let open = false;   // 처음에는 접어 둔다 (펼치면 장면을 가린다)
  try { open = localStorage.getItem(LEGEND_KEY) === 'open'; } catch { /* 무시 */ }
  const paint = () => {
    box.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => {
    open = !open;
    try { localStorage.setItem(LEGEND_KEY, open ? 'open' : 'closed'); } catch { /* 무시 */ }
    paint();
  });
  paint();
  return [btn, box];
}

// ── 도우미 ─────────────────────────────────────────────

interface Change {
  box: VBox;
  value: Value;
  before: Value | undefined;   // undefined: 새로 생김
  dest: Dest;
  parentNew: boolean;          // 판(프레임·객체)도 이번에 새로 생김
  frameIndex: number;
  paramIndex: number;
}

interface Layout {
  gen: number;
  step: Step;
  changes: Change[];
}

const KIND: Record<HeapObj['kind'], string> = {
  array: '배열', list: '리스트', stack: '스택', deque: '덱', set: '집합', map: '맵', object: '객체', opaque: '객체',
};

/** C: 판 위에 펼칠 객체인가 (스택·전역에 있는 배열·구조체를 그 변수가 직접 담고 있다) */
function inlineOf(v: Value, heap: Record<string, HeapObj>): HeapObj | null {
  if (v.t !== 'ref' || v.addr || v.id.startsWith('@')) return null;
  const o = heap[v.id];
  if (!o || (o.region !== 'stack' && o.region !== 'static')) return null;
  return o.kind === 'array' || o.kind === 'object' ? o : null;
}

/** 판 위에 펼쳤을 때의 크기 [너비, 줄 수] */
function inlineSize(o: HeapObj, heap: Record<string, HeapObj>): [number, number] {
  if (o.kind === 'object') return [Math.max(1, o.fields.length) * VAR_PITCH, 1];
  if (o.kind !== 'array') return [VAR_PITCH, 1];
  const n = Math.min(o.items.length, MAX_CELLS);
  const subs = o.items.slice(0, n).map((it) => inlineOf(it, heap));
  if (n && subs.every((x) => x?.kind === 'array')) {
    const cols = Math.max(...subs.map((x) => Math.min((x as HeapObj & { items: Value[] }).items.length, ROW_CELLS)));
    return [cols * PITCH, n];
  }
  if (n && subs.every((x) => x?.kind === 'object')) {
    const nf = Math.max(...subs.map((x) => (x as HeapObj & { fields: Var[] }).fields.length));
    return [Math.min(n, 4) * (nf * 0.98 + 0.35), Math.ceil(n / 4)];
  }
  return [Math.max(1, Math.min(n, ROW_CELLS)) * PITCH, Math.max(1, Math.ceil(n / ROW_CELLS))];
}

/** 0x1000 + 8 → 0x1008 */
function addrPlus(addr: string, off: number): string {
  try { return `0x${(BigInt(addr) + BigInt(off)).toString(16)}`; } catch { return addr; }
}

/** 프레임 변수(바깥 → 안)에서 출발해 참조를 깊이 우선으로 따라간 객체 순서. 닿지 않는 객체는 뒤에 */
function reachOrder(step: Step, rest: (a: string, b: string) => number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (v: Value) => {
    if (v.t !== 'ref' || seen.has(v.id) || !step.heap[v.id]) return;
    seen.add(v.id);
    out.push(v.id);
    const o = step.heap[v.id]!;
    if (o.kind === 'object') for (const f of o.fields) visit(f.value);
    else if (o.kind === 'map') for (const [k, x] of o.entries) { visit(k); visit(x); }
    else if ('items' in o) for (const x of o.items) visit(x);
  };
  for (const f of step.frames) for (const v of f.locals) visit(v.value);
  const left = Object.keys(step.heap).filter((id) => !seen.has(id)).sort(rest);
  return [...out, ...left];
}

/** Java main의 빈 args(길이 0인 String[])는 늘 자리만 차지하고 배울 거리가 없어 3D에서는 숨긴다 */
function tidy(step: Step): Step {
  const f0 = step.frames[0];
  if (f0?.fn !== 'main') return step;
  const a = f0.locals.find((v) => v.name === 'args');
  if (!a || a.value.t !== 'ref') return step;
  const id = a.value.id;
  const o = step.heap[id];
  if (!o || !('len' in o) || o.len !== 0) return step;
  const heap = { ...step.heap };
  delete heap[id];
  return { ...step, heap, frames: [{ ...f0, locals: f0.locals.filter((v) => v !== a) }, ...step.frames.slice(1)] };
}

function frameKey(frames: Frame[], i: number): string {
  const f = frames[i];
  return f ? `F${i}:${f.cls ?? ''}.${f.fn}` : `F${i}`;
}

/** 같은 깊이·같은 함수의 이전 프레임 */
function findFrame(old: Frame[], now: Frame[], i: number): Frame | undefined {
  const a = old[i];
  const b = now[i];
  return a && b && a.fn === b.fn && a.cls === b.cls ? a : undefined;
}

/** 객체 id → 그 객체를 가리키는 이름들 (안쪽 프레임 변수 먼저, 그다음 필드 이름) */
function ownersOf(step: Step, prev: Step | undefined): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const add = (id: string, name: string) => {
    const list = m.get(id) ?? [];
    if (!list.includes(name)) list.push(name);
    m.set(id, list);
  };
  for (const s of prev ? [step, prev] : [step]) {
    for (const f of s.frames.slice().reverse()) for (const v of f.locals) if (v.value.t === 'ref') add(v.value.id, v.name);
    for (const o of Object.values(s.heap)) {
      if (o.kind === 'object') for (const f of o.fields) if (f.value.t === 'ref') add(f.value.id, f.name);
    }
  }
  return m;
}

/** 객체가 차지하는 바닥 크기 [너비, 깊이] */
function measure(o: HeapObj, histRows = 0, histCells = 0): [number, number] {
  if (histRows > 0) {
    const [w, d] = measure(o);
    const rows = Math.min(histRows, HIST_ROWS);
    return [Math.max(w, HIST_LABEL_W + histCells * HIST_CELL + 0.3), d + 0.3 + rows * HIST_PITCH];
  }
  switch (o.kind) {
    case 'stack': {
      const cols = Math.max(1, Math.ceil(Math.min(o.items.length, MAX_CELLS) / 10));
      return [cols * 1.2 + 1.0, 1.5];
    }
    case 'array': case 'list': case 'deque': case 'set': {
      const n = Math.min(o.items.length, MAX_CELLS);
      const cols = Math.max(2, Math.min(n + (o.len > n ? 1 : 0), ROW_CELLS));
      const rows = Math.max(1, Math.ceil(n / ROW_CELLS));
      return [cols * PITCH + 0.6, rows * ROW_D + 0.3];
    }
    case 'map': {
      const rows = Math.max(1, Math.min(o.entries.length, MAX_ENTRIES)) + (o.len > o.entries.length ? 1 : 0);
      return [3.6, rows * 1.25 + 0.4];
    }
    case 'object':
      return [Math.max(2.4, o.fields.length * VAR_PITCH + 0.7), 1.7];
    case 'opaque':
      return [2.2, 1.5];
  }
}

/** WebGL을 쓸 수 있는지 (없으면 2D로) */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}


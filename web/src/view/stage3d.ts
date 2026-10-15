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
  AmbientLight, Color, ConeGeometry, DirectionalLight, Fog, GridHelper, Group, HemisphereLight,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry,
  QuadraticBezierCurve3, Raycaster, Scene, ShadowMaterial, Sprite, SpriteMaterial, TubeGeometry,
  Vector2, Vector3, WebGLRenderer, type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Frame, HeapObj, Step, Value, Var } from '../trace/types';
import { el, showValue, type RenderCtx, type StageView } from './stage';
import { face, label, release, setAnisotropy, type Run, type Tex } from './three/text';
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

const INDEX_NAME = /^(i|j|k|l|r|m|lo|hi|left|right|mid|low|high|idx|index|start|end|top|front|rear|p|q|pos|cur)$/i;

// ── 색 ─────────────────────────────────────────────────

interface Palette {
  bg: number; grid: number; shadow: number;
  text: string; muted: string; accent: string; gold: string; danger: string;
  slab: number; slabTop: number; slabMini: number; slabExc: number; heapSlab: number;
  box: Record<'num' | 'str' | 'bool' | 'ref' | 'null' | 'other', [number, string]>;
  arrow: number; arrowHot: number; flash: number; ret: number; marker: number;
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
};

const boxColors = (p: Palette, v: Value): [number, string] =>
  v.t === 'num' ? p.box.num
    : v.t === 'str' || v.t === 'char' ? p.box.str
      : v.t === 'bool' ? p.box.bool
        : v.t === 'ref' ? p.box.ref
          : v.t === 'null' ? p.box.null : p.box.other;

const faceText = (v: Value): string => (v.t === 'ref' ? '●' : showValue(v));
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
  constructor(public key: string) {
    this.group.scale.setScalar(0.001);
  }

  /** a: 이번 프레임에 남은 거리의 몇 분의 일을 갈지 (0~1). 아직 움직이면 true */
  tick(a: number, _dt: number): boolean {
    let moving = false;
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
  obj: Group;
  mat: MeshStandardMaterial;
  tex: Tex;
  faceMat: MeshBasicMaterial[];
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
  private readonly anchors = new Map<string, Vector3>();   // 객체 id → 화살표 도착점

  private gen = 0;
  private shown: number | null = null;
  private lastStep: { step: Step; ctx: RenderCtx } | null = null;
  private readonly heapSeq = new Map<string, number>();
  private stackW = 4;
  private heapFront: number | null = null;   // 힙 객체들의 맨 앞 z (구역 이름 자리)
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
  private readonly media: MediaQueryList;

  constructor(parent: HTMLElement) {
    this.host = el('div', 's3d');
    parent.append(this.host);
    this.media = matchMedia('(prefers-color-scheme: dark)');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pal = this.media.matches ? DARK : LIGHT;

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    setAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.host.append(this.renderer.domElement);

    // 화면 위 글: 사건 배너, 빈 화면 안내, 조작법, 시점 버튼, 마우스 설명
    const banner = el('div', 's3d-banner');
    const msg = el('div', 's3d-msg');
    const help = el('div', 's3d-help', '드래그 회전 · 휠 확대 · 우클릭 드래그 이동 · 더블클릭 시점 초기화');
    const reset = el('button', 's3d-reset', '⟲ 시점 맞추기');
    reset.hidden = true;
    reset.addEventListener('click', () => this.resetView());
    const tip = el('div', 's3d-tip');
    tip.hidden = true;
    this.host.append(banner, msg, help, reset, tip);
    this.ui = { banner, msg, tip, reset };

    this.camera.position.set(6, 10, 18);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
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
    this.media.addEventListener('change', this.onTheme);
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

    this.layoutStack(L, step, fromStep);
    this.layoutHeap(L, step, owners, fromStep);
    this.layoutReturn(L, step);
    this.zones();

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

    // 이번에 안 그린 것은 치운다
    for (const it of [...this.items.values()]) {
      if (it.gen === gen) continue;
      if (!it.dying) this.retire(it, animate);
    }

    this.applyChanges(changes, { flowOk, animate, sources, srcPos, owners, step, fromStep, ctx });
    this.syncArrows(gen, animate);
    this.banner(step);
    if (!this.userCam) this.fit(!animate);
    this.shown = ctx.index;
    this.wake();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.media.removeEventListener('change', this.onTheme);
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
        slab.info = `${f.fn}() · ${f.line}줄 (접힘: 위쪽 ${FULL_FRAMES}개만 펼쳐 보입니다)`;
        this.label(L.gen, `${fk}#h`, new Vector3(-0.25, y + 0.1, 0.3), birthLift)
          .set([{ text: `${f.fn}()`, color: p.muted, size: 34, mono: true }], 0.3, 1, 0.5);
        y += MINI;
        return;
      }

      const level = i - folded;
      const zc = -level * 0.35;
      const w = Math.max(3.4, f.locals.length * VAR_PITCH + 0.7);
      widest = Math.max(widest, w);
      const slab = this.slab(L.gen, fk, new Vector3(w / 2, y + SLAB_H / 2, zc), birthLift);
      const exc = isTop && step.event === 'exception';
      slab.shape(w, SLAB_H, 2.1, exc ? p.slabExc : isTop ? p.slabTop : p.slab);
      slab.glow(false, 0);
      slab.info = `${f.cls ? `${shortType(f.cls)}.` : ''}${f.fn}() · ${f.line}줄 · 지역 변수 ${f.locals.length}개`;
      this.label(L.gen, `${fk}#h`, new Vector3(-0.3, y + 0.55, zc + 0.6), birthLift).set([
        { text: `${f.fn}()`, color: isTop ? p.accent : p.text, size: 46, weight: 700, mono: true },
        { text: `  ${f.line}줄`, color: p.muted, size: 34, weight: 500 },
      ], 0.46, 1, 0.5);

      const before = fromStep ? findFrame(fromStep.frames, frames, i) : undefined;
      f.locals.forEach((v, j) => {
        const pos = new Vector3(0.35 + C / 2 + j * VAR_PITCH + 0.1, y + SLAB_H + C / 2 + 0.02, zc + 0.15);
        const b = this.vbox(L, `${fk}/${v.name}`, v.value, pos, birthLift, {
          dest: { kind: 'var', name: v.name, frame: fk, isNew: !before?.locals.some((x) => x.name === v.name) },
          parentNew: !existed,
          frameIndex: i,
          paramIndex: v.name === 'this' ? -1 : f.locals.filter((x) => x.name !== 'this').indexOf(v),
        });
        b.src = { kind: 'var', name: v.name, frame: fk };
        b.info = `${v.type} ${v.name} = ${showValue(v.value, step.heap)}`;
        b.name([
          { text: v.name, color: p.text, size: 44, weight: 700, mono: true },
          { text: ` ${shortType(v.type)}`, color: p.muted, size: 32, weight: 500, mono: true },
        ]);
        if (v.value.t === 'ref') this.refs.push({ key: `${fk}/${v.name}`, from: b.key, to: v.value.id });
      });
      y += LEVEL;
    });
    this.stackW = Math.max(this.stackW, widest);
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
    b.info = `${f.fn}()의 반환값 = ${showValue(step.ret, step.heap)}`;
    b.setFlashColor(this.pal.ret);
    b.name([{ text: '반환값', color: this.pal.gold, size: 40, weight: 700 }]);
    b.mesh.material.emissive.setHex(this.pal.ret);
    b.mesh.material.emissiveIntensity = 0.35;
    if (step.ret.t === 'ref') this.refs.push({ key: 'ret', from: 'ret', to: step.ret.id });
  }

  // ── 배치: 힙 ────────────────────────────────────────

  private layoutHeap(L: Layout, step: Step, owners: Map<string, string[]>, fromStep: Step | undefined) {
    // 참조를 따라간 순서로 놓는다: 연결 리스트는 head → next → next 가 한 줄로 이어진다
    const ids = reachOrder(step, (a, b) => this.heapSeq.get(a)! - this.heapSeq.get(b)!);
    const { x0, z0, rowW } = this.heapOrigin();
    let x = x0;
    let z = z0;
    let rowD = 0;
    this.anchors.clear();
    const inner = step.frames.at(-1)?.locals ?? [];
    for (const id of ids) {
      const o = step.heap[id]!;
      const [w, d] = measure(o);
      if (x > x0 && x + w > x0 + rowW) {
        x = x0;
        z += rowD + 1.9;
        rowD = 0;
      }
      this.placeObject(L, id, o, x, z, w, d, owners.get(id) ?? [], inner, fromStep?.heap[id]);
      x += w + 1.5;
      rowD = Math.max(rowD, d);
    }
    this.heapFront = ids.length ? z + rowD + 1.3 : null;
  }

  private placeObject(L: Layout, id: string, o: HeapObj, x0: number, z0: number, w: number, d: number,
    names: string[], inner: Var[], before: HeapObj | undefined) {
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
    this.anchors.set(id, this.wide()
      ? new Vector3(x0 + 0.12, SLAB_H + 0.05, z0 + Math.min(d / 2, 0.9))
      : new Vector3(x0 + Math.min(w / 2, 0.75), SLAB_H + 0.05, z0 + 0.1));

    // 앞쪽 바닥의 이름판
    this.floorText(L.gen, `${hk}#n`, new Vector3(x0, 0, z0 + d + 0.42), birth).set([
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
          b.info = `${names[0] ?? shortType(o.type)}[${i}] = ${showValue(v, heap)}`;
          b.name(null);
          if (v.t === 'ref') this.refs.push({ key: `${hk}/${i}`, from: b.key, to: v.id });
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
          vb.info = `${kt} → ${showValue(v, heap)}`;
          vb.showTop(n > 1);
          vb.name(null);
          this.label(L.gen, `${hk}/a:${kt}`, new Vector3(x0 + 0.3 + C + 0.6, SLAB_H + C / 2, zr), birth)
            .set([{ text: '→', color: p.muted, size: 48, weight: 700 }], 0.4);
          if (k.t === 'ref') this.refs.push({ key: kb.key, from: kb.key, to: k.id });
          if (v.t === 'ref') this.refs.push({ key: vb.key, from: vb.key, to: v.id });
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
          b.info = `${f.type} ${shortType(o.type)}.${f.name} = ${showValue(f.value, heap)}`;
          b.name([
            { text: f.name, color: p.text, size: 42, weight: 700, mono: true },
            { text: ` ${shortType(f.type)}`, color: p.muted, size: 30, weight: 500, mono: true },
          ]);
          if (f.value.t === 'ref') this.refs.push({ key: b.key, from: b.key, to: f.value.id });
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
  private retire(it: Item, animate: boolean) {
    it.dying = true;
    it.targetScale = 0;
    if (/^F\d/.test(it.key)) it.target.y += 2.6;
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
      obj: g, mat, tex, faceMat, from: from.clone(), to: () => dest.target,
      t: 0, dur: Math.min(0.75, Math.max(0.22, (this.tempo / 1000) * 0.6)) * (0.8 + Math.min(1, dist / 12) * 0.4),
      arc: 0.8 + dist * 0.18, land,
    });
  }

  private endFlight(f: Flight) {
    this.scene.remove(f.obj);
    f.mat.dispose();
    for (const m of f.faceMat) m.dispose();
    release(f.tex);
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
      const anchor = this.anchors.get(a.to);
      const target = this.items.get(`H${a.to}`);
      if (!fromItem || !anchor || !target) { a.group.visible = false; continue; }
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
    if (step.event === 'call') b.append(el('div', 'banner call', `→ ${inner?.fn ?? ''}() 호출됨`));
    if (step.event === 'return') {
      b.append(el('div', 'banner ret', step.ret
        ? `↩ ${inner?.fn ?? ''}() 이 ${showValue(step.ret, step.heap)} 를 돌려줌`
        : `↩ ${inner?.fn ?? ''}() 종료`));
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

  private zones() {
    const p = this.pal;
    const g = this.gen;
    const h = this.heapOrigin();
    this.floorText(g, 'zone:stack', new Vector3(-0.2, 0, this.wide() ? 2.2 : 1.55), null)
      .set([{ text: '호출 스택', color: p.muted, size: 52, weight: 700 }], 0.62, 0);
    this.floorText(g, 'zone:heap', new Vector3(h.x0 - 0.2, 0, this.heapFront ?? (this.wide() ? -3.3 : h.z0 - 0.9)), null)
      .set([{ text: this.heapFront === null ? '힙 — 아직 객체 없음' : '힙 — 객체 · 배열 · 컬렉션', color: p.muted, size: 52, weight: 700 }], 0.62, 0);
  }

  // ── 카메라 ──────────────────────────────────────────

  private bounds(): { center: Vector3; radius: number; min: Vector3; max: Vector3 } {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const it of this.items.values()) {
      if (it.dying) continue;
      min.min(it.target);
      max.max(it.target);
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
    const pts: Vector3[] = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) pts.push(new Vector3(x, y, z).sub(center));
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
      f.obj.rotation.y = Math.sin(Math.PI * e) * 0.35;
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
    this.pal = this.media.matches ? DARK : LIGHT;
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
function measure(o: HeapObj): [number, number] {
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


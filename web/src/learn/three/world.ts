// 학습용 3D 실습 무대의 바탕: 렌더러·카메라·조명·바닥, 글자 블록, 움직임, 클릭해서 설명 보기.
// 코드 연습의 3D 무대(view/stage3d.ts)와 같은 느낌(둥근 블록, 그림자, 위에서 비스듬히 보는 시점)으로 만든다.
import {
  AmbientLight, BoxGeometry, Color, LineBasicMaterial, DirectionalLight, Fog, GridHelper, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Object3D, PCFShadowMap, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShadowMaterial,
  SphereGeometry, Sprite, SpriteMaterial, Vector2, Vector3, WebGLRenderer,
  MOUSE,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { face, label, release, setAnisotropy, type Run, type Tex } from '../../view/three/text';
import { isDark, onTheme } from '../../theme';
import { el } from '../../view/stage';
import { lerp, reduced, tween } from '../core';

export interface Pal {
  bg: number; grid: number; text: string; muted: string; accent: number; accentText: string;
  cell: number; cellText: string; key: number; good: number; bad: number; warn: number; ghost: number; slab: number; pend: number;
}
const LIGHT: Pal = { bg: 0xf6f7f9, grid: 0xdfe3e8, text: '#1c2128', muted: '#667085', accent: 0x2563eb, accentText: '#ffffff', cell: 0xffffff, cellText: '#1c2128', key: 0xf59e0b, good: 0x16a34a, bad: 0xdc2626, warn: 0xf59e0b, ghost: 0x93c5fd, slab: 0xe3e8ef, pend: 0xfde68a };
const DARK: Pal = { bg: 0x0f1115, grid: 0x2a2f3a, text: '#e6e8ec', muted: '#8b93a1', accent: 0x3b82f6, accentText: '#ffffff', cell: 0x2a303c, cellText: '#e6e8ec', key: 0xf59e0b, good: 0x22c55e, bad: 0xef4444, warn: 0xfbbf24, ghost: 0x3b6fb6, slab: 0x1b1f28, pend: 0x6b5414 };

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** 물체를 누르면 띄울 설명 */
export interface Info { title: string; body: string; sub?: string }

export class World {
  readonly el: HTMLElement;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(40, 1, 0.1, 400);
  pal: Pal = isDark() ? DARK : LIGHT;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly grid: GridHelper;
  private readonly fog = new Fog(0xffffff, 45, 110);
  private raf = 0;
  private alive = true;
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;
  /** 화면에 보이는가 (안 보이면 그리지 않는다) */
  private seen = true;
  private readonly offTheme: () => void;
  private readonly texs = new Set<Tex>();
  private readonly ray = new Raycaster();
  /** 테마가 바뀌면 다시 그리라고 알린다 */
  onRepaint: (() => void) | null = null;
  /** 설명이 붙은 물체를 눌렀을 때 */
  onPick: ((info: Info, o: Object3D) => void) | null = null;
  readonly round = new RoundedBoxGeometry(1, 1, 1, 3, 0.1);
  readonly ball = new SphereGeometry(0.5, 24, 16);

  constructor(height = 440, opts: { autoDispose?: boolean } = {}) {
    this.el = el('div', 'world3d');
    (this.el as unknown as { world: World }).world = this;
    this.el.style.height = `${height}px`;
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    setAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.el.append(this.renderer.domElement, el('div', 'world3d-help', '드래그 이동 · 우클릭 드래그 회전 · 휠 확대 · 블록을 누르면 설명'));
    this.camera.position.set(1.5, 11, 14);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // 왼쪽 드래그 = 이동, 오른쪽 드래그 = 회전 (사용자 요청), 휠 = 확대
    this.controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 70;
    const sun = new DirectionalLight(0xffffff, 2.0);
    sun.position.set(8, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22 });
    this.scene.add(sun, new HemisphereLight(0xffffff, 0xdde3ea, 1.4), new AmbientLight(0xffffff, 0.35));
    const floor = new Mesh(new PlaneGeometry(200, 200), new ShadowMaterial({ opacity: 0.15 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.grid = new GridHelper(120, 120, 0xcccccc, 0xcccccc);
    this.scene.add(this.grid);
    this.scene.fog = this.fog;
    this.paintTheme();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.el);
    this.io = new IntersectionObserver((es) => { this.seen = es.some((e) => e.isIntersecting); });
    this.io.observe(this.el);
    this.offTheme = onTheme(() => { this.pal = isDark() ? DARK : LIGHT; this.paintTheme(); this.onRepaint?.(); });
    this.resize();
    this.listen();
    // 팝업 속 장면처럼 따로 닫아 주는 곳이 없으면, 화면에서 빠진 뒤 스스로 정리한다
    let wasOn = false, offFrames = 0;
    const loop = () => {
      if (!this.alive) return;
      this.raf = requestAnimationFrame(loop);
      if (opts.autoDispose) {
        if (this.el.isConnected) { wasOn = true; offFrames = 0; }
        else if (wasOn && ++offFrames > 30) { this.dispose(); return; }
      }
      if (!this.el.isConnected || document.hidden || !this.seen) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private paintTheme() {
    const p = this.pal;
    this.scene.background = new Color(p.bg);
    this.fog.color = new Color(p.bg);
    const m = this.grid.material as LineBasicMaterial;
    m.color = new Color(p.grid);
    m.transparent = true;
    m.opacity = 0.6;
  }

  resize() {
    const w = this.el.clientWidth || 600, h = this.el.clientHeight || 400;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** 누름(끌기 아님) → 설명이 붙은 물체를 찾는다. 올려 두면 손가락 모양 */
  private listen() {
    const c = this.renderer.domElement;
    let dx = 0, dy = 0;
    const hit = (e: PointerEvent): { info: Info; o: Object3D } | null => {
      const r = c.getBoundingClientRect();
      this.ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
      for (const h of this.ray.intersectObjects(this.scene.children, true)) {
        let o: Object3D | null = h.object;
        while (o && !o.userData.info) o = o.parent;
        if (o && o.visible) return { info: o.userData.info as Info, o };
      }
      return null;
    };
    c.addEventListener('pointerdown', (e) => { dx = e.clientX; dy = e.clientY; });
    c.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - dx, e.clientY - dy) > 5 || e.button !== 0) return;
      const h = hit(e);
      if (h) this.onPick?.(h.info, h.o);
    });
    c.addEventListener('pointermove', (e) => {
      if (e.buttons) return;
      c.style.cursor = hit(e) ? 'pointer' : '';
    });
  }

  /** 카메라가 target을 바라보며 dist 거리에서 비스듬히 보게 */
  look(target: Vector3, dist: number, ms = 800, tilt = 0.78) {
    const dir = new Vector3(0.12, tilt, 1).normalize();
    const to = target.clone().add(dir.multiplyScalar(dist));
    const fp = this.camera.position.clone(), ft = this.controls.target.clone();
    tween(reduced() ? 0 : ms, (t) => {
      this.camera.position.lerpVectors(fp, to, t);
      this.controls.target.lerpVectors(ft, target, t);
    });
  }

  /** x0~x1, z0~z1 범위가 화면에 다 들어오게 카메라를 옮긴다 */
  fit(x0: number, x1: number, z0: number, z1: number, ms = 800, tilt = 0.78) {
    this.resize();   // 화면에 막 붙은 경우 실제 비율로
    const half = Math.atan(Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect);
    const d = Math.max(7, ((x1 - x0) / 2 / Math.tan(half)) * 1.4, (z1 - z0) * 1.08);
    this.look(new Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2 + 0.4), d, ms, tilt);
  }

  // ── 만들기 ──

  /** 둥근 블록(바닥이 y=0). top: 윗면 글자 */
  block(w: number, h: number, d: number, color: number, top?: { text: string; color: string }, opts: { opacity?: number; info?: Info } = {}): Group {
    const g = new Group();
    const mat = new MeshStandardMaterial({ color, roughness: 0.6, transparent: opts.opacity !== undefined, opacity: opts.opacity ?? 1, depthWrite: opts.opacity === undefined || opts.opacity > 0.6 });
    const m = new Mesh(this.round, mat);
    m.scale.set(w, h, d);
    m.position.y = h / 2;
    m.castShadow = opts.opacity === undefined;
    m.receiveShadow = true;
    g.add(m);
    g.userData.body = m;
    g.userData.size = [w, h, d];
    if (opts.info) g.userData.info = opts.info;
    if (top) this.setTop(g, top.text, top.color);
    return g;
  }

  /** 블록 윗면 글자를 바꾼다 */
  setTop(g: Group, text: string, color: string) {
    const cur = g.userData.top as { text: string; color: string } | undefined;
    const [w, h, d] = g.userData.size as number[];
    const sig = `${text}|${color}|${w}x${d}`;
    if (cur && g.userData.topSig === sig) return;
    const old = g.userData.topMesh as Mesh | undefined;
    if (old) { g.remove(old); this.unref(old.userData.tex); (old.material as MeshBasicMaterial).dispose(); old.geometry.dispose(); }
    g.userData.top = { text, color };
    g.userData.topSig = sig;
    if (!text) { g.userData.topMesh = undefined; return; }
    const t = face(text, color, w! / d!);
    this.texs.add(t);
    const plane = new Mesh(new PlaneGeometry(w! * 0.94, d! * 0.94), new MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = h! + 0.006;
    plane.userData.tex = t;
    g.add(plane);
    g.userData.topMesh = plane;
  }

  /** 블록 크기를 바꾼다(움직임) */
  reshape(g: Group, w: number, h: number, d: number, ms = 500): Promise<void> {
    const [w0, h0, d0] = g.userData.size as number[];
    if (w0 === w && h0 === h && d0 === d) return Promise.resolve();
    const body = g.userData.body as Mesh;
    const top = g.userData.top as { text: string; color: string } | undefined;
    const tm = g.userData.topMesh as Mesh | undefined;
    if (tm) tm.visible = false;
    return tween(reduced() ? 0 : ms, (t) => {
      const H = lerp(h0!, h, t);
      body.scale.set(lerp(w0!, w, t), H, lerp(d0!, d, t));
      body.position.y = H / 2;
    }).done.then(() => {
      g.userData.size = [w, h, d];
      if (top) { g.userData.topSig = ''; this.setTop(g, top.text, top.color); }
    });
  }

  /** 공 */
  sphere(r: number, color: number, emissive = 0.4): Mesh {
    const m = new Mesh(this.ball, new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.4 }));
    m.scale.setScalar(r * 2);
    m.castShadow = true;
    return m;
  }

  /** 늘 카메라를 보는 글자 표지판 */
  sign(runs: Run[], height: number, bg?: string): Sprite {
    const t = label(runs, bg);
    this.texs.add(t);
    const s = new Sprite(new SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false }));
    s.scale.set(height * t.aspect, height, 1);
    s.userData.tex = t;
    s.renderOrder = 2;
    return s;
  }

  /** 바닥에 누운 글자 */
  floorText(runs: Run[], height: number): Mesh {
    const t = label(runs);
    this.texs.add(t);
    const m = new Mesh(new PlaneGeometry(height * t.aspect, height), new MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    m.userData.tex = t;
    return m;
  }

  /** 두 점을 잇는 가는 막대 (연결선) */
  bar(a: Vector3, b: Vector3, color: number, radius = 0.04, opacity = 0.85): Mesh {
    const len = Math.max(0.001, a.distanceTo(b));
    const m = new Mesh(new BoxGeometry(radius * 2, radius * 2, len), new MeshBasicMaterial({ color, transparent: true, opacity }));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.lookAt(b);
    return m;
  }

  private unref(t?: Tex) { if (t && this.texs.delete(t)) release(t); }

  /** 물체와 그 안의 글자 텍스처를 치운다 */
  remove(o: Object3D) {
    o.parent?.remove(o);
    o.traverse((c) => {
      const m = c as Mesh;
      if (c.userData.tex) this.unref(c.userData.tex);
      if (m.material) ([] as unknown[]).concat(m.material).forEach((x) => (x as { dispose(): void }).dispose());
      if (m.geometry && m.geometry !== this.round && m.geometry !== this.ball) m.geometry.dispose();
    });
  }

  // ── 움직임 ──

  move(o: Object3D, to: Vector3, ms = 600, arc = 0): Promise<void> {
    const from = o.position.clone();
    if (from.distanceToSquared(to) < 1e-6) return Promise.resolve();
    return tween(reduced() ? 0 : ms, (t) => {
      o.position.set(lerp(from.x, to.x, t), lerp(from.y, to.y, t) + Math.sin(t * Math.PI) * arc, lerp(from.z, to.z, t));
    }).done;
  }
  scale(o: Object3D, to: number, ms = 400): Promise<void> {
    const f = o.scale.x;
    return tween(reduced() ? 0 : ms, (t) => o.scale.setScalar(lerp(f, to, t))).done;
  }
  /** 크기 0에서 톡 튀어나온다 */
  pop(o: Object3D, ms = 450): Promise<void> {
    const s = o.scale.clone();
    o.scale.setScalar(0.001);
    return tween(reduced() ? 0 : ms, (t) => {
      const k = t < 0.7 ? (t / 0.7) * 1.12 : 1.12 - ((t - 0.7) / 0.3) * 0.12;
      o.scale.set(s.x * k, s.y * k, s.z * k);
    }).done.then(() => { o.scale.copy(s); });
  }
  fade(o: Object3D, to: number, ms = 400): Promise<void> {
    const mats: MeshStandardMaterial[] = [];
    o.traverse((c) => { const m = (c as Mesh).material as MeshStandardMaterial | undefined; if (m) { m.transparent = true; mats.push(m); } });
    const from = mats.map((m) => m.opacity);
    return tween(reduced() ? 0 : ms, (t) => mats.forEach((m, i) => { m.opacity = lerp(from[i]!, to, t); })).done;
  }
  /** 사라지기: shrink(작아짐) · fall(무너져 떨어짐) · fly(위로 날아감) */
  async vanish(o: Object3D, how: 'shrink' | 'fall' | 'fly' = 'shrink', ms = 650): Promise<void> {
    if (how === 'shrink') {
      await Promise.all([this.scale(o, 0.001, ms * 0.7), this.fade(o, 0, ms * 0.7)]);
    } else {
      const p = o.position.clone(), r = o.rotation.clone();
      const rx = (Math.random() - 0.5) * 2.4, rz = (Math.random() - 0.5) * 2.4, dx = (Math.random() - 0.5) * 1.2;
      const fade = this.fade(o, 0, ms);
      await tween(reduced() ? 0 : ms, (t) => {
        if (how === 'fall') {
          o.position.set(p.x + dx * t, p.y + 0.6 * Math.sin(t * Math.PI * 0.5) - 3.2 * t * t, p.z + 0.4 * t);
          o.rotation.set(r.x + rx * t, r.y, r.z + rz * t);
        } else {
          o.position.set(p.x, p.y + 5 * t * t, p.z);
          o.rotation.y = r.y + t * 3;
        }
      }, (t) => t).done;
      await fade;
    }
    this.remove(o);
  }
  /** 몸통 색을 잠깐 바꿨다 돌아온다 (강조) */
  flash(g: Object3D, color: number, ms = 900): Promise<void> {
    const m = (g.userData.body as Mesh | undefined)?.material as MeshStandardMaterial | undefined ?? ((g as Mesh).material as MeshStandardMaterial | undefined);
    if (!m || !('emissive' in m)) return Promise.resolve();
    const base = m.color.clone(), hi = new Color(color), e0 = m.emissive.clone(), i0 = m.emissiveIntensity;
    m.emissive = new Color(color);
    return tween(reduced() ? 0 : ms, (t) => {
      const k = Math.sin(t * Math.PI);
      m.color.copy(base).lerp(hi, k * 0.75);
      m.emissiveIntensity = k * 0.55;
    }).done.then(() => { m.color.copy(base); m.emissive.copy(e0); m.emissiveIntensity = i0; });
  }
  /** 몸통 색을 바꾼다 */
  tint(g: Group, color: number, emissive = 0) {
    const m = (g.userData.body as Mesh).material as MeshStandardMaterial;
    m.color.setHex(color);
    m.emissive.setHex(color);
    m.emissiveIntensity = emissive;
  }
  /** 투명도를 바로 정한다 */
  opacity(g: Group, v: number) {
    const m = (g.userData.body as Mesh).material as MeshStandardMaterial;
    m.transparent = v < 1;
    m.opacity = v;
  }
  /** 위로 들었다 놓는다 */
  async hop(o: Object3D, dy = 0.5, ms = 500): Promise<void> {
    const y = o.position.y;
    await tween(reduced() ? 0 : ms, (t) => { o.position.y = y + Math.sin(t * Math.PI) * dy; }).done;
    o.position.y = y;
  }
  /** x축으로 한 바퀴 뒤집는다(값이 바뀔 때) */
  async flip(o: Object3D, ms = 600, mid?: () => void): Promise<void> {
    let done = false;
    await tween(reduced() ? 0 : ms, (t) => {
      o.rotation.x = t * Math.PI * 2;
      if (!done && t >= 0.5) { done = true; mid?.(); }
    }).done;
    if (!done) mid?.();
    o.rotation.x = 0;
  }

  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.offTheme();
    this.remove(this.scene);
    for (const t of this.texs) release(t);
    this.texs.clear();
    this.round.dispose();
    this.ball.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    // WebGL 문맥은 브라우저마다 개수 제한이 있어 바로 돌려준다
    this.renderer.forceContextLoss();
  }
}

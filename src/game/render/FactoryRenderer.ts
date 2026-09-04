import * as THREE from 'three';
import type { Placement, StageConfig, SurfaceMaterial } from '@/types';
import { PALETTE } from '@/game/config/palette';
import type { StageRuntime } from '@/game/physics/StageRuntime';
import { createPartVisual, PART_DEPTH, TERRAIN_DEPTH, type PartVisual } from './partMeshes';

const CAMERA_FOV = 32;
const CAMERA_TILT = 0.16;
const WORLD_WIDTH = 21;
const WORLD_HEIGHT = 15.5;
const WORLD_CENTER_Y = 0.5;

function materialColor(material: SurfaceMaterial, theme: StageConfig['theme']): number {
  switch (material) {
    case 'metal':
      return 0x8f9bb3;
    case 'rubber':
      return 0x4b5566;
    case 'wood':
    default:
      return theme.floor;
  }
}

function makeBallTexture(color: number, accent: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = `#${accent.toString(16).padStart(6, '0')}`;
  // ころがりが みえるように しま もようを いれる
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(i * (size / 4), 0, size / 16, size);
  }
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function starShape(outer: number, inner: number, points = 5): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

interface BallVisual {
  mesh: THREE.Mesh;
  id: string;
}

interface CoinVisual {
  mesh: THREE.Mesh;
  id: string;
}

/**
 * 工場ジオラマの 描画。
 *
 * シミュレーションは z = 0 の へいめんだけで うごくので、
 * ここでは その けっかを よんで 3D の みため に うつすだけ。
 * 物理の けいさんは いっさい しない。
 */
export class FactoryRenderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private renderer: THREE.WebGLRenderer;
  private readonly backdrop = new THREE.Group();
  private readonly stageGroup = new THREE.Group();
  private readonly partsGroup = new THREE.Group();
  private readonly ballsGroup = new THREE.Group();
  private readonly ghostGroup = new THREE.Group();
  private readonly effectsGroup = new THREE.Group();

  private partVisuals = new Map<string, PartVisual>();
  private ballVisuals: BallVisual[] = [];
  private coinVisuals: CoinVisual[] = [];
  private goalRings = new Map<string, THREE.Mesh>();
  private gears: THREE.Mesh[] = [];
  private selectionRing: THREE.Mesh | null = null;
  private ghostVisual: PartVisual | null = null;

  private elapsed = 0;
  private running = false;
  private raycaster = new THREE.Raycaster();
  private planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(PALETTE.sky, 1);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.5, 200);
    this.scene.add(this.backdrop, this.stageGroup, this.partsGroup, this.ballsGroup, this.ghostGroup, this.effectsGroup);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x6b7a93, 1.05);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(-4, 8, 12);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.45);
    fill.position.set(6, -3, 8);
    this.scene.add(fill);

    this.buildBackdrop();
    this.resize(window.innerWidth, window.innerHeight);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  private lastSize = { width: 1, height: 1 };
  private frame = { width: WORLD_WIDTH, height: WORLD_HEIGHT, centerX: 0, centerY: WORLD_CENTER_Y };

  /** カメラが うつす はんいを かえる（ずかんの アップ表示など） */
  setFrame(frame?: { width: number; height: number; centerX: number; centerY: number }): void {
    this.frame = frame ?? {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      centerX: 0,
      centerY: WORLD_CENTER_Y,
    };
    this.resize(this.lastSize.width, this.lastSize.height);
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.lastSize = { width: w, height: h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;

    const halfFov = THREE.MathUtils.degToRad(CAMERA_FOV) / 2;
    const distForHeight = this.frame.height / 2 / Math.tan(halfFov);
    const distForWidth = this.frame.width / 2 / (Math.tan(halfFov) * this.camera.aspect);
    const distance = Math.max(distForHeight, distForWidth);

    this.camera.position.set(
      this.frame.centerX,
      this.frame.centerY + distance * Math.sin(CAMERA_TILT),
      distance * Math.cos(CAMERA_TILT),
    );
    this.camera.lookAt(this.frame.centerX, this.frame.centerY, 0);
    this.camera.updateProjectionMatrix();
  }

  /** がめん座標を シミュレーション平面（z = 0）の 座標に なおす */
  screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    const found = this.raycaster.ray.intersectPlane(this.planeZ0, hit);
    if (!found) return { x: 0, y: 0 };
    return { x: hit.x, y: hit.y };
  }

  /** シミュレーション平面の 座標を がめん座標に なおす */
  worldToScreen(x: number, y: number): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const projected = new THREE.Vector3(x, y, 0).project(this.camera);
    return {
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
    };
  }

  setStage(stage: StageConfig): void {
    this.clearStage();
    this.clearGroup(this.ballsGroup);
    this.ballVisuals = [];
    this.coinVisuals = [];
    this.goalRings.clear();

    this.renderer.setClearColor(stage.theme.sky, 1);
    this.scene.fog = new THREE.Fog(stage.theme.sky, 40, 90);
    this.applyBackdropTheme(stage);

    for (const piece of stage.terrain) {
      if (piece.decorative) continue;
      const color = piece.color ?? materialColor(piece.material, stage.theme);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(piece.w, piece.h, TERRAIN_DEPTH),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: piece.material === 'metal' ? 0.35 : 0.05 }),
      );
      mesh.position.set(piece.x, piece.y, 0);
      mesh.rotation.z = piece.angle;
      this.stageGroup.add(mesh);

      // うわめんの ハイライト。だんさが みやすくなる
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(piece.w * 0.98, 0.07, TERRAIN_DEPTH * 1.01),
        new THREE.MeshStandardMaterial({ color: stage.theme.accent, roughness: 0.7 }),
      );
      cap.position.set(0, piece.h / 2, 0);
      mesh.add(cap);
    }

    for (const goal of stage.goals) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(goal.radius * 0.72, 0.07, 10, 26),
        new THREE.MeshStandardMaterial({
          color: PALETTE.goal,
          emissive: PALETTE.goal,
          emissiveIntensity: 0.45,
          roughness: 0.4,
        }),
      );
      ring.position.set(goal.x, goal.y, 0);
      this.stageGroup.add(ring);
      this.goalRings.set(goal.id, ring);

      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.5, 4),
        new THREE.MeshStandardMaterial({ color: PALETTE.goalAccent }),
      );
      flag.position.set(goal.x, goal.y + goal.radius + 0.5, 0);
      this.stageGroup.add(flag);
    }

    const coinGeometry = new THREE.ExtrudeGeometry(starShape(0.34, 0.15), {
      depth: 0.12,
      bevelEnabled: false,
    });
    for (const coin of stage.coins) {
      const mesh = new THREE.Mesh(
        coinGeometry.clone(),
        new THREE.MeshStandardMaterial({
          color: PALETTE.coin,
          emissive: PALETTE.coin,
          emissiveIntensity: 0.35,
          metalness: 0.3,
          roughness: 0.35,
        }),
      );
      mesh.position.set(coin.x, coin.y, 0);
      this.stageGroup.add(mesh);
      this.coinVisuals.push({ mesh, id: coin.id });
    }
    coinGeometry.dispose();

    for (const spawn of stage.balls) {
      const color = spawn.color ?? PALETTE.ball;
      const accent = color === PALETTE.ballAlt ? PALETTE.ballAltAccent : PALETTE.ballAccent;
      const texture = makeBallTexture(color, accent);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 22, 16),
        new THREE.MeshStandardMaterial({
          color: texture ? 0xffffff : color,
          map: texture,
          roughness: 0.42,
          metalness: 0.05,
        }),
      );
      mesh.position.set(spawn.x, spawn.y, 0);
      this.ballsGroup.add(mesh);
      this.ballVisuals.push({ mesh, id: spawn.id });
    }
  }

  /** ステージの みためを ぜんぶ けす（メニューがめん用） */
  clearStage(): void {
    this.clearGroup(this.stageGroup);
    this.clearGroup(this.ballsGroup);
    this.clearGroup(this.ghostGroup);
    for (const visual of this.partVisuals.values()) {
      this.partsGroup.remove(visual.group);
      visual.dispose();
    }
    this.partVisuals.clear();
    this.ghostVisual = null;
    this.ballVisuals = [];
    this.coinVisuals = [];
    this.goalRings.clear();
    if (this.selectionRing) this.selectionRing.visible = false;
  }

  /** おいてある パーツの 3D モデルを つくりなおす */
  syncPlacements(placements: readonly Placement[]): void {
    const seen = new Set<string>();
    for (const placement of placements) {
      seen.add(placement.id);
      const existing = this.partVisuals.get(placement.id);
      if (existing) {
        existing.group.position.set(placement.x, placement.y, 0);
        existing.group.rotation.z = placement.angle;
        continue;
      }
      const visual = createPartVisual(placement.kind, placement);
      this.partVisuals.set(placement.id, visual);
      this.partsGroup.add(visual.group);
    }
    for (const [id, visual] of [...this.partVisuals]) {
      if (seen.has(id)) continue;
      this.partsGroup.remove(visual.group);
      visual.dispose();
      this.partVisuals.delete(id);
    }
  }

  /** シミュレーションの じょうたいを みための いちに はんえいする */
  syncRuntime(runtime: StageRuntime | null): void {
    if (!runtime) return;
    for (const visual of this.ballVisuals) {
      const ball = runtime.world.balls.find((b) => b.id === visual.id);
      if (!ball) continue;
      visual.mesh.visible = ball.active;
      visual.mesh.position.set(ball.x, ball.y, 0);
      visual.mesh.rotation.z = -ball.spin;
    }

    for (const [placementId, visual] of this.partVisuals) {
      const domino = runtime.world.dominoes.find((d) => d.id === placementId);
      const hammer = runtime.world.hammers.find((h) => h.id === placementId);
      visual.update({
        time: this.elapsed,
        running: this.running,
        lean: domino?.lean,
        theta: hammer?.theta,
      });
    }

    const collected = new Set(runtime.coinsCollected);
    for (const coin of this.coinVisuals) {
      coin.mesh.visible = !collected.has(coin.id);
    }
    for (const [goalId, ring] of this.goalRings) {
      const filled = runtime.goalBall(goalId) !== undefined;
      const material = ring.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = filled ? 1.1 : 0.45;
      ring.scale.setScalar(filled ? 1.25 : 1);
    }
  }

  /** そうちを うごかす まえの じょうたいに もどす */
  resetVisualState(stage: StageConfig): void {
    for (const visual of this.ballVisuals) {
      const spawn = stage.balls.find((b) => b.id === visual.id);
      if (!spawn) continue;
      visual.mesh.visible = true;
      visual.mesh.position.set(spawn.x, spawn.y, 0);
      visual.mesh.rotation.set(0, 0, 0);
    }
    for (const coin of this.coinVisuals) coin.mesh.visible = true;
    for (const ring of this.goalRings.values()) {
      (ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45;
      ring.scale.setScalar(1);
    }
    for (const visual of this.partVisuals.values()) {
      visual.update({ time: this.elapsed, running: false, lean: 0, theta: 0 });
    }
  }

  /** ドラッグちゅうの はんとうめいな プレビュー */
  setGhost(placement: Placement | null, valid: boolean): void {
    if (this.ghostVisual) {
      this.ghostGroup.remove(this.ghostVisual.group);
      this.ghostVisual.dispose();
      this.ghostVisual = null;
    }
    if (!placement) return;
    const visual = createPartVisual(placement.kind, placement);
    visual.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material;
      const apply = (m: THREE.Material): void => {
        m.transparent = true;
        m.opacity = 0.55;
        if (m instanceof THREE.MeshStandardMaterial) {
          m.color.set(valid ? PALETTE.uiGood : PALETTE.uiWarn);
          m.emissive.set(valid ? PALETTE.uiGood : PALETTE.uiWarn);
          m.emissiveIntensity = 0.25;
        }
      };
      if (Array.isArray(material)) material.forEach(apply);
      else apply(material);
    });
    this.ghostVisual = visual;
    this.ghostGroup.add(visual.group);
  }

  /** えらんでいる パーツを わっかで しめす */
  setSelected(placement: Placement | null): void {
    if (!this.selectionRing) {
      this.selectionRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.06, 8, 30),
        new THREE.MeshStandardMaterial({
          color: PALETTE.uiAccent,
          emissive: PALETTE.uiAccent,
          emissiveIntensity: 0.6,
        }),
      );
      this.effectsGroup.add(this.selectionRing);
    }
    this.selectionRing.visible = placement !== null;
    if (placement) {
      this.selectionRing.position.set(placement.x, placement.y, PART_DEPTH / 2 + 0.1);
    }
  }

  /** パーツを タップしたか しらべる（いちばん ちかい パーツを かえす） */
  pickPlacement(clientX: number, clientY: number, placements: readonly Placement[]): Placement | null {
    const world = this.screenToWorld(clientX, clientY);
    let best: Placement | null = null;
    let bestDistance = Infinity;
    for (const placement of placements) {
      const distance = Math.hypot(placement.x - world.x, placement.y - world.y);
      if (distance < 1.15 && distance < bestDistance) {
        bestDistance = distance;
        best = placement;
      }
    }
    return best;
  }

  render(dt: number): void {
    this.elapsed += dt;
    for (const gear of this.gears) {
      gear.rotation.z += gear.userData.speed * dt * (this.running ? 2.2 : 1);
    }
    for (const coin of this.coinVisuals) {
      coin.mesh.rotation.y = this.elapsed * 2.4;
      coin.mesh.position.z = Math.sin(this.elapsed * 2 + coin.mesh.position.x) * 0.08;
    }
    if (this.selectionRing?.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 5) * 0.06;
      this.selectionRing.scale.setScalar(pulse);
    }
    if (!this.running) {
      for (const visual of this.partVisuals.values()) {
        visual.update({ time: this.elapsed, running: false });
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  get effectsRoot(): THREE.Group {
    return this.effectsGroup;
  }

  dispose(): void {
    for (const visual of this.partVisuals.values()) visual.dispose();
    this.partVisuals.clear();
    this.clearGroup(this.stageGroup);
    this.clearGroup(this.ballsGroup);
    this.clearGroup(this.partsGroup);
    this.clearGroup(this.ghostGroup);
    this.clearGroup(this.effectsGroup);
    this.clearGroup(this.backdrop);
    this.renderer.dispose();
  }

  // --- うちがわ ------------------------------------------------------------

  private buildBackdrop(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c6da, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(70, 44), wallMaterial);
    wall.position.set(0, 2, -9);
    this.backdrop.add(wall);

    const gearMaterial = new THREE.MeshStandardMaterial({ color: 0x93a3bd, roughness: 0.6, metalness: 0.3 });
    const gearSpots: Array<[number, number, number, number]> = [
      [-8.5, 6.5, 1.5, 0.6],
      [-6.4, 8.0, 1.0, -0.9],
      [8.4, 6.8, 1.8, -0.45],
      [6.2, 8.4, 1.1, 0.8],
      [0, 9.4, 1.35, 0.5],
    ];
    for (const [x, y, radius, speed] of gearSpots) {
      const gear = new THREE.Mesh(makeGearGeometry(radius), gearMaterial);
      gear.position.set(x, y, -5.5);
      gear.userData.speed = speed;
      this.gears.push(gear);
      this.backdrop.add(gear);
    }

    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0xa4b2c8, roughness: 0.5, metalness: 0.4 });
    const pipeSpots: Array<[number, number, number, number]> = [
      [-11, -2, 1.2, 14],
      [11.5, 1, 1.2, 18],
      [0, -9.5, 26, 1.1],
    ];
    for (const [x, y, w, h] of pipeSpots) {
      const pipe = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.4), pipeMaterial);
      pipe.position.set(x, y, -4.5);
      this.backdrop.add(pipe);
    }
  }

  private applyBackdropTheme(stage: StageConfig): void {
    for (const child of this.backdrop.children) {
      if (!(child instanceof THREE.Mesh)) continue;
      if (child.geometry instanceof THREE.PlaneGeometry) {
        (child.material as THREE.MeshStandardMaterial).color.set(stage.theme.sky).multiplyScalar(0.86);
      }
    }
  }

  private clearGroup(group: THREE.Group): void {
    for (const child of [...group.children]) {
      group.remove(child);
      child.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const material = node.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
    }
  }
}

function makeGearGeometry(radius: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const teeth = 10;
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.82;
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.32, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
}

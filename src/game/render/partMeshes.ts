import * as THREE from 'three';
import type { PartKind, Placement } from '@/types';
import { PARTS } from '@/game/config/parts';
import { PALETTE } from '@/game/config/palette';

/**
 * 7 パーツの 3D モデルを コードで つくる。
 * 外部の 3D アセットは つかわない。
 *
 * シミュレーションは z = 0 の へいめんだけなので、
 * 見た目の おくゆきは この DEPTH ぶんだけ ぜんご に のばす。
 */
export const PART_DEPTH = 1.4;
export const TERRAIN_DEPTH = 1.7;

export interface PartVisualState {
  time: number;
  /** ドミノの かたむき（ラジアン） */
  lean?: number;
  /** ふりこの 角度（ラジアン） */
  theta?: number;
  /** そうちが うごいているか */
  running: boolean;
}

export interface PartVisual {
  group: THREE.Group;
  update(state: PartVisualState): void;
  dispose(): void;
}

function standard(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.06, ...extra });
}

function boxMesh(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
): THREE.Mesh<THREE.BoxGeometry, THREE.Material> {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function collectDisposables(group: THREE.Group): () => void {
  return () => {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
  };
}

function staticVisual(group: THREE.Group): PartVisual {
  return { group, update: () => {}, dispose: collectDisposables(group) };
}

export function createPartVisual(kind: PartKind, placement: Placement): PartVisual {
  const visual = buildVisual(kind);
  visual.group.position.set(placement.x, placement.y, 0);
  visual.group.rotation.z = placement.angle;
  return visual;
}

function buildVisual(kind: PartKind): PartVisual {
  switch (kind) {
    case 'plate':
      return buildPlate();
    case 'spring':
      return buildSpring();
    case 'fan':
      return buildFan();
    case 'conveyor':
      return buildConveyor();
    case 'domino':
      return buildDomino();
    case 'pipe':
      return buildPipe();
    case 'hammer':
      return buildHammer();
  }
}

function buildPlate(): PartVisual {
  const config = PARTS.plate;
  const group = new THREE.Group();
  const body = boxMesh(config.size.x, config.size.y, PART_DEPTH, standard(config.color));
  group.add(body);

  const rimMaterial = standard(config.accent);
  for (const sign of [-1, 1]) {
    const cap = boxMesh(0.14, config.size.y + 0.08, PART_DEPTH + 0.06, rimMaterial);
    cap.position.x = (sign * config.size.x) / 2;
    group.add(cap);
  }
  // き の もくめ
  const grainMaterial = standard(config.accent, { roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const grain = boxMesh(config.size.x * 0.82, 0.03, 0.02, grainMaterial);
    grain.position.set(0, i * 0.06, PART_DEPTH / 2 + 0.01);
    group.add(grain);
  }
  return staticVisual(group);
}

function buildSpring(): PartVisual {
  const config = PARTS.spring;
  const group = new THREE.Group();
  const base = boxMesh(config.size.x, 0.16, PART_DEPTH, standard(config.accent));
  base.position.y = -config.size.y / 2 + 0.08;
  group.add(base);

  const coilMaterial = standard(config.color, { metalness: 0.25, roughness: 0.45 });
  const coils = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 6, 14), coilMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -config.size.y / 2 + 0.18 + i * 0.09;
    coils.add(ring);
  }
  group.add(coils);

  const top = boxMesh(config.size.x, 0.14, PART_DEPTH, standard(config.color));
  top.position.y = config.size.y / 2 - 0.07;
  group.add(top);

  let squash = 0;
  return {
    group,
    update: (state) => {
      // まっている あいだ ゆっくり ふるえる
      squash = state.running ? Math.sin(state.time * 7) * 0.06 : 0;
      coils.scale.y = 1 + squash;
      top.position.y = config.size.y / 2 - 0.07 + squash * 0.12;
    },
    dispose: collectDisposables(group),
  };
}

function buildFan(): PartVisual {
  const config = PARTS.fan;
  const group = new THREE.Group();
  const housing = boxMesh(config.size.x, config.size.y, PART_DEPTH, standard(config.accent));
  group.add(housing);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.07, 8, 20),
    standard(config.color, { metalness: 0.2 }),
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.x = config.size.x / 2;
  group.add(ring);

  const blades = new THREE.Group();
  blades.position.x = config.size.x / 2;
  const bladeMaterial = standard(PALETTE.uiPaper);
  for (let i = 0; i < 4; i++) {
    const blade = boxMesh(0.05, 0.6, 0.16, bladeMaterial);
    blade.rotation.x = (i * Math.PI) / 2;
    blades.add(blade);
  }
  group.add(blades);

  // かぜの むきを しめす やじるし
  const arrowMaterial = standard(config.color, { emissive: config.color, emissiveIntensity: 0.25 });
  const arrows: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 8), arrowMaterial);
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(config.size.x / 2 + 0.5 + i * 0.55, 0, 0);
    arrows.push(arrow);
    group.add(arrow);
  }

  return {
    group,
    update: (state) => {
      blades.rotation.x = state.running ? state.time * 14 : state.time * 2;
      arrows.forEach((arrow, i) => {
        const phase = (state.time * 1.6 + i * 0.33) % 1;
        arrow.scale.setScalar(0.65 + 0.35 * Math.sin(phase * Math.PI));
      });
    },
    dispose: collectDisposables(group),
  };
}

function buildConveyor(): PartVisual {
  const config = PARTS.conveyor;
  const group = new THREE.Group();
  const frame = boxMesh(config.size.x - 0.3, config.size.y * 0.7, PART_DEPTH * 0.7, standard(config.color));
  group.add(frame);

  const rollerMaterial = standard(config.accent, { metalness: 0.3, roughness: 0.4 });
  for (const sign of [-1, 1]) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(config.size.y / 2, config.size.y / 2, PART_DEPTH, 14),
      rollerMaterial,
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.x = (sign * (config.size.x - config.size.y)) / 2;
    group.add(roller);
  }

  const beltMaterial = standard(0x2f333d, { roughness: 0.85 });
  for (const sign of [-1, 1]) {
    const belt = boxMesh(config.size.x - config.size.y, 0.07, PART_DEPTH, beltMaterial);
    belt.position.y = (sign * config.size.y) / 2 - sign * 0.035;
    group.add(belt);
  }

  // ベルトが うごいて みえる しるし
  const marks: THREE.Mesh[] = [];
  const markMaterial = standard(config.accent, { emissive: config.accent, emissiveIntensity: 0.2 });
  const span = config.size.x - config.size.y;
  for (let i = 0; i < 5; i++) {
    const mark = boxMesh(0.12, 0.05, PART_DEPTH * 0.8, markMaterial);
    mark.position.set(-span / 2 + (i * span) / 5, config.size.y / 2 + 0.02, 0);
    marks.push(mark);
    group.add(mark);
  }

  return {
    group,
    update: (state) => {
      const speed = state.running ? 2.4 : 0.5;
      marks.forEach((mark, i) => {
        const t = ((state.time * speed + i / marks.length) % 1) - 0.5;
        mark.position.x = t * span;
      });
    },
    dispose: collectDisposables(group),
  };
}

function buildDomino(): PartVisual {
  const config = PARTS.domino;
  const group = new THREE.Group();
  // 支点は そこ。lean にあわせて そこを 中心に かたむける
  const pivot = new THREE.Group();
  pivot.position.y = -config.size.y / 2;
  group.add(pivot);

  const body = boxMesh(config.size.x, config.size.y, PART_DEPTH * 0.55, standard(config.color));
  body.position.y = config.size.y / 2;
  pivot.add(body);

  const dotMaterial = standard(PALETTE.uiPaper);
  for (const offset of [-0.22, 0.22]) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), dotMaterial);
    dot.position.set(0, config.size.y / 2 + offset, (PART_DEPTH * 0.55) / 2 + 0.005);
    pivot.add(dot);
  }

  return {
    group,
    update: (state) => {
      pivot.rotation.z = -(state.lean ?? 0);
    },
    dispose: collectDisposables(group),
  };
}

function buildPipe(): PartVisual {
  const config = PARTS.pipe;
  const group = new THREE.Group();
  const points = config.pipe.path.map((p) => new THREE.Vector3(p.x, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);

  const outer = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, config.pipe.radius + 0.09, 14, false),
    standard(config.color, { metalness: 0.2, side: THREE.DoubleSide }),
  );
  group.add(outer);

  const inner = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, config.pipe.radius - 0.02, 14, false),
    standard(0x2a2f3a, { side: THREE.BackSide, roughness: 0.95 }),
  );
  group.add(inner);

  // 入口・出口の わっか。どこに いれるか わかりやすくする
  const entry = config.pipe.path[0];
  const exit = config.pipe.path[config.pipe.path.length - 1];
  const mouthMaterial = standard(config.accent, { emissive: config.accent, emissiveIntensity: 0.3 });
  const entryRing = new THREE.Mesh(
    new THREE.TorusGeometry(config.pipe.radius + 0.11, 0.06, 8, 18),
    mouthMaterial,
  );
  entryRing.position.set(entry.x, entry.y, 0);
  entryRing.rotation.x = Math.PI / 2;
  group.add(entryRing);

  const exitRing = new THREE.Mesh(
    new THREE.TorusGeometry(config.pipe.radius + 0.11, 0.06, 8, 18),
    standard(config.accent),
  );
  exitRing.position.set(exit.x, exit.y, 0);
  exitRing.rotation.y = Math.PI / 2;
  group.add(exitRing);

  return {
    group,
    update: (state) => {
      const pulse = 1 + Math.sin(state.time * 4) * 0.06;
      entryRing.scale.set(pulse, pulse, 1);
    },
    dispose: collectDisposables(group),
  };
}

function buildHammer(): PartVisual {
  const config = PARTS.hammer;
  const group = new THREE.Group();

  const mount = boxMesh(config.size.x, config.size.y, PART_DEPTH * 0.8, standard(config.accent));
  group.add(mount);

  const pivot = new THREE.Group();
  group.add(pivot);

  const arm = boxMesh(0.12, config.hammer.armLength, 0.12, standard(0x8b8f9a, { metalness: 0.4 }));
  arm.position.y = -config.hammer.armLength / 2;
  pivot.add(arm);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(config.hammer.headRadius, 16, 12),
    standard(config.color, { metalness: 0.25 }),
  );
  head.position.y = -config.hammer.armLength;
  pivot.add(head);

  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(config.hammer.headRadius * 0.82, 0.045, 8, 18),
    standard(PALETTE.uiPaper),
  );
  stripe.position.y = -config.hammer.armLength;
  stripe.rotation.y = Math.PI / 2;
  pivot.add(stripe);

  return {
    group,
    update: (state) => {
      // 物理の PendulumHammer は あたまを pivot + L*(sin θ, -cos θ) に おく。
      // こどもの pivot は ローカル -Y に あるので、そのまま +θ で まわすと 一致する。
      pivot.rotation.z = state.theta ?? 0;
    },
    dispose: collectDisposables(group),
  };
}

/** トレイや ずかんで つかう ちいさな プレビュー */
export function createPreviewVisual(kind: PartKind): PartVisual {
  return buildVisual(kind);
}

export { standard as partMaterial, boxMesh as partBox };

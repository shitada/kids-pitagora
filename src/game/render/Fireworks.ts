import * as THREE from 'three';
import { PALETTE } from '@/game/config/palette';

interface Burst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

const BURST_COLORS = [
  PALETTE.coin,
  PALETTE.ball,
  PALETTE.spring,
  PALETTE.fan,
  PALETTE.domino,
  PALETTE.uiPaper,
];

/**
 * ぜん 15 ステージ クリアの はなび。
 * ぶつり コアとは かんけいのない、みための えんしゅつ だけ。
 */
export class Fireworks {
  private readonly root = new THREE.Group();
  private bursts: Burst[] = [];
  private timer = 0;
  private active = false;
  private spawnIndex = 0;

  constructor(parent: THREE.Group) {
    parent.add(this.root);
  }

  start(): void {
    this.active = true;
    this.timer = 0;
    this.spawnIndex = 0;
  }

  stop(): void {
    this.active = false;
    for (const burst of this.bursts) this.disposeBurst(burst);
    this.bursts = [];
  }

  get running(): boolean {
    return this.active;
  }

  update(dt: number): void {
    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0.42;
        this.spawn();
      }
    }

    for (const burst of [...this.bursts]) {
      burst.life -= dt;
      const positions = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        burst.velocities[i + 1] -= 4.2 * dt;
        array[i] += burst.velocities[i] * dt;
        array[i + 1] += burst.velocities[i + 1] * dt;
        array[i + 2] += burst.velocities[i + 2] * dt;
      }
      positions.needsUpdate = true;
      const material = burst.points.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, burst.life / burst.maxLife);
      if (burst.life <= 0) {
        this.root.remove(burst.points);
        this.disposeBurst(burst);
        this.bursts = this.bursts.filter((b) => b !== burst);
      }
    }
  }

  private spawn(): void {
    // けっていろんてきな ならびで はなびを あげる（ランダムでも よいが みやすさ ゆうせん）
    const slots: Array<[number, number]> = [
      [-5.5, 3.2],
      [0, 4.6],
      [5.5, 3.0],
      [-2.8, 1.8],
      [3.2, 2.2],
    ];
    const [x, y] = slots[this.spawnIndex % slots.length];
    const color = BURST_COLORS[this.spawnIndex % BURST_COLORS.length];
    this.spawnIndex++;

    const count = 90;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const ring = 0.6 + (i % 3) * 0.35;
      const speed = 3.2 + (i % 5) * 0.55;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 1.5;
      velocities[i * 3] = Math.cos(angle) * speed * ring;
      velocities[i * 3 + 1] = Math.sin(angle) * speed * ring;
      velocities[i * 3 + 2] = Math.cos(angle * 3) * 0.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.24,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    this.root.add(points);
    this.bursts.push({ points, velocities, life: 1.7, maxLife: 1.7 });
  }

  private disposeBurst(burst: Burst): void {
    burst.points.geometry.dispose();
    (burst.points.material as THREE.PointsMaterial).dispose();
  }
}

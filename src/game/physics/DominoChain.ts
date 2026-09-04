import type { SurfaceMaterial, Vec2Like } from '@/types';
import {
  DOMINO_GRAVITY,
  DOMINO_KICK_OMEGA,
  DOMINO_MAX_LEAN,
  DOMINO_TRIGGER_LEAN,
} from '@/game/config/physics';
import { obb, type ObbShape } from './colliders';

/**
 * ドミノ 1 まい。
 *
 * 支点を そこに 固定した 1 自由度の 剛体棒として あつかう。
 * lean は「まっすぐ立っている状態から どれだけ かたむいたか」。
 * lean > 0 で +X 方向へ たおれる。
 */
export class DominoBody {
  readonly id: string;
  readonly baseX: number;
  readonly baseY: number;
  readonly height: number;
  readonly halfThickness: number;
  readonly chainReach: number;
  readonly transfer: number;
  readonly material: SurfaceMaterial;

  lean = 0;
  omega = 0;
  /** となりを たおす きっかけを もう わたしたか */
  hasChained = false;

  constructor(params: {
    id: string;
    baseX: number;
    baseY: number;
    height: number;
    halfThickness: number;
    chainReach: number;
    transfer: number;
    material?: SurfaceMaterial;
    /** 立てるときの ごくわずかな かたむき（連鎖の むきを きめる） */
    initialLean?: number;
  }) {
    this.id = params.id;
    this.baseX = params.baseX;
    this.baseY = params.baseY;
    this.height = params.height;
    this.halfThickness = params.halfThickness;
    this.chainReach = params.chainReach;
    this.transfer = params.transfer;
    this.material = params.material ?? 'wood';
    this.lean = params.initialLean ?? 0;
  }

  get isFalling(): boolean {
    return Math.abs(this.lean) > 1e-4 || Math.abs(this.omega) > 1e-4;
  }

  get isDown(): boolean {
    return Math.abs(this.lean) >= DOMINO_MAX_LEAN - 1e-6;
  }

  /** 先端（てっぺん）の いち */
  tip(): Vec2Like {
    return {
      x: this.baseX + this.height * Math.sin(this.lean),
      y: this.baseY + this.height * Math.cos(this.lean),
    };
  }

  /** 当たり判定の OBB。ローカル +Y 軸が ドミノの長手方向 */
  shape(): ObbShape {
    const half = this.height * 0.5;
    return obb(
      this.baseX + half * Math.sin(this.lean),
      this.baseY + half * Math.cos(this.lean),
      this.halfThickness,
      half,
      -this.lean,
    );
  }

  /** 回転による ある点の速度 */
  pointVelocity(x: number, y: number): Vec2Like {
    const rx = x - this.baseX;
    const ry = y - this.baseY;
    return { x: this.omega * ry, y: -this.omega * rx };
  }

  /** 重力トルクで かたむきを すすめる */
  step(dt: number): void {
    if (this.isDown) {
      this.lean = Math.sign(this.lean) * DOMINO_MAX_LEAN;
      this.omega = 0;
      return;
    }
    if (!this.isFalling) return;
    // 支点まわりに まわる細長い棒: alpha = (3g / 2L) * sin(lean)
    const alpha = ((3 * DOMINO_GRAVITY) / (2 * this.height)) * Math.sin(this.lean);
    this.omega += alpha * dt;
    this.lean += this.omega * dt;
    if (Math.abs(this.lean) >= DOMINO_MAX_LEAN) {
      this.lean = Math.sign(this.lean) * DOMINO_MAX_LEAN;
      this.omega = 0;
    }
  }

  /** そとから たおす きっかけを あたえる */
  push(direction: number, strength = DOMINO_KICK_OMEGA): boolean {
    if (this.isDown) return false;
    const sign = direction >= 0 ? 1 : -1;
    if (this.isFalling && Math.sign(this.lean || sign) !== sign) return false;
    const target = sign * Math.abs(strength);
    if (Math.abs(this.omega) >= Math.abs(target) && Math.sign(this.omega) === sign) return false;
    this.omega = target;
    if (Math.abs(this.lean) < 1e-4) this.lean = sign * 1e-3;
    return true;
  }
}

/**
 * ドミノの れんさを 進める。
 *
 * たおれかけた ドミノの 先端が となりの ドミノに とどいたら、
 * となりにも たおれる きっかけを わたす。
 * ドミノどうしは 物理的に ぶつからない（もたれ合わない）ので 決定論的で 安定する。
 */
export function stepDominoes(dominoes: readonly DominoBody[], dt: number): DominoBody[] {
  const newlyToppled: DominoBody[] = [];
  for (const d of dominoes) {
    const wasDown = d.isDown;
    d.step(dt);
    if (!wasDown && d.isDown) newlyToppled.push(d);
  }

  for (const source of dominoes) {
    if (source.hasChained) continue;
    if (Math.abs(source.lean) < DOMINO_TRIGGER_LEAN) continue;
    const direction = Math.sign(source.lean);
    const tip = source.tip();
    let chained = false;
    for (const target of dominoes) {
      if (target === source || target.isFalling) continue;
      const dx = target.baseX - source.baseX;
      // たおれる むきに ある ドミノだけを たおす
      if (Math.sign(dx) !== direction || Math.abs(dx) < 1e-6) continue;
      const reach = Math.hypot(tip.x - target.baseX, tip.y - target.baseY);
      if (reach > source.chainReach) continue;
      if (Math.abs(target.baseY - source.baseY) > source.height * 0.6) continue;
      if (target.push(direction, DOMINO_KICK_OMEGA * source.transfer)) chained = true;
    }
    if (chained) source.hasChained = true;
  }

  return newlyToppled;
}

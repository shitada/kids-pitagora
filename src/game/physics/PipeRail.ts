import type { Vec2Like } from '@/types';

/**
 * パイプの中心線レール。
 *
 * ガイド方式: ボールが入口に入ったら レール上の 位置 s を進める。
 * 重力の接線成分で 速さが かわるので「下り坂の管は はやくなる」感覚は のこる。
 * ぶつかって 詰まることが ないので 子供でも かならず とおりぬけられる。
 */
export class PipeRail {
  readonly id: string;
  readonly points: readonly Vec2Like[];
  readonly cumulative: readonly number[];
  readonly totalLength: number;
  readonly radius: number;
  readonly mouthRadius: number;
  readonly minSpeed: number;

  constructor(params: {
    id: string;
    points: readonly Vec2Like[];
    radius: number;
    mouthRadius: number;
    minSpeed: number;
  }) {
    if (params.points.length < 2) {
      throw new Error(`PipeRail "${params.id}" needs at least 2 points`);
    }
    this.id = params.id;
    this.points = params.points;
    this.radius = params.radius;
    this.mouthRadius = params.mouthRadius;
    this.minSpeed = params.minSpeed;

    const cumulative: number[] = [0];
    let total = 0;
    for (let i = 1; i < params.points.length; i++) {
      const a = params.points[i - 1];
      const b = params.points[i];
      total += Math.hypot(b.x - a.x, b.y - a.y);
      cumulative.push(total);
    }
    this.cumulative = cumulative;
    this.totalLength = total;
  }

  get entry(): Vec2Like {
    return this.points[0];
  }

  get exit(): Vec2Like {
    return this.points[this.points.length - 1];
  }

  /** レール上の きょり s における位置 */
  pointAt(s: number): Vec2Like {
    const t = Math.max(0, Math.min(this.totalLength, s));
    const i = this.segmentIndexAt(t);
    const a = this.points[i];
    const b = this.points[i + 1];
    const segStart = this.cumulative[i];
    const segLen = this.cumulative[i + 1] - segStart;
    const k = segLen < 1e-9 ? 0 : (t - segStart) / segLen;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  /** レール上の きょり s における単位接線ベクトル（入口 → 出口 むき） */
  tangentAt(s: number): Vec2Like {
    const t = Math.max(0, Math.min(this.totalLength, s));
    const i = this.segmentIndexAt(t);
    const a = this.points[i];
    const b = this.points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return { x: 1, y: 0 };
    return { x: dx / len, y: dy / len };
  }

  private segmentIndexAt(t: number): number {
    for (let i = 0; i < this.cumulative.length - 1; i++) {
      if (t <= this.cumulative[i + 1]) return i;
    }
    return this.points.length - 2;
  }

  /**
   * 入口に すいこまれるか どうか。
   * 入口の近くにいて、進行方向が 管のむきと おおむね あっていれば すいこむ。
   */
  shouldCapture(x: number, y: number, vx: number, vy: number): boolean {
    const entry = this.entry;
    const dist = Math.hypot(x - entry.x, y - entry.y);
    if (dist > this.mouthRadius) return false;
    const tangent = this.tangentAt(0);
    const speed = Math.hypot(vx, vy);
    if (speed < 1e-6) return true;
    return (vx * tangent.x + vy * tangent.y) / speed > -0.35;
  }

  /** 中心線を あらわす線分（当たり判定・描画用） */
  segments(): Array<{ a: Vec2Like; b: Vec2Like }> {
    const out: Array<{ a: Vec2Like; b: Vec2Like }> = [];
    for (let i = 1; i < this.points.length; i++) {
      out.push({ a: this.points[i - 1], b: this.points[i] });
    }
    return out;
  }
}

/**
 * 基準姿勢のパスを 配置位置・角度に あわせて ワールド座標へ うつす。
 */
export function transformPath(
  path: readonly Vec2Like[],
  originX: number,
  originY: number,
  angle: number,
): Vec2Like[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return path.map((p) => ({
    x: originX + (p.x * cos - p.y * sin),
    y: originY + (p.x * sin + p.y * cos),
  }));
}

import type { Vec2Like } from '@/types';
import { circle, type CircleShape } from './colliders';

/**
 * ふりこハンマー。
 *
 * 正弦で駆動する運動学モデル: theta(t) = amplitude * sin(2*PI*t/period + phase)
 * 完全に しゅうきてき なので、子供が「つぎに ここへ くる」と よそくできる。
 * エネルギーが へらないので ステージの さいげんせいも たもてる。
 */
export class PendulumHammer {
  readonly id: string;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly armLength: number;
  readonly headRadius: number;
  readonly amplitude: number;
  readonly periodSec: number;
  readonly phase: number;

  /** 真下を 0 とした ふりこの角度 */
  theta = 0;
  omega = 0;

  constructor(params: {
    id: string;
    pivotX: number;
    pivotY: number;
    armLength: number;
    headRadius: number;
    amplitude: number;
    periodSec: number;
    phase?: number;
  }) {
    this.id = params.id;
    this.pivotX = params.pivotX;
    this.pivotY = params.pivotY;
    this.armLength = params.armLength;
    this.headRadius = params.headRadius;
    this.amplitude = params.amplitude;
    this.periodSec = Math.max(0.2, params.periodSec);
    this.phase = params.phase ?? 0;
    this.setTime(0);
  }

  /** 経過時間から 角度と角速度を きめる（積分ごさが たまらない） */
  setTime(time: number): void {
    const w = (Math.PI * 2) / this.periodSec;
    this.theta = this.amplitude * Math.sin(w * time + this.phase);
    this.omega = this.amplitude * w * Math.cos(w * time + this.phase);
  }

  /** ハンマーの あたまの いち。theta = 0 で 真下 */
  headPosition(): Vec2Like {
    return {
      x: this.pivotX + this.armLength * Math.sin(this.theta),
      y: this.pivotY - this.armLength * Math.cos(this.theta),
    };
  }

  /** ハンマーの あたまの 速度 */
  headVelocity(): Vec2Like {
    return {
      x: this.armLength * this.omega * Math.cos(this.theta),
      y: this.armLength * this.omega * Math.sin(this.theta),
    };
  }

  shape(): CircleShape {
    const head = this.headPosition();
    return circle(head.x, head.y, this.headRadius);
  }
}

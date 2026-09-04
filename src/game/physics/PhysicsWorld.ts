import type { StageBounds, SurfaceMaterial, Vec2Like } from '@/types';
import {
  AIR_DRAG,
  BALL_RADIUS,
  BALL_RESTITUTION,
  DOMINO_PUSH_SPEED,
  FIXED_DT,
  GRAVITY_Y,
  MAX_SPEED,
  PENETRATION_CORRECTION,
  PENETRATION_SLOP,
  PIPE_COOLDOWN_TICKS,
  PIPE_MAX_SPEED,
  REST_SPEED,
  RESTITUTION,
  RESTITUTION_CUTOFF,
  ROLLING_RESISTANCE,
  SPRING_COOLDOWN_TICKS,
  TANGENT_FRICTION,
} from '@/game/config/physics';
import { circleVsShape, toObbLocal, type ColliderShape, type ObbShape } from './colliders';
import { DominoBody, stepDominoes } from './DominoChain';
import { PendulumHammer } from './Pendulum';
import { PipeRail } from './PipeRail';

export interface PhysicsCollider {
  id: string;
  shape: ColliderShape;
  material: SurfaceMaterial;
  /** ベルトコンベアの ベルト表面速度 */
  surfaceVelocity?: Vec2Like;
  /** 接触点における速度を返す（ドミノ・ふりこハンマー） */
  pointVelocity?: (x: number, y: number) => Vec2Like;
  /** 法線方向に 保証する打ち出し速度（ジャンプだい） */
  launchSpeed?: number;
  /** 接線方向を 表面速度に あわせる はやさ（1/秒）。ベルトコンベアで大きくする */
  grip?: number;
  /** 由来した配置パーツの ID */
  sourceId?: string;
}

export interface ForceField {
  id: string;
  region: ObbShape;
  /** 力のむき（単位ベクトル） */
  dirX: number;
  dirY: number;
  /** 加速度の大きさ（m/s^2） */
  strength: number;
  /** ローカル +X 方向に すすむほど よわくなる わりあい（0〜1） */
  falloff: number;
  sourceId?: string;
}

export interface PhysicsBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  /** 見た目の ころがり回転（ラジアン） */
  spin: number;
  /** REST_SPEED より おそい状態が つづいた tick 数 */
  restTicks: number;
  guide: { pipeId: string; s: number; speed: number } | null;
  pipeCooldown: number;
  springCooldown: number;
  /** この tick に なにかに ふれていたか（ころがり音用） */
  touching: boolean;
  touchingMaterial: SurfaceMaterial | null;
}

export type PhysicsEvent =
  | { type: 'impact'; material: SurfaceMaterial; speed: number; x: number; y: number }
  | { type: 'spring'; x: number; y: number }
  | { type: 'pipe-enter'; x: number; y: number }
  | { type: 'pipe-exit'; x: number; y: number }
  | { type: 'domino-topple'; x: number; y: number }
  | { type: 'hammer-hit'; x: number; y: number; speed: number }
  | { type: 'out-of-bounds'; ballId: string };

interface PendingContact {
  nx: number;
  ny: number;
  surfaceVx: number;
  surfaceVy: number;
  grip: number;
  material: SurfaceMaterial;
}

/**
 * 2.5D 固定平面ソルバー。
 *
 * - 見た目は 3D でも シミュレーションは z を固定した XY 平面だけ
 * - 固定タイムステップ（FIXED_DT）で 決定論的に すすむ
 * - Three.js を いっさい import しない。描画層が この結果を よむ
 */
export class PhysicsWorld {
  readonly bounds: StageBounds;
  readonly balls: PhysicsBall[] = [];
  readonly colliders: PhysicsCollider[] = [];
  readonly fields: ForceField[] = [];
  readonly pipes: PipeRail[] = [];
  readonly dominoes: DominoBody[] = [];
  readonly hammers: PendulumHammer[] = [];

  /** この tick に おきた できごと。描画・音の層が よんで つかう */
  events: PhysicsEvent[] = [];

  private ticks = 0;
  private dynamicColliders: PhysicsCollider[] = [];
  private readonly boundsMargin: number;

  constructor(bounds: StageBounds, boundsMargin = 2) {
    this.bounds = bounds;
    this.boundsMargin = boundsMargin;
  }

  get time(): number {
    return this.ticks * FIXED_DT;
  }

  get tickCount(): number {
    return this.ticks;
  }

  addBall(params: { id: string; x: number; y: number; radius?: number; vx?: number; vy?: number }): PhysicsBall {
    const ball: PhysicsBall = {
      id: params.id,
      x: params.x,
      y: params.y,
      vx: params.vx ?? 0,
      vy: params.vy ?? 0,
      radius: params.radius ?? BALL_RADIUS,
      active: true,
      spin: 0,
      restTicks: 0,
      guide: null,
      pipeCooldown: 0,
      springCooldown: 0,
      touching: false,
      touchingMaterial: null,
    };
    this.balls.push(ball);
    return ball;
  }

  addCollider(collider: PhysicsCollider): void {
    this.colliders.push(collider);
  }

  addField(field: ForceField): void {
    this.fields.push(field);
  }

  addPipe(pipe: PipeRail): void {
    this.pipes.push(pipe);
  }

  addDomino(domino: DominoBody): void {
    this.dominoes.push(domino);
  }

  addHammer(hammer: PendulumHammer): void {
    this.hammers.push(hammer);
  }

  /** すべてのボールが とまったか（ゴール・場外ふくむ） */
  allBallsSettled(restTicks: number): boolean {
    return this.balls.every((b) => !b.active || b.restTicks >= restTicks);
  }

  /** 固定ステップを 1 つ すすめる */
  step(): void {
    this.events = [];
    const dt = FIXED_DT;

    for (const hammer of this.hammers) hammer.setTime(this.time);

    const toppled = stepDominoes(this.dominoes, dt);
    for (const d of toppled) {
      const tip = d.tip();
      this.events.push({ type: 'domino-topple', x: tip.x, y: tip.y });
    }

    this.rebuildDynamicColliders();

    for (const ball of this.balls) {
      if (!ball.active) continue;
      if (ball.pipeCooldown > 0) ball.pipeCooldown--;
      if (ball.springCooldown > 0) ball.springCooldown--;
      if (ball.guide) {
        this.stepGuided(ball, dt);
      } else {
        this.stepFree(ball, dt);
      }
    }

    this.resolveBallPairs();
    this.ticks++;
  }

  // --- うちがわ ------------------------------------------------------------

  private rebuildDynamicColliders(): void {
    this.dynamicColliders = [];
    for (const d of this.dominoes) {
      this.dynamicColliders.push({
        id: `domino:${d.id}`,
        shape: d.shape(),
        material: d.material,
        pointVelocity: (x, y) => d.pointVelocity(x, y),
        sourceId: d.id,
      });
    }
    for (const h of this.hammers) {
      const velocity = h.headVelocity();
      this.dynamicColliders.push({
        id: `hammer:${h.id}`,
        shape: h.shape(),
        material: 'metal',
        surfaceVelocity: velocity,
        sourceId: h.id,
      });
    }
  }

  private stepGuided(ball: PhysicsBall, dt: number): void {
    const guide = ball.guide;
    if (!guide) return;
    const pipe = this.pipes.find((p) => p.id === guide.pipeId);
    if (!pipe) {
      ball.guide = null;
      return;
    }
    const tangent = pipe.tangentAt(guide.s);
    // 重力の接線成分。下りむきなら はやく、のぼりなら おそくなる
    guide.speed += GRAVITY_Y * tangent.y * dt;
    guide.speed = Math.max(pipe.minSpeed, Math.min(PIPE_MAX_SPEED, guide.speed));
    guide.s += guide.speed * dt;

    if (guide.s >= pipe.totalLength) {
      const exitTangent = pipe.tangentAt(pipe.totalLength);
      const exit = pipe.exit;
      ball.x = exit.x + exitTangent.x * (ball.radius * 0.5);
      ball.y = exit.y + exitTangent.y * (ball.radius * 0.5);
      ball.vx = exitTangent.x * guide.speed;
      ball.vy = exitTangent.y * guide.speed;
      ball.guide = null;
      ball.pipeCooldown = PIPE_COOLDOWN_TICKS;
      ball.touching = true;
      ball.touchingMaterial = 'metal';
      this.events.push({ type: 'pipe-exit', x: ball.x, y: ball.y });
      return;
    }

    const p = pipe.pointAt(guide.s);
    ball.x = p.x;
    ball.y = p.y;
    ball.vx = tangent.x * guide.speed;
    ball.vy = tangent.y * guide.speed;
    ball.spin += (guide.speed / ball.radius) * dt;
    ball.restTicks = 0;
    ball.touching = true;
    ball.touchingMaterial = 'metal';
  }

  private stepFree(ball: PhysicsBall, dt: number): void {
    ball.touching = false;
    ball.touchingMaterial = null;

    // 1. 重力
    ball.vy += GRAVITY_Y * dt;

    // 2. フォースフィールド（せんぷうき）
    for (const field of this.fields) {
      const local = toObbLocal(field.region, ball.x, ball.y);
      if (Math.abs(local.x) > field.region.hw || Math.abs(local.y) > field.region.hh) continue;
      const along = (local.x + field.region.hw) / (2 * field.region.hw);
      const attenuation = Math.max(0, 1 - field.falloff * along);
      ball.vx += field.dirX * field.strength * attenuation * dt;
      ball.vy += field.dirY * field.strength * attenuation * dt;
    }

    // 3. 空気抵抗
    const drag = Math.max(0, 1 - AIR_DRAG * dt);
    ball.vx *= drag;
    ball.vy *= drag;

    // 4. 速さの上限
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) {
      const s = MAX_SPEED / speed;
      ball.vx *= s;
      ball.vy *= s;
    }

    // 5. トンネリングを ふせぐため サブステップに わける
    const travel = Math.hypot(ball.vx, ball.vy) * dt;
    const maxStep = ball.radius * 0.4;
    const subSteps = Math.max(1, Math.min(12, Math.ceil(travel / Math.max(1e-6, maxStep))));
    const subDt = dt / subSteps;

    let pending: PendingContact | null = null;
    for (let i = 0; i < subSteps; i++) {
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;
      const contact = this.resolveContacts(ball);
      if (contact) pending = contact;
      if (this.tryEnterPipe(ball)) return;
    }

    // 6. 接触が つづいている あいだの ころがり／ベルトの ひきずり
    if (pending) {
      this.applyGrip(ball, pending, dt);
      ball.touching = true;
      ball.touchingMaterial = pending.material;
    }

    // 7. 見た目の回転
    ball.spin += (ball.vx / ball.radius) * dt;

    // 8. 停止判定
    const finalSpeed = Math.hypot(ball.vx, ball.vy);
    if (finalSpeed < REST_SPEED) {
      ball.restTicks++;
    } else {
      ball.restTicks = 0;
    }

    // 9. 場外判定
    if (
      ball.x < this.bounds.minX - this.boundsMargin ||
      ball.x > this.bounds.maxX + this.boundsMargin ||
      ball.y < this.bounds.minY - this.boundsMargin ||
      ball.y > this.bounds.maxY + this.boundsMargin
    ) {
      ball.active = false;
      this.events.push({ type: 'out-of-bounds', ballId: ball.id });
    }
  }

  /** いちばん深い接触を かえす */
  private resolveContacts(ball: PhysicsBall): PendingContact | null {
    let deepest: PendingContact | null = null;
    let deepestDepth = 0;

    // 2 回まわして 貫入を おさえる（角に はさまったときの ゆれを へらす）
    for (let iteration = 0; iteration < 2; iteration++) {
      for (const list of [this.colliders, this.dynamicColliders]) {
        for (const collider of list) {
          if (this.skipCollider(collider, ball)) continue;
          const contact = circleVsShape(collider.shape, ball.x, ball.y, ball.radius);
          if (!contact) continue;

          // 位置の ずれを なおす
          const correction = Math.max(0, contact.depth - PENETRATION_SLOP) * PENETRATION_CORRECTION;
          ball.x += contact.nx * correction;
          ball.y += contact.ny * correction;

          const surface =
            collider.surfaceVelocity ??
            collider.pointVelocity?.(contact.px, contact.py) ?? { x: 0, y: 0 };

          const relVx = ball.vx - surface.x;
          const relVy = ball.vy - surface.y;
          const vn = relVx * contact.nx + relVy * contact.ny;

          if (vn < 0) {
            const impactSpeed = -vn;
            const isRealImpact = impactSpeed > RESTITUTION_CUTOFF;
            const restitution = isRealImpact ? RESTITUTION[collider.material] : 0;
            const tangentX = relVx - contact.nx * vn;
            const tangentY = relVy - contact.ny * vn;
            // 接線の まさつは「ほんとうに ぶつかった」ときだけ。
            // せっしょく しつづけている あいだは applyGrip が うけもつ。
            const friction = isRealImpact ? 1 - TANGENT_FRICTION[collider.material] : 1;
            const newVn = -restitution * vn;
            ball.vx = surface.x + tangentX * friction + contact.nx * newVn;
            ball.vy = surface.y + tangentY * friction + contact.ny * newVn;

            if (impactSpeed > RESTITUTION_CUTOFF) {
              this.events.push({
                type: 'impact',
                material: collider.material,
                speed: impactSpeed,
                x: contact.px,
                y: contact.py,
              });
              if (collider.id.startsWith('hammer:')) {
                this.events.push({ type: 'hammer-hit', x: contact.px, y: contact.py, speed: impactSpeed });
              }
            }
          }

          if (collider.launchSpeed !== undefined && ball.springCooldown === 0) {
            const alongNormal = ball.vx * contact.nx + ball.vy * contact.ny;
            if (alongNormal < collider.launchSpeed) {
              const boost = collider.launchSpeed - alongNormal;
              ball.vx += contact.nx * boost;
              ball.vy += contact.ny * boost;
              ball.springCooldown = SPRING_COOLDOWN_TICKS;
              this.events.push({ type: 'spring', x: contact.px, y: contact.py });
            }
          }

          this.maybeToppleDomino(collider, ball, contact.nx);

          if (contact.depth >= deepestDepth) {
            deepestDepth = contact.depth;
            deepest = {
              nx: contact.nx,
              ny: contact.ny,
              surfaceVx: surface.x,
              surfaceVy: surface.y,
              grip: collider.grip ?? ROLLING_RESISTANCE,
              material: collider.material,
            };
          }
        }
      }
    }

    return deepest;
  }

  private skipCollider(collider: PhysicsCollider, ball: PhysicsBall): boolean {
    if (!collider.id.startsWith('pipe-wall:')) return false;
    // パイプの かべは 入口・出口の 近くでは きかせない（すいこみを じゃましない）
    const pipeId = collider.sourceId;
    const pipe = this.pipes.find((p) => p.id === pipeId);
    if (!pipe) return false;
    const nearEntry = Math.hypot(ball.x - pipe.entry.x, ball.y - pipe.entry.y) < pipe.mouthRadius * 1.3;
    const nearExit = Math.hypot(ball.x - pipe.exit.x, ball.y - pipe.exit.y) < pipe.mouthRadius * 1.3;
    return nearEntry || nearExit;
  }

  private maybeToppleDomino(collider: PhysicsCollider, ball: PhysicsBall, normalX: number): void {
    if (!collider.id.startsWith('domino:')) return;
    const domino = this.dominoes.find((d) => d.id === collider.sourceId);
    if (!domino || domino.isFalling) return;
    if (Math.abs(ball.vx) < DOMINO_PUSH_SPEED) return;
    // ボールが よこから おした ときだけ たおす（上から のっても たおれない）
    if (Math.abs(normalX) < 0.55) return;
    domino.push(-Math.sign(normalX));
  }

  private applyGrip(ball: PhysicsBall, contact: PendingContact, dt: number): void {
    const tx = -contact.ny;
    const ty = contact.nx;
    const ballT = ball.vx * tx + ball.vy * ty;
    const surfaceT = contact.surfaceVx * tx + contact.surfaceVy * ty;
    const rate = Math.min(1, contact.grip * dt);
    const newT = ballT + (surfaceT - ballT) * rate;
    const delta = newT - ballT;
    ball.vx += tx * delta;
    ball.vy += ty * delta;
  }

  private tryEnterPipe(ball: PhysicsBall): boolean {
    if (ball.pipeCooldown > 0 || ball.guide) return false;
    for (const pipe of this.pipes) {
      if (!pipe.shouldCapture(ball.x, ball.y, ball.vx, ball.vy)) continue;
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.guide = { pipeId: pipe.id, s: 0, speed: Math.max(pipe.minSpeed, speed) };
      const entry = pipe.entry;
      ball.x = entry.x;
      ball.y = entry.y;
      this.events.push({ type: 'pipe-enter', x: entry.x, y: entry.y });
      return true;
    }
    return false;
  }

  private resolveBallPairs(): void {
    for (let i = 0; i < this.balls.length; i++) {
      const a = this.balls[i];
      if (!a.active || a.guide) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b = this.balls[j];
        if (!b.active || b.guide) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist >= minDist || dist < 1e-9) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (minDist - dist) * 0.5;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relVn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relVn >= 0) continue;
        const impulse = -(1 + BALL_RESTITUTION) * relVn * 0.5;
        a.vx -= nx * impulse;
        a.vy -= ny * impulse;
        b.vx += nx * impulse;
        b.vy += ny * impulse;
        if (-relVn > 0.6) {
          this.events.push({ type: 'impact', material: 'rubber', speed: -relVn, x: a.x + nx * a.radius, y: a.y + ny * a.radius });
        }
      }
    }
  }
}

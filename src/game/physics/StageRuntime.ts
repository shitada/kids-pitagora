import type { Placement, SimEndReason, SimResult, StageConfig } from '@/types';
import {
  FIXED_DT,
  GOAL_ENTER_RATIO,
  MAX_SIM_SECONDS,
  REST_TICKS,
} from '@/game/config/physics';
import { buildWorld } from '@/game/parts/PartRegistry';
import type { PhysicsEvent, PhysicsWorld } from './PhysicsWorld';

export type RuntimeStatus = 'running' | 'cleared' | 'failed';

export type RuntimeEvent =
  | PhysicsEvent
  | { type: 'coin'; coinId: string; x: number; y: number }
  | { type: 'goal'; goalId: string; ballId: string; x: number; y: number }
  | { type: 'clear' }
  | { type: 'fail'; reason: SimEndReason };

/**
 * 物理ワールドの うえに ステージのルール（ゴール・★コイン・クリア判定）を のせる層。
 *
 * 描画にも テストにも 同じ この層を つかうので、
 * 「テストで クリアできる配置は 本番でも かならず クリアできる」ことが 保証される。
 */
export class StageRuntime {
  readonly stage: StageConfig;
  readonly placements: readonly Placement[];
  readonly world: PhysicsWorld;

  events: RuntimeEvent[] = [];

  private readonly collectedCoins = new Set<string>();
  private readonly filledGoals = new Map<string, string>();
  private readonly freeplay: boolean;
  private statusValue: RuntimeStatus = 'running';
  private endReasonValue: SimEndReason = 'timeout';

  constructor(stage: StageConfig, placements: readonly Placement[], options: { freeplay?: boolean } = {}) {
    this.stage = stage;
    this.placements = placements;
    this.freeplay = options.freeplay === true;
    this.world = buildWorld(stage, placements);
  }

  get status(): RuntimeStatus {
    return this.statusValue;
  }

  get finished(): boolean {
    return this.statusValue !== 'running';
  }

  get coinsCollected(): string[] {
    return [...this.collectedCoins];
  }

  get allCoins(): boolean {
    return this.stage.coins.every((coin) => this.collectedCoins.has(coin.id));
  }

  get seconds(): number {
    return this.world.tickCount * FIXED_DT;
  }

  goalBall(goalId: string): string | undefined {
    return this.filledGoals.get(goalId);
  }

  /** 固定ステップを 1 つ すすめる */
  step(): void {
    if (this.finished) {
      this.events = [];
      return;
    }

    this.world.step();
    this.events = [...this.world.events];

    this.collectCoins();
    this.checkGoals();
    this.checkFailure();
  }

  /** おわるまで まわす（テストと リプレイ用） */
  run(maxSeconds = MAX_SIM_SECONDS): void {
    const maxTicks = Math.ceil(maxSeconds / FIXED_DT);
    while (!this.finished && this.world.tickCount < maxTicks) {
      this.step();
    }
    if (!this.finished) {
      this.statusValue = 'failed';
      this.endReasonValue = 'timeout';
    }
  }

  result(): SimResult {
    const cleared = this.statusValue === 'cleared';
    const usedParts = this.placements.length;
    const allCoins = this.allCoins;
    let stars = 0;
    if (cleared) {
      stars = 1;
      if (usedParts <= this.stage.parPartCount) stars++;
      if (allCoins) stars++;
    }
    return {
      cleared,
      coinsCollected: this.coinsCollected,
      allCoins,
      usedParts,
      stars,
      ticks: this.world.tickCount,
      seconds: this.seconds,
      endReason: cleared ? 'cleared' : this.endReasonValue,
    };
  }

  // --- うちがわ ------------------------------------------------------------

  private collectCoins(): void {
    for (const coin of this.stage.coins) {
      if (this.collectedCoins.has(coin.id)) continue;
      for (const ball of this.world.balls) {
        if (!ball.active) continue;
        const dist = Math.hypot(ball.x - coin.x, ball.y - coin.y);
        if (dist > coin.radius + ball.radius) continue;
        this.collectedCoins.add(coin.id);
        this.events.push({ type: 'coin', coinId: coin.id, x: coin.x, y: coin.y });
        break;
      }
    }
  }

  private checkGoals(): void {
    for (const goal of this.stage.goals) {
      if (this.filledGoals.has(goal.id)) continue;
      for (const ball of this.world.balls) {
        if (!ball.active) continue;
        if (goal.acceptsBallId && goal.acceptsBallId !== ball.id) continue;
        const dist = Math.hypot(ball.x - goal.x, ball.y - goal.y);
        if (dist > goal.radius * GOAL_ENTER_RATIO) continue;
        this.filledGoals.set(goal.id, ball.id);
        ball.active = false;
        this.events.push({ type: 'goal', goalId: goal.id, ballId: ball.id, x: goal.x, y: goal.y });
        break;
      }
    }

    if (this.stage.goals.length > 0 && this.filledGoals.size >= this.stage.goals.length) {
      this.statusValue = 'cleared';
      this.endReasonValue = 'cleared';
      this.events.push({ type: 'clear' });
    }
  }

  private checkFailure(): void {
    if (this.finished || this.freeplay) return;

    const activeBalls = this.world.balls.filter((b) => b.active);
    const remainingGoals = this.stage.goals.length - this.filledGoals.size;

    if (activeBalls.length < remainingGoals) {
      this.fail('out-of-bounds');
      return;
    }

    if (activeBalls.length === 0) {
      this.fail('out-of-bounds');
      return;
    }

    if (activeBalls.every((b) => !b.guide && b.restTicks >= REST_TICKS)) {
      this.fail('settled');
      return;
    }

    if (this.seconds >= MAX_SIM_SECONDS) {
      this.fail('timeout');
    }
  }

  private fail(reason: SimEndReason): void {
    this.statusValue = 'failed';
    this.endReasonValue = reason;
    this.events.push({ type: 'fail', reason });
  }
}

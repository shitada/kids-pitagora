import { describe, it, expect } from 'vitest';
import type { StageConfig } from '@/types';
import { STAGES } from '@/game/config/stages';
import { simulateSolution, simulateStage } from '@/game/physics/simulate';

/**
 * このプロジェクトで いちばん だいじな テスト。
 *
 * 物理エンジンが 決定論的なので、「そうていかい（solution）で ★3 が とれる」ことを
 * じどうで 検証できる。ステージや 物理パラメータを いじって ここが おちたら、
 * ステージの かたちを なおすか そうていかいを つくりなおすこと。
 * テストを ゆるめて にげない。
 */
describe('every stage is solvable with 3 stars', () => {
  it.each(STAGES.map((stage) => [stage.id, stage] as [string, StageConfig]))(
    '%s clears with its authored solution and earns 3 stars',
    (_id, stage) => {
      const result = simulateSolution(stage);
      expect(result.endReason).toBe('cleared');
      expect(result.cleared).toBe(true);
      expect(result.usedParts).toBeLessThanOrEqual(stage.parPartCount);
      expect(result.coinsCollected).toHaveLength(stage.coins.length);
      expect(result.allCoins).toBe(true);
      expect(result.stars).toBe(3);
    },
  );
});

describe('stages are not trivially clearable', () => {
  it.each(STAGES.map((stage) => [stage.id, stage] as [string, StageConfig]))(
    '%s cannot be cleared with no parts at all',
    (_id, stage) => {
      const result = simulateStage(stage, []);
      expect(result.cleared).toBe(false);
      expect(result.stars).toBe(0);
    },
  );
});

describe('simulation is deterministic and bounded', () => {
  it('produces identical results for the same input', () => {
    for (const stage of STAGES) {
      const a = simulateSolution(stage);
      const b = simulateSolution(stage);
      expect(a).toEqual(b);
    }
  });

  it('always terminates within the cutoff', () => {
    for (const stage of STAGES) {
      const result = simulateSolution(stage);
      expect(result.seconds).toBeLessThanOrEqual(30.01);
      expect(result.ticks).toBeGreaterThan(0);
    }
  });

  it('solves quickly enough to keep the suite fast', () => {
    const started = Date.now();
    for (const stage of STAGES) simulateSolution(stage);
    expect(Date.now() - started).toBeLessThan(15000);
  });
});

import { describe, it, expect } from 'vitest';
import { PARTS, PART_ORDER, partsUnlockedBy } from '@/game/config/parts';
import { PALETTE, css } from '@/game/config/palette';
import {
  BALL_RADIUS,
  FIXED_DT,
  GRAVITY_Y,
  MAX_SIM_SECONDS,
  RESTITUTION,
  TANGENT_FRICTION,
} from '@/game/config/physics';
import { STAGES, STAGE_COUNT } from '@/game/config/stages';

describe('physics config', () => {
  it('uses a 120 Hz fixed timestep', () => {
    expect(FIXED_DT).toBeCloseTo(1 / 120, 10);
  });

  it('pulls downward', () => {
    expect(GRAVITY_Y).toBeLessThan(0);
  });

  it('keeps restitution and friction in a sane range for every material', () => {
    for (const material of ['wood', 'metal', 'rubber'] as const) {
      expect(RESTITUTION[material]).toBeGreaterThan(0);
      expect(RESTITUTION[material]).toBeLessThan(1);
      expect(TANGENT_FRICTION[material]).toBeGreaterThanOrEqual(0);
      expect(TANGENT_FRICTION[material]).toBeLessThan(1);
    }
    // ゴムが いちばん よく はねる
    expect(RESTITUTION.rubber).toBeGreaterThan(RESTITUTION.metal);
    expect(RESTITUTION.metal).toBeGreaterThan(RESTITUTION.wood);
  });

  it('gives the simulation a finite cutoff', () => {
    expect(MAX_SIM_SECONDS).toBeGreaterThan(5);
    expect(MAX_SIM_SECONDS).toBeLessThanOrEqual(60);
  });
});

describe('part config', () => {
  it('defines all seven parts exactly once, in tray order', () => {
    expect(PART_ORDER).toHaveLength(7);
    expect(new Set(PART_ORDER).size).toBe(7);
    for (const kind of PART_ORDER) {
      expect(PARTS[kind].kind).toBe(kind);
    }
  });

  it('uses hiragana names and an emoji for every part', () => {
    for (const kind of PART_ORDER) {
      const part = PARTS[kind];
      expect(part.nameHiragana.length).toBeGreaterThan(0);
      expect(part.emoji.length).toBeGreaterThan(0);
      expect(part.zukanHiragana.length).toBeGreaterThan(6);
      expect(part.learnHiragana.length).toBeGreaterThan(2);
      // ひらがな ちゅうしん。かんじを つかわない
      expect(part.nameHiragana).not.toMatch(/[\u4e00-\u9fff]/);
      expect(part.zukanHiragana).not.toMatch(/[\u4e00-\u9fff]/);
      expect(part.learnHiragana).not.toMatch(/[\u4e00-\u9fff]/);
    }
  });

  it('has sizes large enough for the ball to interact with', () => {
    for (const kind of PART_ORDER) {
      const part = PARTS[kind];
      expect(part.size.x).toBeGreaterThan(BALL_RADIUS * 0.5);
      expect(part.size.y).toBeGreaterThan(0.1);
    }
  });

  it('unlocks parts in the documented progression', () => {
    expect(partsUnlockedBy(1)).toEqual(['plate']);
    expect(partsUnlockedBy(4)).toEqual(['plate', 'spring']);
    expect(partsUnlockedBy(7)).toEqual(['plate', 'spring', 'fan']);
    expect(partsUnlockedBy(10)).toEqual(['plate', 'spring', 'fan', 'conveyor', 'domino']);
    expect(partsUnlockedBy(13)).toHaveLength(7);
  });

  it('describes a pipe path that starts and ends at different points', () => {
    const pipe = PARTS.pipe;
    expect(pipe.pipe.path.length).toBeGreaterThan(3);
    const first = pipe.pipe.path[0];
    const last = pipe.pipe.path[pipe.pipe.path.length - 1];
    expect(Math.hypot(last.x - first.x, last.y - first.y)).toBeGreaterThan(1);
  });

  it('gives the pipe enough room for the ball', () => {
    expect(PARTS.pipe.pipe.radius).toBeGreaterThan(BALL_RADIUS);
  });
});

describe('palette', () => {
  it('formats colours as CSS hex', () => {
    expect(css(0x000000)).toBe('#000000');
    expect(css(PALETTE.coin)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps neighbouring part colours visually distinct', () => {
    const colors = PART_ORDER.map((kind) => PARTS[kind].color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('stage config', () => {
  it('defines exactly 15 stages numbered 1..15', () => {
    expect(STAGES).toHaveLength(STAGE_COUNT);
    expect(STAGES.map((s) => s.stageNumber)).toEqual(
      Array.from({ length: STAGE_COUNT }, (_, i) => i + 1),
    );
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGE_COUNT);
  });

  it('only offers parts that are already unlocked at that stage', () => {
    for (const stage of STAGES) {
      for (const allowance of stage.availableParts) {
        expect(PARTS[allowance.kind].unlockStage).toBeLessThanOrEqual(stage.stageNumber);
        expect(allowance.limit).toBeGreaterThan(0);
      }
    }
  });

  it('follows the documented part progression', () => {
    const kindsFor = (n: number): string[] =>
      STAGES[n - 1].availableParts.map((a) => a.kind).sort();
    expect(kindsFor(1)).toEqual(['plate']);
    expect(kindsFor(3)).toEqual(['plate']);
    expect(kindsFor(4)).toContain('spring');
    expect(kindsFor(7)).toContain('fan');
    expect(kindsFor(10)).toContain('conveyor');
    expect(kindsFor(13)).toContain('pipe');
    expect(kindsFor(14)).toContain('hammer');
  });

  it('has at least one goal, one ball and star coins on every stage', () => {
    for (const stage of STAGES) {
      expect(stage.goals.length).toBeGreaterThanOrEqual(1);
      expect(stage.balls.length).toBeGreaterThanOrEqual(1);
      expect(stage.coins.length).toBeGreaterThanOrEqual(1);
      expect(new Set(stage.coins.map((c) => c.id)).size).toBe(stage.coins.length);
    }
  });

  it('keeps balls, goals and coins inside the stage bounds', () => {
    for (const stage of STAGES) {
      const inside = (x: number, y: number): boolean =>
        x >= stage.bounds.minX &&
        x <= stage.bounds.maxX &&
        y >= stage.bounds.minY &&
        y <= stage.bounds.maxY;
      for (const ball of stage.balls) expect(inside(ball.x, ball.y)).toBe(true);
      for (const goal of stage.goals) expect(inside(goal.x, goal.y)).toBe(true);
      for (const coin of stage.coins) expect(inside(coin.x, coin.y)).toBe(true);
    }
  });

  it('uses hiragana for names and hints', () => {
    for (const stage of STAGES) {
      expect(stage.nameHiragana).not.toMatch(/[\u4e00-\u9fff]/);
      expect(stage.hintHiragana).not.toMatch(/[\u4e00-\u9fff]/);
      expect(stage.hintHiragana.length).toBeGreaterThan(4);
    }
  });

  it('gives every stage a solution that fits its own rules', () => {
    for (const stage of STAGES) {
      expect(stage.solution.length).toBeGreaterThan(0);
      expect(stage.solution.length).toBeLessThanOrEqual(stage.parPartCount);
      expect(new Set(stage.solution.map((p) => p.id)).size).toBe(stage.solution.length);
      for (const placement of stage.solution) {
        const allowance = stage.availableParts.find((a) => a.kind === placement.kind);
        expect(allowance).toBeDefined();
        const used = stage.solution.filter((p) => p.kind === placement.kind).length;
        expect(used).toBeLessThanOrEqual(allowance!.limit);
      }
    }
  });

  it('gets steadily more generous with parts as stages progress', () => {
    expect(STAGES[0].parPartCount).toBeLessThanOrEqual(STAGES[14].parPartCount);
  });
});

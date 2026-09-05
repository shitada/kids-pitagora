import { describe, it, expect } from 'vitest';
import type { Placement, StageConfig } from '@/types';
import { STAGES } from '@/game/config/stages';
import { PARTS } from '@/game/config/parts';
import { PLACE_GRID } from '@/game/config/physics';
import { buildWorld } from '@/game/parts/PartRegistry';
import { canPlace, remainingCount, snapPlacement } from '@/game/parts/placementRules';

const stage = STAGES[0];

function placement(kind: Placement['kind'], x: number, y: number, angle = 0): Placement {
  return { id: `p-${kind}-${x}-${y}`, kind, x, y, angle };
}

describe('PartRegistry', () => {
  it('turns a plate placement into a solid collider', () => {
    const world = buildWorld(stage, [placement('plate', 0, 0)]);
    expect(world.colliders.some((c) => c.id.startsWith('plate:'))).toBe(true);
  });

  it('turns a spring placement into a launching collider', () => {
    const world = buildWorld(stage, [placement('spring', 0, 0)]);
    const spring = world.colliders.find((c) => c.id.startsWith('spring:'));
    expect(spring).toBeDefined();
    expect(spring!.launchSpeed).toBe(PARTS.spring.spring.launchSpeed);
  });

  it('turns a fan placement into a body plus a wind field pointing where it faces', () => {
    const world = buildWorld(stage, [placement('fan', 0, 0, 0)]);
    expect(world.colliders.some((c) => c.id.startsWith('fan:'))).toBe(true);
    expect(world.fields).toHaveLength(1);
    const field = world.fields[0];
    expect(field.dirX).toBeCloseTo(1);
    expect(field.dirY).toBeCloseTo(0);
    // かぜの はんいは せんぷうきの まえに ある
    expect(field.region.cx).toBeGreaterThan(0);
  });

  it('rotates the wind field with the fan', () => {
    const world = buildWorld(stage, [placement('fan', 0, 0, Math.PI / 2)]);
    const field = world.fields[0];
    expect(field.dirX).toBeCloseTo(0);
    expect(field.dirY).toBeCloseTo(1);
    expect(field.region.cy).toBeGreaterThan(0);
  });

  it('gives a conveyor a surface velocity along its facing direction', () => {
    const world = buildWorld(stage, [placement('conveyor', 0, 0, Math.PI)]);
    const belt = world.colliders.find((c) => c.id.startsWith('conveyor:'));
    expect(belt?.surfaceVelocity?.x).toBeCloseTo(-PARTS.conveyor.conveyor.surfaceSpeed);
    expect(belt?.grip).toBeGreaterThan(1);
  });

  it('stands a domino on its base', () => {
    const world = buildWorld(stage, [placement('domino', 0, 0)]);
    expect(world.dominoes).toHaveLength(1);
    const domino = world.dominoes[0];
    expect(domino.baseY).toBeCloseTo(-PARTS.domino.domino.height / 2);
    expect(domino.lean).toBe(0);
  });

  it('builds a pipe rail plus outer walls', () => {
    const world = buildWorld(stage, [placement('pipe', 0, 0)]);
    expect(world.pipes).toHaveLength(1);
    expect(world.pipes[0].totalLength).toBeGreaterThan(2);
    expect(world.colliders.filter((c) => c.id.startsWith('pipe-wall:')).length).toBeGreaterThan(4);
  });

  it('hangs a hammer from its pivot', () => {
    const world = buildWorld(stage, [placement('hammer', 0, 3)]);
    expect(world.hammers).toHaveLength(1);
    const head = world.hammers[0].headPosition();
    expect(head.y).toBeLessThan(3);
  });

  it('spawns the stage balls and terrain', () => {
    const world = buildWorld(stage, []);
    expect(world.balls).toHaveLength(stage.balls.length);
    expect(world.colliders.filter((c) => c.id.startsWith('terrain:')).length).toBeGreaterThan(0);
  });
});

describe('placement rules', () => {
  it('accepts a sensible placement', () => {
    const result = canPlace(stage, [], placement('plate', -3, 1));
    expect(result.ok).toBe(true);
  });

  it('rejects a placement outside the stage', () => {
    const result = canPlace(stage, [], placement('plate', 99, 0));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('out-of-bounds');
  });

  it('rejects a placement that overlaps terrain', () => {
    const piece = stage.terrain[0];
    const result = canPlace(stage, [], placement('plate', piece.x, piece.y));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('overlaps-terrain');
  });

  it('rejects a placement on top of the goal', () => {
    const goal = stage.goals[0];
    const result = canPlace(stage, [], placement('plate', goal.x, goal.y));
    expect(result.ok).toBe(false);
    expect(['blocks-goal', 'overlaps-terrain']).toContain(result.reason);
  });

  it('rejects a placement on the ball spawn', () => {
    const spawn = stage.balls[0];
    const result = canPlace(stage, [], placement('plate', spawn.x, spawn.y));
    expect(result.ok).toBe(false);
    expect(['blocks-spawn', 'overlaps-terrain', 'out-of-bounds']).toContain(result.reason);
  });

  it('rejects overlapping parts', () => {
    const first = placement('plate', -3, 1);
    const result = canPlace(stage, [first], { ...placement('plate', -3, 1), id: 'other' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('overlaps-part');
  });

  it('respects the per-stage part limit', () => {
    const limit = stage.availableParts[0].limit;
    const existing: Placement[] = Array.from({ length: limit }, (_, i) => ({
      id: `x${i}`,
      kind: 'plate',
      x: -6 + i * 3,
      y: -6.2,
      angle: 0,
    }));
    const result = canPlace(stage, existing, placement('plate', 0, 2));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('limit-reached');
  });

  it('ignores limits in sandbox mode', () => {
    const existing: Placement[] = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      kind: 'plate',
      x: -9 + i * 0.9,
      y: -6.4,
      angle: 0,
    }));
    const result = canPlace(stage, existing, placement('plate', 0, 2), { ignoreLimits: true });
    expect(result.ok).toBe(true);
  });

  it('rejects parts a stage does not offer', () => {
    const result = canPlace(stage, [], placement('hammer', 0, 2));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-available');
  });

  it('always explains rejections in hiragana', () => {
    const result = canPlace(stage, [], placement('plate', 99, 0));
    expect(result.messageHiragana).toBeDefined();
    expect(result.messageHiragana).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('counts remaining parts', () => {
    const kind = stage.availableParts[0].kind;
    const limit = stage.availableParts[0].limit;
    expect(remainingCount(stage, [], kind)).toBe(limit);
    expect(remainingCount(stage, [placement(kind, 0, 0)], kind)).toBe(limit - 1);
    expect(remainingCount(stage, [], 'hammer')).toBe(0);
  });

  it('snaps position to the grid and angle to the part snap', () => {
    const snapped = snapPlacement(placement('plate', 1.37, -2.11, 0.31), PLACE_GRID);
    expect(snapped.x % PLACE_GRID).toBeCloseTo(0, 6);
    expect(snapped.y % PLACE_GRID).toBeCloseTo(0, 6);
    const steps = snapped.angle / PARTS.plate.angleSnap;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
  });

  it('keeps non-rotatable parts upright', () => {
    const snapped = snapPlacement(placement('domino', 0, 0, 1.2), PLACE_GRID);
    expect(snapped.angle).toBe(0);
  });
});

describe('every stage solution is legal to place by hand', () => {
  it.each(STAGES.map((s) => [s.id, s] as [string, StageConfig]))(
    '%s solution passes the placement rules',
    (_id, target) => {
      const placed: Placement[] = [];
      for (const step of target.solution) {
        const check = canPlace(target, placed, step);
        expect(check.reason ?? 'ok').toBe('ok');
        placed.push(step);
      }
    },
  );
});

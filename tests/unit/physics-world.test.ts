import { describe, it, expect } from 'vitest';
import { FIXED_DT, GRAVITY_Y } from '@/game/config/physics';
import { obb } from '@/game/physics/colliders';
import { PhysicsWorld } from '@/game/physics/PhysicsWorld';
import { DominoBody, stepDominoes } from '@/game/physics/DominoChain';
import { PendulumHammer } from '@/game/physics/Pendulum';
import { PipeRail, transformPath } from '@/game/physics/PipeRail';

const BOUNDS = { minX: -10, maxX: 10, minY: -10, maxY: 10 };

function makeWorld(): PhysicsWorld {
  return new PhysicsWorld(BOUNDS);
}

function runTicks(world: PhysicsWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step();
}

describe('PhysicsWorld basics', () => {
  it('applies gravity to a free ball', () => {
    const world = makeWorld();
    const ball = world.addBall({ id: 'b', x: 0, y: 5 });
    runTicks(world, 60);
    expect(ball.vy).toBeLessThan(0);
    expect(ball.y).toBeLessThan(5);
    // 0.5 秒後の 落下きょり ≈ 0.5 * g * t^2
    const expected = 5 + 0.5 * GRAVITY_Y * 0.5 * 0.5;
    expect(ball.y).toBeCloseTo(expected, 0);
  });

  it('is deterministic: identical worlds produce identical states', () => {
    const build = (): PhysicsWorld => {
      const w = makeWorld();
      w.addCollider({ id: 'floor', shape: obb(0, -2, 6, 0.4), material: 'wood' });
      w.addCollider({ id: 'ramp', shape: obb(-1, 1, 2, 0.2, -0.35), material: 'wood' });
      w.addBall({ id: 'b', x: -2, y: 4 });
      return w;
    };
    const a = build();
    const b = build();
    runTicks(a, 600);
    runTicks(b, 600);
    expect(a.balls[0].x).toBe(b.balls[0].x);
    expect(a.balls[0].y).toBe(b.balls[0].y);
    expect(a.balls[0].vx).toBe(b.balls[0].vx);
  });

  it('stops a falling ball on a floor and comes to rest', () => {
    const world = makeWorld();
    world.addCollider({ id: 'floor', shape: obb(0, -2, 8, 0.4), material: 'wood' });
    const ball = world.addBall({ id: 'b', x: 0, y: 4 });
    runTicks(world, 900);
    expect(ball.y).toBeGreaterThan(-2);
    expect(ball.y).toBeCloseTo(-2 + 0.4 + ball.radius, 1);
    expect(Math.abs(ball.vy)).toBeLessThan(0.5);
  });

  it('rolls downhill on a tilted plate', () => {
    const world = makeWorld();
    world.addCollider({ id: 'ramp', shape: obb(0, 0, 4, 0.2, -0.4), material: 'wood' });
    const ball = world.addBall({ id: 'b', x: -2.5, y: 1.6 });
    runTicks(world, 240);
    expect(ball.vx).toBeGreaterThan(1);
    expect(ball.x).toBeGreaterThan(-2.5);
  });

  it('does not tunnel through a thin floor at high speed', () => {
    const world = makeWorld();
    world.addCollider({ id: 'thin', shape: obb(0, -6, 8, 0.06), material: 'metal' });
    const ball = world.addBall({ id: 'b', x: 0, y: 8, vy: -24 });
    runTicks(world, 240);
    expect(ball.y).toBeGreaterThan(-6);
  });

  it('marks a ball out of bounds when it leaves the stage', () => {
    const world = makeWorld();
    const ball = world.addBall({ id: 'b', x: 0, y: -9.5, vy: -6 });
    runTicks(world, 120);
    expect(ball.active).toBe(false);
    expect(world.events.some((e) => e.type === 'out-of-bounds')).toBe(false);
  });
});

describe('spring part', () => {
  it('launches the ball upward with at least the configured speed', () => {
    const world = makeWorld();
    world.addCollider({
      id: 'spring:s1',
      shape: obb(0, -2, 0.55, 0.21),
      material: 'rubber',
      launchSpeed: 8.6,
    });
    const ball = world.addBall({ id: 'b', x: 0, y: 1 });
    let peakVy = 0;
    for (let i = 0; i < 200; i++) {
      world.step();
      if (ball.vy > peakVy) peakVy = ball.vy;
    }
    expect(peakVy).toBeGreaterThan(7.5);
  });
});

describe('fan force field', () => {
  it('pushes the ball sideways and weakens with distance', () => {
    const near = makeWorld();
    near.addField({ id: 'f', region: obb(3, 0, 2.5, 1.2), dirX: 1, dirY: 0, strength: 20, falloff: 0.72 });
    const nearBall = near.addBall({ id: 'b', x: 0.8, y: 0 });
    runTicks(near, 30);

    const far = makeWorld();
    far.addField({ id: 'f', region: obb(3, 0, 2.5, 1.2), dirX: 1, dirY: 0, strength: 20, falloff: 0.72 });
    const farBall = far.addBall({ id: 'b', x: 5.2, y: 0 });
    runTicks(far, 30);

    expect(nearBall.vx).toBeGreaterThan(1);
    expect(farBall.vx).toBeGreaterThan(0);
    expect(nearBall.vx).toBeGreaterThan(farBall.vx);
  });

  it('does nothing outside the region', () => {
    const world = makeWorld();
    world.addField({ id: 'f', region: obb(3, 0, 2.5, 1.2), dirX: 1, dirY: 0, strength: 20, falloff: 0.72 });
    const ball = world.addBall({ id: 'b', x: 3, y: 6 });
    runTicks(world, 30);
    expect(ball.vx).toBeCloseTo(0, 5);
  });
});

describe('conveyor part', () => {
  it('drags a resting ball along the belt direction', () => {
    const world = makeWorld();
    world.addCollider({
      id: 'conveyor:c1',
      shape: obb(0, -2, 3, 0.17),
      material: 'rubber',
      surfaceVelocity: { x: 5.2, y: 0 },
      grip: 9,
    });
    const ball = world.addBall({ id: 'b', x: -2, y: -1.2 });
    runTicks(world, 240);
    expect(ball.vx).toBeGreaterThan(2);
    expect(ball.x).toBeGreaterThan(-2);
  });

  it('drags in the opposite direction when reversed', () => {
    const world = makeWorld();
    world.addCollider({
      id: 'conveyor:c1',
      shape: obb(0, -2, 3, 0.17, Math.PI),
      material: 'rubber',
      surfaceVelocity: { x: -5.2, y: 0 },
      grip: 9,
    });
    const ball = world.addBall({ id: 'b', x: 2, y: -1.2 });
    runTicks(world, 240);
    expect(ball.vx).toBeLessThan(-2);
  });
});

describe('domino chain', () => {
  function makeDomino(id: string, x: number): DominoBody {
    return new DominoBody({
      id,
      baseX: x,
      baseY: 0,
      height: 1.15,
      halfThickness: 0.12,
      chainReach: 1.2,
      transfer: 0.92,
    });
  }

  it('stays upright when untouched', () => {
    const d = makeDomino('d1', 0);
    for (let i = 0; i < 600; i++) d.step(FIXED_DT);
    expect(d.lean).toBe(0);
    expect(d.isDown).toBe(false);
  });

  it('falls over once pushed', () => {
    const d = makeDomino('d1', 0);
    d.push(1);
    for (let i = 0; i < 600; i++) d.step(FIXED_DT);
    expect(d.isDown).toBe(true);
    expect(d.lean).toBeGreaterThan(0);
  });

  it('propagates through a row of dominoes', () => {
    const row = [0, 0.7, 1.4, 2.1, 2.8].map((x, i) => makeDomino(`d${i}`, x));
    row[0].push(1);
    for (let i = 0; i < 900; i++) stepDominoes(row, FIXED_DT);
    for (const d of row) {
      expect(d.isDown).toBe(true);
      expect(d.lean).toBeGreaterThan(0);
    }
  });

  it('does not propagate when the gap is too wide', () => {
    const row = [makeDomino('d0', 0), makeDomino('d1', 3.5)];
    row[0].push(1);
    for (let i = 0; i < 900; i++) stepDominoes(row, FIXED_DT);
    expect(row[0].isDown).toBe(true);
    expect(row[1].isDown).toBe(false);
  });

  it('lets a rolling ball topple the first domino', () => {
    const world = makeWorld();
    world.addCollider({ id: 'floor', shape: obb(0, -0.3, 8, 0.3), material: 'wood' });
    const domino = makeDomino('d0', 1);
    world.addDomino(domino);
    world.addBall({ id: 'b', x: -1.5, y: 0.3, vx: 4.5 });
    runTicks(world, 400);
    expect(domino.isFalling).toBe(true);
    expect(domino.lean).toBeGreaterThan(0);
  });
});

describe('pendulum hammer', () => {
  it('is exactly periodic', () => {
    const h = new PendulumHammer({
      id: 'h',
      pivotX: 0,
      pivotY: 3,
      armLength: 1.4,
      headRadius: 0.3,
      amplitude: 0.9,
      periodSec: 2.4,
    });
    h.setTime(0.37);
    const a = h.headPosition();
    h.setTime(0.37 + 2.4 * 5);
    const b = h.headPosition();
    expect(b.x).toBeCloseTo(a.x, 8);
    expect(b.y).toBeCloseTo(a.y, 8);
  });

  it('hangs straight down at theta = 0', () => {
    const h = new PendulumHammer({
      id: 'h',
      pivotX: 0,
      pivotY: 3,
      armLength: 1.4,
      headRadius: 0.3,
      amplitude: 0.9,
      periodSec: 2.4,
      phase: 0,
    });
    h.setTime(0);
    expect(h.headPosition().x).toBeCloseTo(0);
    expect(h.headPosition().y).toBeCloseTo(1.6);
  });

  it('knocks a resting ball sideways', () => {
    const world = makeWorld();
    world.addCollider({ id: 'floor', shape: obb(0, -0.3, 8, 0.3), material: 'wood' });
    world.addHammer(
      new PendulumHammer({
        id: 'h',
        pivotX: 0,
        pivotY: 1.9,
        armLength: 1.4,
        headRadius: 0.3,
        amplitude: 0.9,
        periodSec: 2.4,
        phase: -Math.PI / 2,
      }),
    );
    const ball = world.addBall({ id: 'b', x: 0.25, y: 0.3 });
    runTicks(world, 400);
    expect(Math.abs(ball.vx) + Math.abs(ball.x - 0.25)).toBeGreaterThan(0.5);
  });
});

describe('pipe rail', () => {
  const path = [
    { x: 0, y: 2 },
    { x: 0, y: 0 },
    { x: 2, y: 0 },
  ];

  it('measures length and samples points along the rail', () => {
    const rail = new PipeRail({ id: 'p', points: path, radius: 0.44, mouthRadius: 0.62, minSpeed: 2.6 });
    expect(rail.totalLength).toBeCloseTo(4);
    expect(rail.pointAt(0)).toEqual({ x: 0, y: 2 });
    expect(rail.pointAt(2).y).toBeCloseTo(0);
    expect(rail.pointAt(3).x).toBeCloseTo(1);
    expect(rail.tangentAt(3).x).toBeCloseTo(1);
  });

  it('captures a ball entering the mouth and ejects it at the exit', () => {
    const world = makeWorld();
    world.addPipe(new PipeRail({ id: 'p', points: path, radius: 0.44, mouthRadius: 0.62, minSpeed: 2.6 }));
    const ball = world.addBall({ id: 'b', x: 0, y: 2.4, vy: -3 });
    let entered = false;
    let exited = false;
    for (let i = 0; i < 400; i++) {
      world.step();
      if (world.events.some((e) => e.type === 'pipe-enter')) entered = true;
      if (world.events.some((e) => e.type === 'pipe-exit')) exited = true;
    }
    expect(entered).toBe(true);
    expect(exited).toBe(true);
    // 出口では 右むきに 射出される
    expect(ball.vx).toBeGreaterThan(1);
  });

  it('transforms a path by position and angle', () => {
    const moved = transformPath([{ x: 1, y: 0 }], 5, 5, Math.PI / 2);
    expect(moved[0].x).toBeCloseTo(5);
    expect(moved[0].y).toBeCloseTo(6);
  });
});

describe('ball vs ball', () => {
  it('separates and bounces two overlapping balls', () => {
    const world = makeWorld();
    const a = world.addBall({ id: 'a', x: -1, y: 0, vx: 4 });
    const b = world.addBall({ id: 'b', x: 1, y: 0, vx: -4 });
    runTicks(world, 60);
    expect(a.x).toBeLessThan(b.x);
    expect(a.vx).toBeLessThan(b.vx);
  });
});

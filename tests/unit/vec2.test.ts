import { describe, it, expect } from 'vitest';
import {
  add,
  clamp,
  clampLength,
  closestPointOnSegment,
  cross,
  distance,
  dot,
  lengthOf,
  normalize,
  perp,
  rotate,
  sub,
  wrapAngle,
} from '@/game/physics/Vec2';

describe('Vec2', () => {
  it('adds and subtracts', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(sub({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 2 });
  });

  it('computes dot and cross', () => {
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
    expect(cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
  });

  it('normalizes and keeps zero vectors safe', () => {
    const n = normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('rotates by 90 degrees', () => {
    const r = rotate({ x: 1, y: 0 }, Math.PI / 2);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });

  it('perp turns counter-clockwise', () => {
    expect(perp({ x: 1, y: 0 })).toEqual({ x: -0, y: 1 });
  });

  it('clamps values and lengths', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(lengthOf(clampLength({ x: 10, y: 0 }, 4))).toBeCloseTo(4);
    expect(lengthOf(clampLength({ x: 1, y: 0 }, 4))).toBeCloseTo(1);
  });

  it('finds the closest point on a segment', () => {
    const p = closestPointOnSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 });
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(0);
    const clampedStart = closestPointOnSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: -8, y: 1 });
    expect(clampedStart.x).toBeCloseTo(0);
  });

  it('measures distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('wraps angles into -PI..PI', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5);
  });
});

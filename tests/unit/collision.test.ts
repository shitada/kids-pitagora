import { describe, it, expect } from 'vitest';
import {
  capsule,
  circle,
  circleVsShape,
  obb,
  obbCorners,
  obbOverlapsObb,
  pointInObb,
  toObbLocal,
} from '@/game/physics/colliders';

describe('circle vs OBB', () => {
  it('detects a ball resting on a flat box', () => {
    const box = obb(0, 0, 2, 0.5);
    const contact = circleVsShape(box, 0, 0.7, 0.3);
    expect(contact).not.toBeNull();
    expect(contact!.ny).toBeCloseTo(1);
    expect(contact!.nx).toBeCloseTo(0);
    expect(contact!.depth).toBeCloseTo(0.1);
  });

  it('returns null when far away', () => {
    const box = obb(0, 0, 2, 0.5);
    expect(circleVsShape(box, 0, 5, 0.3)).toBeNull();
  });

  it('pushes out along the shallowest face when the centre is inside', () => {
    const box = obb(0, 0, 2, 0.5);
    const contact = circleVsShape(box, 0, 0.4, 0.3);
    expect(contact).not.toBeNull();
    expect(contact!.ny).toBeCloseTo(1);
    expect(contact!.depth).toBeGreaterThan(0.3);
  });

  it('produces a rotated normal for a tilted box', () => {
    const box = obb(0, 0, 2, 0.2, Math.PI / 4);
    const contact = circleVsShape(box, -0.3, 0.3, 0.3);
    expect(contact).not.toBeNull();
    // 45 度に かたむいた いたの 法線は (-1,1)/sqrt(2)
    expect(contact!.nx).toBeCloseTo(-Math.SQRT1_2, 3);
    expect(contact!.ny).toBeCloseTo(Math.SQRT1_2, 3);
  });

  it('handles the corner case', () => {
    const box = obb(0, 0, 1, 1);
    const contact = circleVsShape(box, 1.15, 1.15, 0.3);
    expect(contact).not.toBeNull();
    expect(contact!.nx).toBeCloseTo(Math.SQRT1_2, 3);
    expect(contact!.ny).toBeCloseTo(Math.SQRT1_2, 3);
  });
});

describe('circle vs capsule and circle', () => {
  it('collides with a capsule body', () => {
    const cap = capsule(-2, 0, 2, 0, 0.2);
    const contact = circleVsShape(cap, 0, 0.4, 0.3);
    expect(contact).not.toBeNull();
    expect(contact!.ny).toBeCloseTo(1);
    expect(contact!.depth).toBeCloseTo(0.1);
  });

  it('misses beyond the capsule end cap', () => {
    const cap = capsule(-2, 0, 2, 0, 0.2);
    expect(circleVsShape(cap, 4, 0, 0.3)).toBeNull();
  });

  it('collides with a circle', () => {
    const c = circle(0, 0, 1);
    const contact = circleVsShape(c, 1.2, 0, 0.3);
    expect(contact).not.toBeNull();
    expect(contact!.nx).toBeCloseTo(1);
    expect(contact!.depth).toBeCloseTo(0.1);
  });
});

describe('OBB helpers', () => {
  it('reports points inside and outside', () => {
    const box = obb(1, 1, 1, 1);
    expect(pointInObb(box, 1, 1)).toBe(true);
    expect(pointInObb(box, 3, 1)).toBe(false);
  });

  it('converts to local space', () => {
    const box = obb(2, 0, 1, 1, Math.PI / 2);
    const local = toObbLocal(box, 2, 1);
    expect(local.x).toBeCloseTo(1);
    expect(local.y).toBeCloseTo(0);
  });

  it('returns four corners', () => {
    const corners = obbCorners(obb(0, 0, 1, 2));
    expect(corners).toHaveLength(4);
    expect(Math.max(...corners.map((c) => c.y))).toBeCloseTo(2);
  });

  it('detects overlapping and separated boxes', () => {
    expect(obbOverlapsObb(obb(0, 0, 1, 1), obb(1.5, 0, 1, 1))).toBe(true);
    expect(obbOverlapsObb(obb(0, 0, 1, 1), obb(5, 0, 1, 1))).toBe(false);
    // 45 度 かたむけると 角が のびて あたる
    expect(obbOverlapsObb(obb(0, 0, 1, 1), obb(2.3, 0, 1, 1, Math.PI / 4))).toBe(true);
    expect(obbOverlapsObb(obb(0, 0, 1, 1), obb(2.6, 0, 1, 1, Math.PI / 4))).toBe(false);
  });
});

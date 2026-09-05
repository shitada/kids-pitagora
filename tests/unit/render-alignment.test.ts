import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { PartKind } from '@/types';
import { PARTS, PART_ORDER } from '@/game/config/parts';
import { createPartVisual } from '@/game/render/partMeshes';
import { PendulumHammer } from '@/game/physics/Pendulum';
import { DominoBody } from '@/game/physics/DominoChain';
import { buildDemo } from '@/game/scenes/ZukanScene';

/**
 * 描画は 物理の けっかを その まま うつす だけ でなければ ならない。
 * みための ふりこが 物理と 逆に ふれていたら、子供は タイミングを 学べない。
 * ここでは みための ワールド座標を じっさいに 計算して 物理と くらべる。
 */

function findMesh(root: THREE.Object3D, predicate: (mesh: THREE.Mesh) => boolean): THREE.Mesh {
  let found: THREE.Mesh | null = null;
  root.traverse((node) => {
    if (!found && node instanceof THREE.Mesh && predicate(node)) found = node;
  });
  if (!found) throw new Error('mesh not found');
  return found;
}

describe('every part builds a visual without throwing', () => {
  it.each(PART_ORDER.map((kind) => [kind] as [PartKind]))('%s', (kind) => {
    const visual = createPartVisual(kind, { id: 'v', kind, x: 1, y: 2, angle: 0.5 });
    expect(visual.group.children.length).toBeGreaterThan(0);
    expect(visual.group.position.x).toBeCloseTo(1);
    expect(visual.group.position.y).toBeCloseTo(2);
    expect(visual.group.rotation.z).toBeCloseTo(0.5);
    expect(() => visual.update({ time: 1.2, running: true, lean: 0.3, theta: 0.4 })).not.toThrow();
    expect(() => visual.dispose()).not.toThrow();
  });
});

describe('hammer visual matches the physics pendulum', () => {
  const config = PARTS.hammer.hammer;

  it.each([0, 0.4, 1.05, -0.7, -1.05])('head lines up at theta = %s', (theta) => {
    const pivotX = 2.5;
    const pivotY = 3.5;
    const hammer = new PendulumHammer({
      id: 'h',
      pivotX,
      pivotY,
      armLength: config.armLength,
      headRadius: config.headRadius,
      amplitude: Math.abs(theta) + 0.01,
      periodSec: 2,
    });
    hammer.theta = theta;
    const expected = hammer.headPosition();

    const visual = createPartVisual('hammer', { id: 'h', kind: 'hammer', x: pivotX, y: pivotY, angle: 0 });
    visual.update({ time: 0, running: true, theta });
    visual.group.updateMatrixWorld(true);

    const head = findMesh(visual.group, (m) => m.geometry instanceof THREE.SphereGeometry);
    const world = new THREE.Vector3();
    head.getWorldPosition(world);

    expect(world.x).toBeCloseTo(expected.x, 6);
    expect(world.y).toBeCloseTo(expected.y, 6);
    visual.dispose();
  });
});

describe('domino visual matches the physics body', () => {
  const config = PARTS.domino.domino;

  it.each([0, 0.35, 0.9, -0.6])('body lines up at lean = %s', (lean) => {
    const placeX = -1.5;
    const placeY = 0.75;
    const domino = new DominoBody({
      id: 'd',
      baseX: placeX,
      baseY: placeY - config.height / 2,
      height: config.height,
      halfThickness: config.halfThickness,
      chainReach: config.chainReach,
      transfer: config.transfer,
    });
    domino.lean = lean;
    const shape = domino.shape();

    const visual = createPartVisual('domino', { id: 'd', kind: 'domino', x: placeX, y: placeY, angle: 0 });
    visual.update({ time: 0, running: true, lean });
    visual.group.updateMatrixWorld(true);

    const body = findMesh(visual.group, (m) => m.geometry instanceof THREE.BoxGeometry);
    const world = new THREE.Vector3();
    body.getWorldPosition(world);

    expect(world.x).toBeCloseTo(shape.cx, 6);
    expect(world.y).toBeCloseTo(shape.cy, 6);
    visual.dispose();
  });
});

describe('encyclopedia demos', () => {
  it.each(PART_ORDER.map((kind) => [kind] as [PartKind]))(
    '%s demo gives every placement a unique id',
    (kind) => {
      const demo = buildDemo(kind);
      const ids = demo.placements.map((p) => p.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
      expect(demo.placements.every((p) => p.kind === kind)).toBe(true);
    },
  );

  it('gives the domino demo a full row of separate dominoes', () => {
    const demo = buildDemo('domino');
    expect(demo.placements.length).toBeGreaterThanOrEqual(4);
    expect(new Set(demo.placements.map((p) => p.id)).size).toBe(demo.placements.length);
  });

  it('keeps demo ids unique across repeated visits', () => {
    const first = buildDemo('conveyor').placements.map((p) => p.id);
    const second = buildDemo('conveyor').placements.map((p) => p.id);
    expect(new Set([...first, ...second]).size).toBe(first.length + second.length);
  });
});

import type { Vec2Like } from '@/types';
import { clamp, closestPointOnSegment } from './Vec2';

/**
 * 円（ボール）と 3 種類の形の 衝突判定。
 * 汎用の凸包判定は いらない。2.5D 固定平面なので これで じゅうぶん。
 */

export interface ObbShape {
  type: 'obb';
  cx: number;
  cy: number;
  /** はばの半分 */
  hw: number;
  /** たかさの半分 */
  hh: number;
  /** ローカル +X 軸が ワールド +X から 何ラジアン 回っているか */
  angle: number;
}

export interface CapsuleShape {
  type: 'capsule';
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}

export interface CircleShape {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export type ColliderShape = ObbShape | CapsuleShape | CircleShape;

export interface Contact {
  /** 形からボールへ向かう単位法線 */
  nx: number;
  ny: number;
  /** めりこみの深さ */
  depth: number;
  /** 接触点（形の表面上） */
  px: number;
  py: number;
}

export function obb(cx: number, cy: number, hw: number, hh: number, angle = 0): ObbShape {
  return { type: 'obb', cx, cy, hw, hh, angle };
}

export function capsule(ax: number, ay: number, bx: number, by: number, r: number): CapsuleShape {
  return { type: 'capsule', ax, ay, bx, by, r };
}

export function circle(cx: number, cy: number, r: number): CircleShape {
  return { type: 'circle', cx, cy, r };
}

/**
 * 円 vs 形。接触していれば Contact を返す。
 * OBB はローカル空間に変換して clamp するので、辺も角も同じコードで あつかえる。
 */
export function circleVsShape(shape: ColliderShape, px: number, py: number, r: number): Contact | null {
  switch (shape.type) {
    case 'obb':
      return circleVsObb(shape, px, py, r);
    case 'capsule':
      return circleVsCapsule(shape, px, py, r);
    case 'circle':
      return circleVsCircle(shape, px, py, r);
  }
}

function circleVsObb(shape: ObbShape, px: number, py: number, r: number): Contact | null {
  const cos = Math.cos(-shape.angle);
  const sin = Math.sin(-shape.angle);
  const dx = px - shape.cx;
  const dy = py - shape.cy;
  // ローカル空間へ
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;

  const clampedX = clamp(lx, -shape.hw, shape.hw);
  const clampedY = clamp(ly, -shape.hh, shape.hh);

  const inside = clampedX === lx && clampedY === ly;

  let localNx: number;
  let localNy: number;
  let depth: number;
  let surfaceX = clampedX;
  let surfaceY = clampedY;

  if (inside) {
    // 中心が箱の中。いちばん近い面から押し出す
    const distRight = shape.hw - lx;
    const distLeft = lx + shape.hw;
    const distTop = shape.hh - ly;
    const distBottom = ly + shape.hh;
    const minDist = Math.min(distRight, distLeft, distTop, distBottom);
    if (minDist === distRight) {
      localNx = 1;
      localNy = 0;
      surfaceX = shape.hw;
    } else if (minDist === distLeft) {
      localNx = -1;
      localNy = 0;
      surfaceX = -shape.hw;
    } else if (minDist === distTop) {
      localNx = 0;
      localNy = 1;
      surfaceY = shape.hh;
    } else {
      localNx = 0;
      localNy = -1;
      surfaceY = -shape.hh;
    }
    depth = r + minDist;
  } else {
    const offX = lx - clampedX;
    const offY = ly - clampedY;
    const dist = Math.hypot(offX, offY);
    if (dist > r) return null;
    if (dist < 1e-9) {
      localNx = 0;
      localNy = 1;
    } else {
      localNx = offX / dist;
      localNy = offY / dist;
    }
    depth = r - dist;
  }

  // ワールド空間へ もどす
  const wcos = Math.cos(shape.angle);
  const wsin = Math.sin(shape.angle);
  return {
    nx: localNx * wcos - localNy * wsin,
    ny: localNx * wsin + localNy * wcos,
    depth,
    px: shape.cx + (surfaceX * wcos - surfaceY * wsin),
    py: shape.cy + (surfaceX * wsin + surfaceY * wcos),
  };
}

function circleVsCapsule(shape: CapsuleShape, px: number, py: number, r: number): Contact | null {
  const closest = closestPointOnSegment(
    { x: shape.ax, y: shape.ay },
    { x: shape.bx, y: shape.by },
    { x: px, y: py },
  );
  return resolveAgainstPoint(closest.x, closest.y, shape.r, px, py, r);
}

function circleVsCircle(shape: CircleShape, px: number, py: number, r: number): Contact | null {
  return resolveAgainstPoint(shape.cx, shape.cy, shape.r, px, py, r);
}

function resolveAgainstPoint(
  sx: number,
  sy: number,
  sr: number,
  px: number,
  py: number,
  r: number,
): Contact | null {
  const dx = px - sx;
  const dy = py - sy;
  const dist = Math.hypot(dx, dy);
  const total = sr + r;
  if (dist > total) return null;
  let nx: number;
  let ny: number;
  if (dist < 1e-9) {
    nx = 0;
    ny = 1;
  } else {
    nx = dx / dist;
    ny = dy / dist;
  }
  return {
    nx,
    ny,
    depth: total - dist,
    px: sx + nx * sr,
    py: sy + ny * sr,
  };
}

/** 点が OBB の中にあるか */
export function pointInObb(shape: ObbShape, px: number, py: number): boolean {
  const cos = Math.cos(-shape.angle);
  const sin = Math.sin(-shape.angle);
  const dx = px - shape.cx;
  const dy = py - shape.cy;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= shape.hw && Math.abs(ly) <= shape.hh;
}

/** OBB のローカル座標を返す（風の減衰計算などに つかう） */
export function toObbLocal(shape: ObbShape, px: number, py: number): Vec2Like {
  const cos = Math.cos(-shape.angle);
  const sin = Math.sin(-shape.angle);
  const dx = px - shape.cx;
  const dy = py - shape.cy;
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

/** OBB の 4 すみをワールド座標で返す（描画・重なり判定用） */
export function obbCorners(shape: ObbShape): Vec2Like[] {
  const cos = Math.cos(shape.angle);
  const sin = Math.sin(shape.angle);
  const pts: Array<[number, number]> = [
    [-shape.hw, -shape.hh],
    [shape.hw, -shape.hh],
    [shape.hw, shape.hh],
    [-shape.hw, shape.hh],
  ];
  return pts.map(([lx, ly]) => ({
    x: shape.cx + (lx * cos - ly * sin),
    y: shape.cy + (lx * sin + ly * cos),
  }));
}

/** 分離軸判定による OBB どうしの重なり（配置バリデーション用） */export function obbOverlapsObb(a: ObbShape, b: ObbShape): boolean {
  const axes = [
    { x: Math.cos(a.angle), y: Math.sin(a.angle) },
    { x: -Math.sin(a.angle), y: Math.cos(a.angle) },
    { x: Math.cos(b.angle), y: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), y: Math.cos(b.angle) },
  ];
  const ca = obbCorners(a);
  const cb = obbCorners(b);
  for (const axis of axes) {
    let aMin = Infinity;
    let aMax = -Infinity;
    for (const p of ca) {
      const v = p.x * axis.x + p.y * axis.y;
      if (v < aMin) aMin = v;
      if (v > aMax) aMax = v;
    }
    let bMin = Infinity;
    let bMax = -Infinity;
    for (const p of cb) {
      const v = p.x * axis.x + p.y * axis.y;
      if (v < bMin) bMin = v;
      if (v > bMax) bMax = v;
    }
    if (aMax < bMin || bMax < aMin) return false;
  }
  return true;
}

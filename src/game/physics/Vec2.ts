import type { Vec2Like } from '@/types';

/**
 * 物理コアで つかう 2D ベクトルのユーティリティ。
 * Three.js に依存しない純粋な数値計算のみ。
 */

export function vec2(x: number, y: number): Vec2Like {
  return { x, y };
}

export function add(a: Vec2Like, b: Vec2Like): Vec2Like {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2Like, b: Vec2Like): Vec2Like {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2Like, s: number): Vec2Like {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2Like, b: Vec2Like): number {
  return a.x * b.x + a.y * b.y;
}

/** 2D の外積（スカラー） */
export function cross(a: Vec2Like, b: Vec2Like): number {
  return a.x * b.y - a.y * b.x;
}

export function lengthOf(a: Vec2Like): number {
  return Math.hypot(a.x, a.y);
}

export function lengthSq(a: Vec2Like): number {
  return a.x * a.x + a.y * a.y;
}

export function distance(a: Vec2Like, b: Vec2Like): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Vec2Like): Vec2Like {
  const len = Math.hypot(a.x, a.y);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

/** 原点まわりに angle ラジアン回す */
export function rotate(a: Vec2Like, angle: number): Vec2Like {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

/** 反時計まわりに 90 度回した法線 */
export function perp(a: Vec2Like): Vec2Like {
  return { x: -a.y, y: a.x };
}

export function lerp(a: Vec2Like, b: Vec2Like, t: number): Vec2Like {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** ベクトルの長さを max までに おさえる */
export function clampLength(a: Vec2Like, max: number): Vec2Like {
  const len = Math.hypot(a.x, a.y);
  if (len <= max || len < 1e-9) return { x: a.x, y: a.y };
  const s = max / len;
  return { x: a.x * s, y: a.y * s };
}

/** 線分 ab 上で p に いちばん近い点 */
export function closestPointOnSegment(a: Vec2Like, b: Vec2Like, p: Vec2Like): Vec2Like {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-12) return { x: a.x, y: a.y };
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq, 0, 1);
  return { x: a.x + abx * t, y: a.y + aby * t };
}

/** 角度を -PI..PI に そろえる */
export function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

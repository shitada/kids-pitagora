import type { PartKind, Placement, PlacementCheck, StageConfig } from '@/types';
import { PARTS } from '@/game/config/parts';
import { obb, obbOverlapsObb, type ObbShape } from '@/game/physics/colliders';

/** ゴールの まわりに あけておく すきま */
const GOAL_CLEARANCE = 0.7;
/** ボールの スタート地点の まわりに あけておく すきま */
const SPAWN_CLEARANCE = 1.2;

/** パーツの おおよその 当たり判定の かたち */
export function placementShape(placement: Placement): ObbShape {
  const config = PARTS[placement.kind];
  return obb(placement.x, placement.y, config.size.x / 2, config.size.y / 2, placement.angle);
}

/** そのステージで そのパーツを あと何個 おけるか */
export function remainingCount(
  stage: StageConfig,
  placements: readonly Placement[],
  kind: PartKind,
): number {
  const allowance = stage.availableParts.find((a) => a.kind === kind);
  if (!allowance) return 0;
  const used = placements.filter((p) => p.kind === kind).length;
  return Math.max(0, allowance.limit - used);
}

/**
 * パーツを おけるかを しらべる。
 * だめな ときは ひらがなの りゆうを かえすので、そのまま 子供に みせられる。
 */
export function canPlace(
  stage: StageConfig,
  placements: readonly Placement[],
  candidate: Placement,
  options: { ignoreLimits?: boolean; movingId?: string } = {},
): PlacementCheck {
  const others = placements.filter((p) => p.id !== options.movingId);

  if (!options.ignoreLimits) {
    const allowance = stage.availableParts.find((a) => a.kind === candidate.kind);
    if (!allowance) {
      return {
        ok: false,
        reason: 'not-available',
        messageHiragana: 'この ステージでは つかえない パーツだよ',
      };
    }
    const used = others.filter((p) => p.kind === candidate.kind).length;
    if (used >= allowance.limit) {
      return {
        ok: false,
        reason: 'limit-reached',
        messageHiragana: 'この パーツは もう ぜんぶ つかったよ',
      };
    }
  }

  const shape = placementShape(candidate);
  const halfSpan = Math.hypot(shape.hw, shape.hh);
  if (
    candidate.x - halfSpan < stage.bounds.minX ||
    candidate.x + halfSpan > stage.bounds.maxX ||
    candidate.y - halfSpan < stage.bounds.minY ||
    candidate.y + halfSpan > stage.bounds.maxY
  ) {
    return {
      ok: false,
      reason: 'out-of-bounds',
      messageHiragana: 'そこは がめんの そとだよ',
    };
  }

  for (const piece of stage.terrain) {
    const terrainShape = obb(piece.x, piece.y, piece.w / 2, piece.h / 2, piece.angle);
    if (obbOverlapsObb(shape, terrainShape)) {
      return {
        ok: false,
        reason: 'overlaps-terrain',
        messageHiragana: 'かべや ゆかと かさなって いるよ',
      };
    }
  }

  for (const goal of stage.goals) {
    if (Math.hypot(candidate.x - goal.x, candidate.y - goal.y) < goal.radius + GOAL_CLEARANCE) {
      return {
        ok: false,
        reason: 'blocks-goal',
        messageHiragana: 'ゴールの まえは あけて おこう',
      };
    }
  }

  for (const spawn of stage.balls) {
    if (Math.hypot(candidate.x - spawn.x, candidate.y - spawn.y) < SPAWN_CLEARANCE) {
      return {
        ok: false,
        reason: 'blocks-spawn',
        messageHiragana: 'ボールの スタートは あけて おこう',
      };
    }
  }

  for (const other of others) {
    if (obbOverlapsObb(shape, placementShape(other))) {
      return {
        ok: false,
        reason: 'overlaps-part',
        messageHiragana: 'ほかの パーツと かさなって いるよ',
      };
    }
  }

  return { ok: true };
}

/** 配置を きめられた グリッド・角度に そろえる */
export function snapPlacement(placement: Placement, grid: number): Placement {
  const config = PARTS[placement.kind];
  const snap = config.rotatable ? config.angleSnap : 0;
  const angle = snap > 0 ? Math.round(placement.angle / snap) * snap : 0;
  return {
    ...placement,
    x: Math.round(placement.x / grid) * grid,
    y: Math.round(placement.y / grid) * grid,
    angle: normalizeAngle(angle),
  };
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let a = angle % twoPi;
  if (a < 0) a += twoPi;
  return a;
}

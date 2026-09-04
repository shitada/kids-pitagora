import type { Placement, StageConfig, Vec2Like } from '@/types';
import { getPart } from '@/game/config/parts';
import { capsule, obb } from '@/game/physics/colliders';
import { DominoBody } from '@/game/physics/DominoChain';
import { PendulumHammer } from '@/game/physics/Pendulum';
import { PipeRail, transformPath } from '@/game/physics/PipeRail';
import { PhysicsWorld } from '@/game/physics/PhysicsWorld';

/** パイプの かべの あつさ */
const PIPE_WALL_THICKNESS = 0.08;

/** ベルトコンベアが ボールを ひきずる はやさ（1/秒） */
const CONVEYOR_GRIP = 9;

/**
 * Placement（プレイヤーが おいたパーツ）を
 * 物理ワールドの じったい（コライダー・フォースフィールド・特殊挙動）に ひらく。
 */
export function applyPlacement(world: PhysicsWorld, placement: Placement): void {
  const part = getPart(placement.kind);
  const cos = Math.cos(placement.angle);
  const sin = Math.sin(placement.angle);
  const halfW = part.size.x / 2;
  const halfH = part.size.y / 2;

  switch (part.kind) {
    case 'plate': {
      world.addCollider({
        id: `plate:${placement.id}`,
        shape: obb(placement.x, placement.y, halfW, halfH, placement.angle),
        material: part.material,
        sourceId: placement.id,
      });
      break;
    }

    case 'spring': {
      world.addCollider({
        id: `spring:${placement.id}`,
        shape: obb(placement.x, placement.y, halfW, halfH, placement.angle),
        material: part.material,
        launchSpeed: part.spring.launchSpeed,
        sourceId: placement.id,
      });
      break;
    }

    case 'fan': {
      world.addCollider({
        id: `fan:${placement.id}`,
        shape: obb(placement.x, placement.y, halfW, halfH, placement.angle),
        material: part.material,
        sourceId: placement.id,
      });
      const reach = part.fan.reach;
      const centerDistance = halfW + reach / 2;
      world.addField({
        id: `fan-wind:${placement.id}`,
        region: obb(
          placement.x + cos * centerDistance,
          placement.y + sin * centerDistance,
          reach / 2,
          part.fan.width / 2,
          placement.angle,
        ),
        dirX: cos,
        dirY: sin,
        strength: part.fan.force,
        falloff: 0.72,
        sourceId: placement.id,
      });
      break;
    }

    case 'conveyor': {
      world.addCollider({
        id: `conveyor:${placement.id}`,
        shape: obb(placement.x, placement.y, halfW, halfH, placement.angle),
        material: part.material,
        surfaceVelocity: { x: cos * part.conveyor.surfaceSpeed, y: sin * part.conveyor.surfaceSpeed },
        grip: CONVEYOR_GRIP,
        sourceId: placement.id,
      });
      break;
    }

    case 'domino': {
      world.addDomino(
        new DominoBody({
          id: placement.id,
          baseX: placement.x,
          baseY: placement.y - part.domino.height / 2,
          height: part.domino.height,
          halfThickness: part.domino.halfThickness,
          chainReach: part.domino.chainReach,
          transfer: part.domino.transfer,
          material: part.material,
        }),
      );
      break;
    }

    case 'pipe': {
      const points = transformPath(part.pipe.path, placement.x, placement.y, placement.angle);
      const rail = new PipeRail({
        id: placement.id,
        points,
        radius: part.pipe.radius,
        mouthRadius: part.pipe.mouthRadius,
        minSpeed: part.pipe.minSpeed,
      });
      world.addPipe(rail);
      addPipeWalls(world, rail, placement.id);
      break;
    }

    case 'hammer': {
      world.addHammer(
        new PendulumHammer({
          id: placement.id,
          pivotX: placement.x,
          pivotY: placement.y,
          armLength: part.hammer.armLength,
          headRadius: part.hammer.headRadius,
          amplitude: part.hammer.amplitude,
          periodSec: part.hammer.periodSec,
        }),
      );
      world.addCollider({
        id: `hammer-pivot:${placement.id}`,
        shape: obb(placement.x, placement.y, halfW, halfH, 0),
        material: part.material,
        sourceId: placement.id,
      });
      break;
    }
  }
}

/** パイプの 内がわ・外がわの かべを 中心線から オフセットして つくる */
function addPipeWalls(world: PhysicsWorld, rail: PipeRail, sourceId: string): void {
  const half = PIPE_WALL_THICKNESS / 2;
  const offset = rail.radius + half;
  rail.segments().forEach((segment, index) => {
    const normal = segmentNormal(segment.a, segment.b);
    for (const side of [1, -1]) {
      world.addCollider({
        id: `pipe-wall:${sourceId}:${index}:${side > 0 ? 'a' : 'b'}`,
        shape: capsule(
          segment.a.x + normal.x * offset * side,
          segment.a.y + normal.y * offset * side,
          segment.b.x + normal.x * offset * side,
          segment.b.y + normal.y * offset * side,
          half,
        ),
        material: 'metal',
        sourceId,
      });
    }
  });
}

function segmentNormal(a: Vec2Like, b: Vec2Like): Vec2Like {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { x: 0, y: 1 };
  return { x: -dy / len, y: dx / len };
}

/** ステージの 固定地形を ワールドに いれる */
export function applyTerrain(world: PhysicsWorld, stage: StageConfig): void {
  stage.terrain.forEach((piece, index) => {
    if (piece.decorative) return;
    world.addCollider({
      id: `terrain:${index}`,
      shape: obb(piece.x, piece.y, piece.w / 2, piece.h / 2, piece.angle),
      material: piece.material,
    });
  });
}

/**
 * ステージと 配置から 物理ワールドを くみ立てる。
 * この関数は Three.js に いっさい さわらないので テストから そのまま よべる。
 */
export function buildWorld(stage: StageConfig, placements: readonly Placement[]): PhysicsWorld {
  const world = new PhysicsWorld(stage.bounds);
  applyTerrain(world, stage);
  for (const placement of placements) applyPlacement(world, placement);
  for (const spawn of stage.balls) {
    world.addBall({ id: spawn.id, x: spawn.x, y: spawn.y });
  }
  return world;
}

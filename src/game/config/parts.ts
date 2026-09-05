import type { PartConfig, PartConfigOf, PartKind, Vec2Like } from '@/types';
import { ANGLE_SNAP, BALL_RADIUS } from './physics';
import { PALETTE } from './palette';

/**
 * 7 しゅるいの パーツ定義。
 * 挙動に つかう数値は すべて ここに あつめる。
 */

/** パイプの 基準姿勢の 中心線。入口は 上、出口は 右 */
const PIPE_PATH: readonly Vec2Like[] = buildQuarterPipePath();

function buildQuarterPipePath(): Vec2Like[] {
  const arcCenter = { x: 0.9, y: 0.9 };
  const arcRadius = 0.9;
  const raw: Vec2Like[] = [
    { x: 0, y: 1.6 },
    { x: 0, y: 0.9 },
  ];
  const samples = 8;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const angle = Math.PI + t * (Math.PI / 2);
    raw.push({
      x: arcCenter.x + arcRadius * Math.cos(angle),
      y: arcCenter.y + arcRadius * Math.sin(angle),
    });
  }
  raw.push({ x: 1.6, y: 0 });
  // かたちの まんなかが 原点に くるように ずらす
  const offsetX = -0.8;
  const offsetY = -0.8;
  return raw.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
}

export const PARTS: { [K in PartKind]: PartConfigOf<K> } = {
  plate: {
    kind: 'plate',
    nameHiragana: 'いた',
    emoji: '🪵',
    zukanHiragana: 'ななめに すると ボールが ころがるよ。かたむきが きゅうなほど はやく なる。',
    learnHiragana: 'さかと じゅうりょく',
    size: { x: 2.4, y: 0.24 },
    material: 'wood',
    rotatable: true,
    angleSnap: ANGLE_SNAP,
    unlockStage: 1,
    color: PALETTE.plate,
    accent: PALETTE.plateAccent,
  },
  spring: {
    kind: 'spring',
    nameHiragana: 'ジャンプだい',
    emoji: '🦘',
    zukanHiragana: 'ボールが のると ぼいん！ うえに とびはねるよ。',
    learnHiragana: 'はねかえる ちから',
    size: { x: 1.1, y: 0.42 },
    material: 'rubber',
    rotatable: true,
    angleSnap: ANGLE_SNAP,
    unlockStage: 4,
    color: PALETTE.spring,
    accent: PALETTE.springAccent,
    spring: { launchSpeed: 8.6 },
  },
  fan: {
    kind: 'fan',
    nameHiragana: 'せんぷうき',
    emoji: '🌬️',
    zukanHiragana: 'かぜを おくって ボールを よこに おすよ。とおく なるほど かぜは よわい。',
    learnHiragana: 'よこむきの ちから',
    size: { x: 0.95, y: 0.95 },
    material: 'metal',
    rotatable: true,
    angleSnap: Math.PI / 4,
    unlockStage: 7,
    color: PALETTE.fan,
    accent: PALETTE.fanAccent,
    fan: { reach: 5, width: 2.4, force: 20 },
  },
  conveyor: {
    kind: 'conveyor',
    nameHiragana: 'ベルトコンベア',
    emoji: '⏩',
    zukanHiragana: 'ベルトが ぐるぐる うごいて ボールを よこへ はこぶよ。',
    learnHiragana: 'まさつと はこぶ ちから',
    size: { x: 2.6, y: 0.34 },
    material: 'rubber',
    rotatable: true,
    angleSnap: ANGLE_SNAP,
    unlockStage: 10,
    color: PALETTE.conveyor,
    accent: PALETTE.conveyorAccent,
    conveyor: { surfaceSpeed: 5.2 },
  },
  domino: {
    kind: 'domino',
    nameHiragana: 'ドミノ',
    emoji: '🀄',
    zukanHiragana: '1まい たおれると つぎつぎ たおれる。さいごの 1まいが ボールを おすよ。',
    learnHiragana: 'れんさと ちからの つたわりかた',
    size: { x: 0.24, y: 1.15 },
    material: 'wood',
    rotatable: false,
    angleSnap: ANGLE_SNAP,
    unlockStage: 10,
    color: PALETTE.domino,
    accent: PALETTE.dominoAccent,
    domino: { height: 1.15, halfThickness: 0.12, chainReach: 1.2, transfer: 0.92 },
  },
  pipe: {
    kind: 'pipe',
    nameHiragana: 'パイプ',
    emoji: '🌀',
    zukanHiragana: 'まがった みちを とおって ボールを あんぜんに はこぶよ。',
    learnHiragana: 'みちの コントロール',
    size: { x: 2, y: 2 },
    material: 'metal',
    rotatable: true,
    angleSnap: Math.PI / 4,
    unlockStage: 13,
    color: PALETTE.pipe,
    accent: PALETTE.pipeAccent,
    pipe: {
      path: PIPE_PATH,
      radius: BALL_RADIUS + 0.14,
      mouthRadius: 0.62,
      minSpeed: 2.6,
    },
  },
  hammer: {
    kind: 'hammer',
    nameHiragana: 'ふりこハンマー',
    emoji: '🔨',
    zukanHiragana: 'いったり きたり しながら ボールを うちだすよ。タイミングが だいじ。',
    learnHiragana: 'ふりこと タイミング',
    size: { x: 0.5, y: 0.5 },
    material: 'metal',
    rotatable: false,
    angleSnap: ANGLE_SNAP,
    unlockStage: 13,
    color: PALETTE.hammer,
    accent: PALETTE.hammerAccent,
    hammer: { armLength: 1.5, headRadius: 0.32, amplitude: 1.05, periodSec: 1.9 },
  },
};

/** トレイや ずかんに ならべる じゅんばん */
export const PART_ORDER: readonly PartKind[] = [
  'plate',
  'spring',
  'fan',
  'conveyor',
  'domino',
  'pipe',
  'hammer',
];

export function getPart(kind: PartKind): PartConfig {
  return PARTS[kind];
}

/** そのステージ番号までに つかえるようになった パーツ */
export function partsUnlockedBy(stageNumber: number): PartKind[] {
  return PART_ORDER.filter((kind) => PARTS[kind].unlockStage <= stageNumber);
}

/** パーツが しめる おおよその はんい（配置バリデーション・トレイ表示用） */
export function partFootprint(kind: PartKind): Vec2Like {
  const part = PARTS[kind];
  if (part.kind === 'pipe') return { x: part.size.x, y: part.size.y };
  return part.size;
}

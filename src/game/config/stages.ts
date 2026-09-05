import type {
  BallSpawn,
  CoinSpot,
  GoalZone,
  PartAllowance,
  PartKind,
  Placement,
  StageConfig,
  StageTheme,
  SurfaceMaterial,
  TerrainPiece,
} from '@/types';
import { PALETTE } from './palette';

/**
 * ぜん 15 ステージの 宣言的な定義。
 *
 * ここには「ステージのかたち」と「そうていかい（solution）」を データとして かく。
 * そうていかいで ★3 が とれることは tests/unit/stages-solvable.test.ts が
 * じどうで 検証するので、ステージを いじったら かならず テストを まわすこと。
 */

export const BOUNDS = { minX: -10, maxX: 10, minY: -6.5, maxY: 7.5 };
export const STAGE_COUNT = 15;

/** かくどスナップ 1 きざみ（15 ど）。そうていかいを よみやすく するため */
const SNAP = Math.PI / 12;

/** どのステージも おなじ 出発点。子供が すぐ おぼえられるようにする */
const SPAWN: BallSpawn = { id: 'ball', x: -8.8, y: 5.4, color: PALETTE.ball };
const SPAWN_B: BallSpawn = { id: 'ball2', x: -8.8, y: 0.5, color: PALETTE.ballAlt };

function box(
  x: number,
  y: number,
  w: number,
  h: number,
  angle = 0,
  material: SurfaceMaterial = 'wood',
): TerrainPiece {
  return { x, y, w, h, angle, material };
}

function metal(x: number, y: number, w: number, h: number, angle = 0): TerrainPiece {
  return box(x, y, w, h, angle, 'metal');
}

/** じめん。うえの めんは y + 0.35 */
function ground(x: number, y: number, w: number): TerrainPiece {
  return box(x, y, w, 0.7, 0, 'wood');
}

/** どのステージにも ある スタートレール */
function startRail(): TerrainPiece[] {
  return [metal(-7.7, 4.3, 3.4, 0.3, -0.25), metal(-9.35, 4.95, 0.3, 1.6)];
}

/** 2 個めのボール用の スタートレール */
function startRailB(): TerrainPiece[] {
  return [metal(-7.7, -0.6, 3.4, 0.3, -0.25), metal(-9.35, 0.05, 0.3, 1.6)];
}

interface Basket {
  terrain: TerrainPiece[];
  goal: GoalZone;
}

/**
 * うえが あいた かご。ボールは うえから おちて入る。
 * よこから ころがってきても かべに はばまれるので、
 * 「うえから おとす」ことが どのステージでも 共通の めあてに なる。
 */
function basket(id: string, x: number, floorTop: number, acceptsBallId?: string): Basket {
  const innerHalf = 1.0;
  const wallH = 0.75;
  const wallT = 0.16;
  const funnelLength = 2.4;
  const funnelAngle = 0.66;
  const wallCenterX = innerHalf + wallT / 2;
  const funnelDx = (funnelLength / 2) * Math.cos(funnelAngle);
  const funnelDy = (funnelLength / 2) * Math.sin(funnelAngle);
  return {
    terrain: [
      box(x, floorTop - 0.15, innerHalf * 2 + wallT * 2, 0.3),
      box(x - wallCenterX, floorTop + wallH / 2, wallT, wallH),
      box(x + wallCenterX, floorTop + wallH / 2, wallT, wallH),
      // ボールを かごへ みちびく ろうと。すこし ずれても はいる
      box(x - wallCenterX - funnelDx, floorTop + wallH + funnelDy, funnelLength, 0.16, -funnelAngle),
      box(x + wallCenterX + funnelDx, floorTop + wallH + funnelDy, funnelLength, 0.16, funnelAngle),
    ],
    goal: { id, x, y: floorTop + 0.6, radius: 1.0, kind: 'safe', acceptsBallId },
  };
}

function coin(id: string, x: number, y: number): CoinSpot {
  return { id, x, y, radius: 0.42 };
}

function allow(kind: PartKind, limit: number): PartAllowance {
  return { kind, limit };
}

function place(id: string, kind: PartKind, x: number, y: number, angle = 0): Placement {
  return { id, kind, x, y, angle };
}

const THEME_WOOD: StageTheme = { sky: 0xdbeafe, floor: PALETTE.floor, accent: PALETTE.plate };
const THEME_GREEN: StageTheme = { sky: 0xd8efe2, floor: PALETTE.floor, accent: PALETTE.spring };
const THEME_BLUE: StageTheme = { sky: 0xd2e9f7, floor: PALETTE.floor, accent: PALETTE.fan };
const THEME_AMBER: StageTheme = { sky: 0xf6e7cf, floor: PALETTE.floor, accent: PALETTE.conveyorAccent };
const THEME_NIGHT: StageTheme = { sky: 0xdcd6f2, floor: PALETTE.floorDark, accent: PALETTE.hammer };

interface StageSeed {
  id: string;
  stageNumber: number;
  nameHiragana: string;
  hintHiragana: string;
  extraTerrain: TerrainPiece[];
  baskets: Basket[];
  balls: BallSpawn[];
  coins: CoinSpot[];
  availableParts: PartAllowance[];
  parPartCount: number;
  solution: Placement[];
  theme: StageTheme;
  /** 2 個めのボール用の スタートレールも つける */
  secondRail?: boolean;
}

function buildStage(seed: StageSeed): StageConfig {
  return {
    id: seed.id,
    stageNumber: seed.stageNumber,
    nameHiragana: seed.nameHiragana,
    hintHiragana: seed.hintHiragana,
    bounds: BOUNDS,
    terrain: [
      ...startRail(),
      ...(seed.secondRail ? startRailB() : []),
      ...seed.extraTerrain,
      ...seed.baskets.flatMap((b) => b.terrain),
    ],
    balls: seed.balls,
    goals: seed.baskets.map((b) => b.goal),
    coins: seed.coins,
    availableParts: seed.availableParts,
    parPartCount: seed.parPartCount,
    solution: seed.solution,
    theme: seed.theme,
  };
}

/** かごを ささえる ほそい はしら */
function pedestal(x: number, topY: number): TerrainPiece {
  const bottom = BOUNDS.minY - 0.5;
  return box(x, (topY + bottom) / 2, 0.8, topY - bottom);
}

/** てんじょうから ぶらさがる かべ。bottomY より したは あいている */
function hangWall(x: number, bottomY: number): TerrainPiece {
  const top = BOUNDS.maxY + 0.5;
  return box(x, (top + bottomY) / 2, 0.5, top - bottomY);
}

/** ゆかから のびる はしら。topY より うえは あいている */
function floorPillar(x: number, topY: number): TerrainPiece {
  const bottom = BOUNDS.minY - 0.5;
  return box(x, (topY + bottom) / 2, 0.5, topY - bottom);
}

/** うかんでいる ゆか */
function slab(x: number, y: number, w: number): TerrainPiece {
  return box(x, y, w, 0.4);
}

const SEEDS: StageSeed[] = [
  {
    id: 'st-01',
    stageNumber: 1,
    nameHiragana: 'ころがして ゴール',
    hintHiragana: 'いたを ななめに おいて ボールの みちを つくろう',
    extraTerrain: [pedestal(3.2, -3.15)],
    baskets: [basket('goal', 3.2, -3.0)],
    balls: [SPAWN],
    coins: [coin('c1', -5.62, 4.17), coin('c2', -2.32, 1.32), coin('c3', 0.68, -0.24)],
    availableParts: [allow('plate', 3)],
    parPartCount: 1,
    solution: [place('p1', 'plate', -2.75, 0.75, SNAP * 11)],
    theme: THEME_WOOD,
  },
  {
    id: 'st-02',
    stageNumber: 2,
    nameHiragana: 'かべを よけて',
    hintHiragana: 'うえの かべの したを とおって、したの はしらを こえよう',
    extraTerrain: [hangWall(-0.6, 0.9), pedestal(4.8, -3.15)],
    baskets: [basket('goal', 4.8, -3.0)],
    balls: [SPAWN],
    coins: [coin('c1', -5.85, 4.28), coin('c2', -2.60, 0.24), coin('c3', 1.67, -0.28)],
    availableParts: [allow('plate', 5)],
    parPartCount: 2,
    solution: [place('p1', 'plate', -4.25, 0, SNAP * 11), place('p2', 'plate', -0.25, -0.5, 0)],
    theme: THEME_WOOD,
  },
  {
    id: 'st-03',
    stageNumber: 3,
    nameHiragana: 'ジグザグ さかみち',
    hintHiragana: 'いたを なんまいか つないで ジグザグに おろそう',
    extraTerrain: [
      hangWall(-2.6, 2.1),
      floorPillar(1.4, -2.6),
      pedestal(5.4, -3.65),
    ],
    baskets: [basket('goal', 5.4, -3.5)],
    balls: [SPAWN],
    coins: [coin('c1', -6.19, 4.38), coin('c2', -3.28, 1.42), coin('c3', 1.29, -0.10)],
    availableParts: [allow('plate', 5)],
    parPartCount: 2,
    solution: [place('p1', 'plate', 0.25, -0.25, SNAP * 11), place('p2', 'plate', -3, 0.75, SNAP * 11)],
    theme: THEME_WOOD,
  },
  {
    id: 'st-04',
    stageNumber: 4,
    nameHiragana: 'ぼいんで とびあがれ',
    hintHiragana: 'ゴールが たかい！ ジャンプだいで はねあがろう',
    extraTerrain: [pedestal(5.2, 1.45)],
    baskets: [basket('goal', 5.2, 1.6)],
    balls: [SPAWN],
    coins: [coin('c1', -6.07, 4.35), coin('c2', -4.64, 4.12), coin('c3', 0.64, 5.17)],
    availableParts: [allow('plate', 3), allow('spring', 2)],
    parPartCount: 1,
    solution: [place('p1', 'spring', -4.5, 3, SNAP * 15)],
    theme: THEME_GREEN,
  },
  {
    id: 'st-05',
    stageNumber: 5,
    nameHiragana: 'もっと たかい ところへ',
    hintHiragana: 'かべを よけながら うえの かごを めざそう',
    extraTerrain: [hangWall(0.4, 2.2), pedestal(7.2, 2.65)],
    baskets: [basket('goal', 7.2, 2.8)],
    balls: [SPAWN],
    coins: [coin('c1', -5.39, 4.00), coin('c2', 1.39, 1.59), coin('c3', 4.18, 5.48)],
    availableParts: [allow('plate', 4), allow('spring', 3)],
    parPartCount: 3,
    solution: [place('p1', 'spring', 1.75, 0.5, SNAP * 19), place('p2', 'spring', -4.75, 1.5, SNAP * 15), place('p3', 'spring', 5.25, -1.25, SNAP * 1)],
    theme: THEME_GREEN,
  },
  {
    id: 'st-06',
    stageNumber: 6,
    nameHiragana: 'ぼいん ぼいん',
    hintHiragana: 'なんかい はねれば とどくかな？',
    extraTerrain: [
      hangWall(-2.0, 1.4),
      slab(1.4, -2.6, 3.2),
      floorPillar(4.6, -0.6),
      pedestal(7.6, 1.05),
    ],
    baskets: [basket('goal', 7.6, 1.2)],
    balls: [SPAWN],
    coins: [coin('c1', -5.05, 3.65), coin('c2', 0.38, 0.84), coin('c3', 4.36, 5.07)],
    availableParts: [allow('plate', 4), allow('spring', 3)],
    parPartCount: 2,
    solution: [place('p1', 'spring', -3.5, -1.25, SNAP * 18), place('p2', 'spring', 1.25, 0, SNAP * 5)],
    theme: THEME_GREEN,
  },
  {
    id: 'st-07',
    stageNumber: 7,
    nameHiragana: 'かぜで おして',
    hintHiragana: 'せんぷうきの かぜで ボールを とおくへ おそう',
    extraTerrain: [floorPillar(0.8, -1.0), pedestal(8.2, -3.35)],
    baskets: [basket('goal', 8.2, -3.2)],
    balls: [SPAWN],
    coins: [coin('c1', -6.40, 4.43), coin('c2', -0.78, 1.10), coin('c3', 5.99, -0.54)],
    availableParts: [allow('plate', 3), allow('fan', 2)],
    parPartCount: 1,
    solution: [place('p1', 'fan', -8.25, 3.25, 0)],
    theme: THEME_BLUE,
  },
  {
    id: 'st-08',
    stageNumber: 8,
    nameHiragana: 'かぜと ジャンプ',
    hintHiragana: 'とんでいる あいだに かぜで おしてみよう',
    extraTerrain: [hangWall(2.0, 1.6), pedestal(7.8, 0.85)],
    baskets: [basket('goal', 7.8, 1.0)],
    balls: [SPAWN],
    coins: [coin('c1', -3.82, 1.36), coin('c2', 2.32, 0.21), coin('c3', 4.60, 4.42)],
    availableParts: [allow('plate', 3), allow('spring', 2), allow('fan', 2)],
    parPartCount: 3,
    solution: [place('p1', 'spring', 0.5, -4.5, SNAP * 12), place('p2', 'plate', -3.75, -0.5, SNAP * 21), place('p3', 'fan', 2.5, -2.75, SNAP * 6)],
    theme: THEME_BLUE,
  },
  {
    id: 'st-09',
    stageNumber: 9,
    nameHiragana: 'かぜで もどれ',
    hintHiragana: 'かぜは ひだりむきにも できる。もどってこよう',
    extraTerrain: [floorPillar(-4.6, -0.8), floorPillar(-8.6, -1.8), pedestal(-6.6, -3.55)],
    baskets: [basket('goal', -6.6, -3.4)],
    balls: [SPAWN],
    coins: [coin('c1', -4.27, 2.38), coin('c2', -5.47, 0.08), coin('c3', -8.43, -1.46)],
    availableParts: [allow('plate', 4), allow('fan', 3)],
    parPartCount: 1,
    solution: [place('p1', 'fan', -2.75, -1, SNAP * 9)],
    theme: THEME_BLUE,
  },
  {
    id: 'st-10',
    stageNumber: 10,
    nameHiragana: 'ベルトで はこべ',
    hintHiragana: 'ながい ゆかは ベルトコンベアで はこぶと はやいよ',
    extraTerrain: [slab(0.0, -2.2, 10.4), pedestal(8.4, -3.95)],
    baskets: [basket('goal', 8.4, -3.8)],
    balls: [SPAWN],
    coins: [coin('c1', -2.53, -1.43), coin('c2', -0.89, 1.95), coin('c3', 3.96, 5.43)],
    availableParts: [allow('plate', 3), allow('conveyor', 2)],
    parPartCount: 1,
    solution: [place('p1', 'conveyor', -1, 0, SNAP * 5)],
    theme: THEME_AMBER,
  },
  {
    id: 'st-11',
    stageNumber: 11,
    nameHiragana: 'ドミノで おしだせ',
    hintHiragana: 'ドミノを ならべると たおれながら ボールを おしてくれる',
    extraTerrain: [slab(0.4, -2.2, 11.6), pedestal(8.8, -4.55)],
    baskets: [basket('goal', 8.8, -4.4)],
    balls: [SPAWN],
    coins: [coin('c1', -1.26, -1.06), coin('c2', 3.24, -1.70), coin('c3', 5.92, -1.70)],
    availableParts: [allow('plate', 3), allow('domino', 6), allow('conveyor', 1)],
    parPartCount: 1,
    solution: [place('p1', 'domino', -5, 2.5, 0)],
    theme: THEME_AMBER,
  },
  {
    id: 'st-12',
    stageNumber: 12,
    nameHiragana: 'ベルトと ドミノ',
    hintHiragana: 'はこんで、おして、さいごは たかい かごへ',
    extraTerrain: [slab(-1.6, -2.4, 7.6), floorPillar(3.0, -1.2), pedestal(7.4, -0.55)],
    baskets: [basket('goal', 7.4, -0.4)],
    balls: [SPAWN],
    coins: [coin('c1', -5.62, 4.17), coin('c2', -1.95, 3.67), coin('c3', 3.45, 5.23)],
    availableParts: [
      allow('plate', 4),
      allow('spring', 2),
      allow('conveyor', 2),
      allow('domino', 5),
    ],
    parPartCount: 1,
    solution: [place('p1', 'conveyor', -3.25, -0.5, SNAP * 8)],
    theme: THEME_AMBER,
  },
  {
    id: 'st-13',
    stageNumber: 13,
    nameHiragana: 'パイプを とおれ',
    hintHiragana: 'ほそい たてあなは パイプで まがると とおれるよ',
    extraTerrain: [
      box(-1.35, 2.2, 0.4, 5.0),
      box(1.35, 2.2, 0.4, 5.0),
      slab(3.6, -1.2, 4.2),
      pedestal(7.4, -3.85),
    ],
    baskets: [basket('goal', 7.4, -3.7)],
    balls: [SPAWN],
    coins: [coin('c1', -4.04, 1.89), coin('c2', 2.29, -0.70), coin('c3', 5.23, -0.70)],
    availableParts: [allow('plate', 4), allow('pipe', 2)],
    parPartCount: 1,
    solution: [place('p1', 'pipe', -2, -2.25, SNAP * 3)],
    theme: THEME_NIGHT,
  },
  {
    id: 'st-14',
    stageNumber: 14,
    nameHiragana: 'ふりこで うちだせ',
    hintHiragana: 'つかえるのは ふりこハンマーだけ。うちだす タイミングを かんがえよう',
    extraTerrain: [slab(-1.6, -2.6, 8.0), pedestal(6.4, -5.15)],
    baskets: [basket('goal', 6.4, -5.0)],
    balls: [SPAWN],
    coins: [coin('c1', -4.94, 3.51), coin('c2', -0.79, -1.82), coin('c3', 3.63, -2.28)],
    availableParts: [allow('hammer', 3)],
    parPartCount: 1,
    solution: [place('p1', 'hammer', -4.5, -1.5, 0)],
    theme: THEME_NIGHT,
  },
  {
    id: 'st-15',
    stageNumber: 15,
    nameHiragana: 'ふたつの ボール',
    hintHiragana: 'あかい ボールと あおい ボールを それぞれの かごへ！',
    extraTerrain: [pedestal(2.4, -4.15), pedestal(7.8, -1.75)],
    baskets: [basket('goal-a', 2.4, -4.0, 'ball'), basket('goal-b', 7.8, -1.6, 'ball2')],
    balls: [SPAWN, SPAWN_B],
    coins: [coin('c1', -5.50, 4.09), coin('c2', -2.58, 0.08), coin('c3', 6.75, 3.13)],
    availableParts: [
      allow('plate', 6),
      allow('spring', 3),
      allow('fan', 2),
      allow('conveyor', 2),
      allow('pipe', 2),
      allow('hammer', 2),
      allow('domino', 4),
    ],
    parPartCount: 3,
    solution: [place('p1', 'plate', 5.25, -4.75, SNAP * 18), place('p2', 'fan', -4.75, -2.25, SNAP * 3), place('p3', 'spring', -3.25, -0.75, SNAP * 12)],
    theme: THEME_NIGHT,
    secondRail: true,
  },
];

export const STAGES: StageConfig[] = SEEDS.map(buildStage);

export function getStage(id: string): StageConfig | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getStageByNumber(n: number): StageConfig | undefined {
  return STAGES.find((s) => s.stageNumber === n);
}

export { coin, place, basket, ground, box, metal };

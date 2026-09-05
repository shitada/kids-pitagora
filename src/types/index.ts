/**
 * プロジェクト全体で共有する型。
 * 物理コア（src/game/physics）は Three.js に依存しないため、
 * ここでも Three.js 由来の型は使わない。
 */

export interface Vec2Like {
  x: number;
  y: number;
}

export type PartKind =
  | 'plate'
  | 'spring'
  | 'fan'
  | 'conveyor'
  | 'domino'
  | 'pipe'
  | 'hammer';

export type SurfaceMaterial = 'wood' | 'metal' | 'rubber';

/** プレイヤーが盤面に置いた 1 個のパーツ */
export interface Placement {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  /** ラジアン。0 はパーツ定義の基準姿勢 */
  angle: number;
}

// --- パーツ定義 -------------------------------------------------------------

export interface SpringParams {
  /** 法線方向に保証する打ち出し速度 */
  launchSpeed: number;
}

export interface FanParams {
  /** 風がとどく距離 */
  reach: number;
  /** 風のはば */
  width: number;
  /** 加速度（m/s^2） */
  force: number;
}

export interface ConveyorParams {
  /** ベルト表面の速度。正でローカル +X 方向 */
  surfaceSpeed: number;
}

export interface DominoParams {
  height: number;
  halfThickness: number;
  /** となりのドミノに連鎖する最大きょり */
  chainReach: number;
  /** 連鎖するときに伝える角速度の割合 */
  transfer: number;
}

export interface PipeParams {
  /** 基準姿勢でのレール中心線。先頭が入口、末尾が出口 */
  path: readonly Vec2Like[];
  /** 管の内径（ボールが通れる半径） */
  radius: number;
  /** 入口の吸いこみ半径 */
  mouthRadius: number;
  /** 管の中での最低速度 */
  minSpeed: number;
}

export interface HammerParams {
  armLength: number;
  headRadius: number;
  /** 振れはば（ラジアン） */
  amplitude: number;
  /** 1 往復にかかる秒数 */
  periodSec: number;
}

interface PartConfigBase {
  nameHiragana: string;
  emoji: string;
  /** ずかんの一言解説 */
  zukanHiragana: string;
  /** ずかんの「まなべること」 */
  learnHiragana: string;
  /** 見た目・当たり判定の基本サイズ */
  size: Vec2Like;
  material: SurfaceMaterial;
  rotatable: boolean;
  /** 回転スナップ（ラジアン） */
  angleSnap: number;
  /** このパーツが つかえるようになるステージ番号 */
  unlockStage: number;
  color: number;
  accent: number;
}

export type PartConfigOf<K extends PartKind> = Extract<PartConfig, { kind: K }>;

export type PartConfig =
  | (PartConfigBase & { kind: 'plate' })
  | (PartConfigBase & { kind: 'spring'; spring: SpringParams })
  | (PartConfigBase & { kind: 'fan'; fan: FanParams })
  | (PartConfigBase & { kind: 'conveyor'; conveyor: ConveyorParams })
  | (PartConfigBase & { kind: 'domino'; domino: DominoParams })
  | (PartConfigBase & { kind: 'pipe'; pipe: PipeParams })
  | (PartConfigBase & { kind: 'hammer'; hammer: HammerParams });

// --- ステージ定義 -----------------------------------------------------------

export interface StageBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface TerrainPiece {
  x: number;
  y: number;
  /** はば（全長） */
  w: number;
  /** たかさ（全長） */
  h: number;
  angle: number;
  material: SurfaceMaterial;
  color?: number;
  /** かざり用で当たり判定を持たない */
  decorative?: boolean;
}

export interface BallSpawn {
  id: string;
  x: number;
  y: number;
  color?: number;
}

export type GoalKind = 'safe' | 'rocket';

export interface GoalZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: GoalKind;
  /** この ID のボールだけを うけつける。未指定ならどれでもよい */
  acceptsBallId?: string;
}

export interface CoinSpot {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface PartAllowance {
  kind: PartKind;
  limit: number;
}

export interface StageTheme {
  sky: number;
  floor: number;
  accent: number;
}

export interface StageConfig {
  id: string;
  stageNumber: number;
  nameHiragana: string;
  hintHiragana: string;
  bounds: StageBounds;
  terrain: readonly TerrainPiece[];
  balls: readonly BallSpawn[];
  goals: readonly GoalZone[];
  coins: readonly CoinSpot[];
  availableParts: readonly PartAllowance[];
  /** ★2 の基準。つかったパーツ数がこれ以下なら ★2 がつく */
  parPartCount: number;
  /** ★3 が とれる そうていかい。テストで検証する */
  solution: readonly Placement[];
  theme: StageTheme;
}

// --- シミュレーション結果 ---------------------------------------------------

export type SimEndReason = 'cleared' | 'timeout' | 'out-of-bounds' | 'settled';

export interface SimResult {
  cleared: boolean;
  /** あつめた ★コインの ID */
  coinsCollected: readonly string[];
  allCoins: boolean;
  usedParts: number;
  /** 0〜3 */
  stars: number;
  ticks: number;
  seconds: number;
  endReason: SimEndReason;
}

// --- セーブデータ -----------------------------------------------------------

export interface SandboxSlot {
  name: string;
  placements: Placement[];
  savedAt: number;
}

export interface SaveData {
  version: 1;
  /** あそべる いちばん先のステージ番号（1〜15） */
  unlockedStage: number;
  /** stageId -> 0〜3 */
  stageStars: Record<string, number>;
  seenParts: PartKind[];
  sandboxSlots: (SandboxSlot | null)[];
  sfxVolume: number;
  bgmVolume: number;
  allClearCelebrated: boolean;
}

// --- 配置バリデーション -----------------------------------------------------

export type PlacementRejection =
  | 'out-of-bounds'
  | 'overlaps-part'
  | 'overlaps-terrain'
  | 'blocks-goal'
  | 'blocks-spawn'
  | 'limit-reached'
  | 'not-available';

export interface PlacementCheck {
  ok: boolean;
  reason?: PlacementRejection;
  /** ひらがなの りゆう */
  messageHiragana?: string;
}

import type { SurfaceMaterial } from '@/types';

/**
 * 物理シミュレーションのパラメータをここに集約する。
 * ここ以外の場所に重力・反発・摩擦などの数値を書かないこと。
 *
 * 単位系: 長さ = メートル、時間 = 秒。
 * ステージは おおよそ 20m x 12m の たてよこ。
 */

/** 固定タイムステップ。描画フレームレートから完全に独立させる */
export const FIXED_DT = 1 / 120;

/** 1 フレームで消化する固定ステップの上限（スパイラル防止） */
export const MAX_STEPS_PER_FRAME = 8;

/** 下向きを負とした重力加速度 */
export const GRAVITY_Y = -12;

/** 速度に比例する空気抵抗の係数（1/秒） */
export const AIR_DRAG = 0.05;

/** ボールの速さの上限。数値が爆発しないようにする */
export const MAX_SPEED = 26;

/** ボールの半径 */
export const BALL_RADIUS = 0.3;

/** 貫入を解消するときに残す あそび */
export const PENETRATION_SLOP = 0.002;

/** 貫入の解消率（1 で完全に押し出す） */
export const PENETRATION_CORRECTION = 1;

/** これ以下の法線速度では はねさせない（じりじり震えるのを防ぐ） */
export const RESTITUTION_CUTOFF = 0.6;

/** 接触中に接線方向へかかる ころがり抵抗（1/秒） */
export const ROLLING_RESISTANCE = 0.3;

/** 「とまった」と判定する速さ */
export const REST_SPEED = 0.22;

/** REST_SPEED 未満が この tick 数つづいたら 停止とみなす */
export const REST_TICKS = 150;

/** シミュレーションの打ち切り時間 */
export const MAX_SIM_SECONDS = 30;

/** ゴール判定に必要な、ゴール中心からのきょりの割合 */
export const GOAL_ENTER_RATIO = 0.95;

/** 材質ごとの反発係数 */
export const RESTITUTION: Record<SurfaceMaterial, number> = {
  wood: 0.3,
  metal: 0.46,
  rubber: 0.72,
};

/** 材質ごとの接線方向の摩擦（1 衝突あたりに失う割合） */
export const TANGENT_FRICTION: Record<SurfaceMaterial, number> = {
  wood: 0.08,
  metal: 0.03,
  rubber: 0.16,
};

/** ボールどうしの反発係数 */
export const BALL_RESTITUTION = 0.4;

/** ドミノの重力トルク係数に使う重力の大きさ */
export const DOMINO_GRAVITY = 12;

/** ドミノが たおれきったと みなす かたむき（ラジアン） */
export const DOMINO_MAX_LEAN = 1.42;

/** ドミノが「たおれはじめた」と みなす かたむき */
export const DOMINO_TRIGGER_LEAN = 0.16;

/** ドミノが となりを たおすときの さいしょの角速度 */
export const DOMINO_KICK_OMEGA = 2.6;

/** ボールが ドミノを たおすのに ひつような よこ速度 */
export const DOMINO_PUSH_SPEED = 0.9;

/** パイプから出たあと、すぐに 入りなおさないための tick 数 */
export const PIPE_COOLDOWN_TICKS = 24;

/** パイプの中での さいだい速度 */
export const PIPE_MAX_SPEED = 14;

/** ジャンプだいが 連続で はたらかないようにする tick 数 */
export const SPRING_COOLDOWN_TICKS = 10;

/** 配置スナップ（メートル） */
export const PLACE_GRID = 0.25;

/** 角度スナップ（ラジアン）。15 度 */
export const ANGLE_SNAP = Math.PI / 12;

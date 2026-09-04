/**
 * 色覚に配慮したパレット。
 *
 * ベースは Okabe-Ito のカラーユニバーサルデザイン推奨色。
 * 色だけで情報を伝えないよう、UI 側では かならず 絵文字・形・文字を そえること。
 */

export const PALETTE = {
  // 背景・地形
  sky: 0xdbeafe,
  skyDeep: 0xbfd8ee,
  floor: 0x7d8aa5,
  floorDark: 0x5b6580,
  wall: 0x9aa6bd,
  factory: 0x2b3a67,

  // パーツ（Okabe-Ito ベース。となり合う色は輝度差を つける）
  plate: 0xc98f4b, // き（オレンジ寄り）
  plateAccent: 0x8a5a26,
  spring: 0x009e73, // みどり
  springAccent: 0x00674c,
  fan: 0x56b4e9, // そらいろ
  fanAccent: 0x1f6f9c,
  conveyor: 0x4a4f5c, // こいグレー
  conveyorAccent: 0xe69f00, // だいだい
  domino: 0xcc79a7, // ピンク
  dominoAccent: 0x8c3f6d,
  pipe: 0xf0e442, // きいろ
  pipeAccent: 0xa89b17,
  hammer: 0xd55e00, // あか寄りのだいだい
  hammerAccent: 0x8c3e00,

  // ゲーム要素
  ball: 0xee6c4d,
  ballAccent: 0xfff3e6,
  ballAlt: 0x0072b2,
  ballAltAccent: 0xe6f2ff,
  goal: 0x8ec5a4,
  goalAccent: 0x2f6b4a,
  coin: 0xf4d35e,
  coinAccent: 0xa8862a,

  // UI
  uiInk: 0x22314f,
  uiPaper: 0xfdfbf5,
  uiPrimary: 0x2b3a67,
  uiAccent: 0xee6c4d,
  uiGood: 0x009e73,
  uiWarn: 0xd55e00,
} as const;

/** 0xRRGGBB を CSS の #rrggbb にする */
export function css(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/** UI で つかう文字色つきのボタン配色 */
export const UI = {
  ink: css(PALETTE.uiInk),
  paper: css(PALETTE.uiPaper),
  primary: css(PALETTE.uiPrimary),
  accent: css(PALETTE.uiAccent),
  good: css(PALETTE.uiGood),
  warn: css(PALETTE.uiWarn),
  sky: css(PALETTE.sky),
  skyDeep: css(PALETTE.skyDeep),
  coin: css(PALETTE.coin),
} as const;

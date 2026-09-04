# ⚙️ ころころピタゴラこうじょう — Kids Pitagora Factory

5〜10歳向けの3D物理パズル。パーツをおいて、ボールをゴールまで はこぼう！

🎮 プレイはこちら → https://shitada.github.io/kids-pitagora/

iPad Safari での横向きプレイに最適化されています。

---

## ゲーム概要

- ⚙️ **おく → ▶ためす → なおす** の くりかえしで ゴールを めざす物理パズル
- 🎯 ボールは じぶんで うごかせない。**そうちを つくって** はこぶのが しごと
- 🧩 いた・ジャンプだい・せんぷうき・ベルトコンベア・ドミノ・パイプ・ふりこハンマー の7パーツ
- 🏁 ぜん15ステージ。すすむほど つかえるパーツが ふえる
- ⭐ ステージごとに ★3つ（クリア / パーツすくなく / ★コインぜんぶ）
- 🛠️ **じゆうこうさく** モードで すきなように そうちを つくれる（ほぞんできる）
- 📖 **はつめいずかん** でパーツのしくみを まなべる
- 🎆 ぜんステージクリアで はなび演出！

## 技術スタック

| カテゴリ | 技術 |
| --- | --- |
| 3D 描画 | [Three.js](https://threejs.org/) v0.170 |
| 言語 | TypeScript 5.7（`strict: true`） |
| ビルド | [Vite](https://vite.dev/) 6 |
| テスト | [Vitest](https://vitest.dev/) 3 + jsdom |
| 物理 | 自前実装の 2.5D 固定平面ソルバー（外部エンジン非依存 / 決定論的） |
| サウンド | Web Audio API（プログラマティック生成） |
| フォント | [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic)（OFL-1.1） |
| デプロイ | GitHub Pages + GitHub Actions |

## 開発

```bash
npm install
npm run dev
npm test
npm run build
```

## シリーズ

同じ技術スタック・デザイン思想の kids シリーズ：

- [kids-crane-catch](https://github.com/shitada/kids-crane-catch) — クレーンキャッチ
- [universe-kids-race](https://github.com/shitada/universe-kids-race) — うちゅうキッズレース
- [kids-fps-game](https://github.com/shitada/kids-fps-game) — スプラッシュキッズバトル
- [kids-proseca](https://github.com/shitada/kids-proseca) — とうきょう でんしゃビート！

## ライセンス

- ソースコード：MIT License
- フォント（Zen Maru Gothic）：SIL Open Font License 1.1

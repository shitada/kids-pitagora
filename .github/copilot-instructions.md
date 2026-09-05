# Copilot 向けの短い常時指示

## プロジェクト概要

5〜10歳向けのブラウザ 3D 物理パズル **ころころピタゴラこうじょう**。
プレイヤーはボールを直接操作できない。ステージにパーツを置いて装置を組み立て、
「▶ スタート」で物理シミュレーションを走らせ、ボールをゴールへ運ぶ。

**コアループ: おく → ▶ためす → なおす → クリア**

## 技術スタック

- Three.js v0.170（プロシージャル 3D。外部 3D アセット不使用）
- TypeScript 5.7（`strict: true`）
- Vite 6（`base: '/kids-pitagora/'`）
- Vitest 3 + jsdom（ユニットテスト）
- 物理は自前実装の **2.5D 固定平面ソルバー**（外部物理エンジン不使用）
- Web Audio API（プログラマティック合成。音源ファイル不使用）
- GitHub Pages + GitHub Actions でデプロイ

## 常時守る禁止事項

- 暴力・流血・怖い表現は入れない。失敗しても責める文言にしない。
- 課金・広告・外部通信・チャット・ユーザー間交流は入れない。
- 実在するテレビ番組・キャラクター・ロゴ・音源を想起させるものを作らない。
  「ピタゴラ」は装置ジャンルを表す一般語としてのみ使い、ビジュアルと音楽は完全オリジナル。
- UI 文言は **ひらがな中心**。漢字を使わない。
- `strict: true` 前提。`any` を増やさない。
- `src/game/physics/` は **Three.js を import しない**。純粋な数値計算に保つ。
- 物理コアで `Math.random()` を使わない。決定論を壊さない。

## 詳細ルール

長い実務ルールは常時コンテキストに入れず、用途別 Skill と custom agent に分ける。

- 専用 custom agent: `.github/agents/pitagora-kids-game.agent.md`
- 子供向け安全性・UX: `.github/skills/pitagora-kids-design-safety/SKILL.md`
- 物理コアと決定論: `.github/skills/pitagora-kids-physics-determinism/SKILL.md`
- TypeScript / ゲームシステム設計: `.github/skills/pitagora-kids-systems-architecture/SKILL.md`
- テスト・レビュー・ライセンス確認: `.github/skills/pitagora-kids-validation-workflow/SKILL.md`

## 開発手順

```bash
npm install
npm run dev     # ローカル開発
npm test        # Vitest（15 ステージの ★3 検証を含む）
npm run build   # tsc + vite build
npm run preview # 本番プレビュー
```

**ステージ定義や物理パラメータを触ったら、必ず `npm test` を通すこと。**
`tests/unit/stages-solvable.test.ts` が全 15 ステージの想定解で ★3 が取れることを検証している。

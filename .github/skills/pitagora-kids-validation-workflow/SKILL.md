---
name: pitagora-kids-validation-workflow
description: テスト・ビルド・レビュー・ライセンス確認・コミット前チェック
---

# 検証と作業の流れ

## 変更したら必ず走らせるもの

```bash
npm run build   # tsc --noEmit + vite build。strict エラーを 1 つも残さない
npm test        # Vitest。15 ステージの ★3 検証を含む
```

変更の種類ごとの最低ライン:

| 変えたもの | 走らせるもの |
| --- | --- |
| `src/game/physics/` | `npm test`（全部）。物理は他のすべてに影響する |
| `src/game/config/stages.ts` | `npm test`（`stages-solvable.test.ts` が要） |
| `src/game/config/parts.ts` / `physics.ts` | `npm test`（全部） |
| `src/game/render/` / `src/ui/` | `npm run build` + `npm run dev` で目視 |
| ドキュメントのみ | 不要 |

## テストの考え方

- 物理コアはテストで固める。`tests/unit/` に:
  - `vec2.test.ts` — ベクトル演算
  - `collision.test.ts` — 円 vs OBB / Capsule / Circle
  - `physics-world.test.ts` — 重力・決定論・転がり・トンネリング・7 パーツの挙動
  - `stages-solvable.test.ts` — **全 15 ステージが想定解で ★3 になる**
  - `parts.test.ts` / `config.test.ts` / `save.test.ts` / `audio.test.ts`
- **テストを緩めて通さない。** ステージが解けなくなったら、地形を優しくするか解を作り直す。
- 新しいパーツを足したら、その挙動のテストと、少なくとも 1 つのステージ解を必ず追加する。

## レビューで見るところ

- `src/game/physics/` に Three.js の import や `Math.random()` が混ざっていないか
- 物理の数値が `config/physics.ts` の外に散っていないか
- UI 文言に漢字が混ざっていないか
- Three.js のジオメトリ／マテリアルを `dispose()` し忘れていないか
- `enter()` で足したリスナーを `exit()` で外しているか

## ライセンス

- ソースコードは MIT。
- フォントは Zen Maru Gothic（SIL Open Font License 1.1）。Google Fonts から CDN 読み込み。
- **音源ファイル・3D モデル・画像アセットを追加しない。** すべてコードで生成する。
- 依存は `three` のみ。増やすときは本当に必要か検討し、ライセンスを確認する。

## コミット

- 1 コミット 1 目的。ステージ調整と機能追加を混ぜない。
- `npm run build` と `npm test` が通ってからコミットする。
- `dist/` や `node_modules/` を追跡しない（`.gitignore` 済み）。

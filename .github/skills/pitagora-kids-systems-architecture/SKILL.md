---
name: pitagora-kids-systems-architecture
description: TypeScript の型設計、シーン管理、描画・入力・保存の分離ルール
---

# システム設計

## レイヤーの分離

```
src/types/            すべての共有型
src/game/config/      数値とステージデータ（physics / parts / stages / palette）
src/game/physics/     Three.js 非依存の決定論ソルバー
src/game/parts/       Placement → ワールド実体への展開・配置バリデーション
src/game/render/      Three.js の描画だけ。物理計算をしない
src/game/input/       Pointer Events の処理だけ
src/game/audio/       Web Audio API だけ
src/game/scenes/      画面遷移とゲーム進行
src/game/storage/     localStorage
src/ui/               DOM の UI 部品
```

**依存の向きは 上から下へ。** `physics` は `render` を知らないし、`config` は何も import しない
（`palette` と `types` を除く）。

## 型

- `strict: true`。`any` を増やさない。
- パーツ設定は **判別可能ユニオン** にする。
  `PARTS: { [K in PartKind]: PartConfigOf<K> }` にしてあるので `PARTS.pipe.pipe` が型安全に読める。
  `Record<PartKind, PartConfig>` に戻すと絞り込みが効かなくなる。
- ステージは `StageConfig` のデータとして宣言する。ロジックにハードコードしない。

## シーン管理

`kids-fps-game` と同じパターン:

```ts
interface GameScene {
  enter(ctx: SceneContext): void | Promise<void>;
  update?(dt: number): void;
  resize?(width: number, height: number): void;
  exit(): void | Promise<void>;
}
```

- `App`（`src/main.ts`）が唯一の `requestAnimationFrame` ループを持つ。
- シーンは `ctx.goto(target)` で遷移する。`SceneTarget` は判別可能ユニオン。
- `enter` で作った DOM は `exit` で必ず片付ける。リスナーも外す。

## 描画

- `FactoryRenderer` はステージ・配置・ランタイムの状態を読んでメッシュへ写すだけ。
- パーツの 3D モデルは `partMeshes.ts` にコードで作る。外部アセットを追加しない。
- ジオメトリとマテリアルは `dispose()` する。シーン切り替えでリークさせない。
- 画面座標 ↔ ワールド座標は `screenToWorld()` / `worldToScreen()` を使う。
  シミュレーション平面は z = 0 なので、レイと平面の交差で正確に求まる。

## 入力

- Pointer Events に統一する（マウス・タッチ・ペンで同じコード）。
- 配置は `PLACE_GRID` にスナップ、角度は各パーツの `angleSnap` にスナップする。
- 置ける／置けないの判定は `canPlace()` に集約する。理由はひらがなで返す。

## 保存

- `SaveStorage` は localStorage が使えなくても落ちない。すべての操作を例外安全にする。
- 読み込んだ JSON は必ず `sanitize()` で検証してから使う。壊れていれば初期値に戻す。
- バージョン付きキー（`kids-pitagora:save-v1`）。スキーマを変えるときは番号を上げて移行を書く。

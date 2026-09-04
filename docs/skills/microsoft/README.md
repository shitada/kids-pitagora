# Microsoft 公式資料 — 索引

本プロジェクトで参考にした Microsoft の公開資料です。**本文は転載せず**、要約と出典 URL のみを掲載します。

| 資料 | 概要（本プロジェクトでの使いどころ） | URL |
| --- | --- | --- |
| TypeScript Handbook | `strict` オプション群、判別可能ユニオン、マップ型。`PartConfigOf<K>` の設計に直結 | https://www.typescriptlang.org/docs/handbook/intro.html |
| TypeScript — Narrowing | 判別可能ユニオンの絞り込み。パーツ設定を型安全に読むために採用 | https://www.typescriptlang.org/docs/handbook/2/narrowing.html |
| TypeScript — Mapped Types | `{ [K in PartKind]: PartConfigOf<K> }` の根拠 | https://www.typescriptlang.org/docs/handbook/2/mapped-types.html |
| GitHub Docs — Repository custom instructions | `.github/copilot-instructions.md` の書き方と適用範囲 | https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot |
| GitHub Docs — GitHub Pages with Actions | `deploy.yml` の `configure-pages` / `upload-pages-artifact` / `deploy-pages` の組み合わせ | https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site |

## 本プロジェクトへの反映

- **`strict: true` + `noUnusedLocals`**: 使われないコードを残さない。
- **判別可能ユニオン**: `PartConfig` を `kind` で判別するユニオンにし、
  `PARTS.pipe.pipe` のようなアクセスを型安全にした。`Record<PartKind, PartConfig>` では絞り込めない。
- **常時インストラクションは短く**: 詳細は Skill に分け、`copilot-instructions.md` は 1 画面に収めた。
- **Pages デプロイ**: `kids-fps-game` と同じ Actions 構成を踏襲。

## ライセンス注意

TypeScript Handbook のサンプルコードは Apache-2.0 / CC-BY-4.0 で提供されていますが、
本プロジェクトは概念のみを参考にし、コードを転載していません。

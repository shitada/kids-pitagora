# 🧠 公式ベストプラクティス資料 — INDEX

このディレクトリには、本プロジェクト（**ころころピタゴラこうじょう** — TypeScript + Three.js + Vite のブラウザ物理パズル）の
設計・開発で役立つ、Microsoft / Google / OpenAI / Anthropic 各社の **公式資料** への索引を整理して収録しています。

## 取扱方針（重要）

各社の公式ドキュメントは多くがコピー再配布不可です。本ディレクトリでは以下の方針を取ります：

1. **本文の全文コピーは行わない**。代わりに「要約 + 公式リンク + ライセンス情報」を整理して掲載します。
2. すべての参照には必ず **出典 URL** を明示します。
3. **公開された API / フォーマット仕様**（例：AGENTS.md コミュニティ仕様、TypeScript Handbook のサンプルコード、
   web.dev のオープンソースサンプル）は、各社が公開しているライセンス（多くは CC-BY 4.0 / Apache-2.0 / MIT）に従って参照します。

## 構成

```
docs/skills/
├── README.md                     # このファイル
├── anthropic/                    # Claude / Skills / Prompt Engineering
│   └── README.md
├── openai/                       # GPT / Codex / Cookbook
│   └── README.md
├── microsoft/                    # Copilot / AGENTS.md / TypeScript
│   └── README.md
└── google/                       # web.dev / WebGL / Material / a11y
    └── README.md
```

## このプロジェクトでどう使うか

実装時に Copilot が直接参照する実務ルールは、長い常時インストラクションではなく
`.github/skills/` に用途別 Skill として整理しています。

| Copilot カスタマイズ | 役割 |
| --- | --- |
| `.github/agents/pitagora-kids-game.agent.md` | このゲーム専用の custom agent |
| `.github/skills/pitagora-kids-design-safety/SKILL.md` | 子供向け安全性・UX・ことば・むずかしさ |
| `.github/skills/pitagora-kids-physics-determinism/SKILL.md` | 2.5D ソルバーと決定論 |
| `.github/skills/pitagora-kids-systems-architecture/SKILL.md` | TypeScript strict・レイヤー分離・シーン管理 |
| `.github/skills/pitagora-kids-validation-workflow/SKILL.md` | テスト・ビルド・レビュー・ライセンス |

下記の企業別資料は、それら Skill の背景資料・出典集です。

## シリーズ内での位置づけ

同じ設計思想の kids シリーズ（`kids-fps-game` / `kids-proseca` / `kids-crane-catch` / `universe-kids-race`）と
ディレクトリ構成・コーディング規約・デプロイ手順を揃えています。
新しく参加する人は、まず `.github/copilot-instructions.md` を読んでください。

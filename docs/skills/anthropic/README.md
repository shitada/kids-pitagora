# Anthropic 公式資料 — 索引

本プロジェクトで参考にした Anthropic の公開資料です。**本文は転載せず**、要約と出典 URL のみを掲載します。

| 資料 | 概要（本プロジェクトでの使いどころ） | URL |
| --- | --- | --- |
| Claude Docs — Agent Skills | スキルを用途別フォルダに分け、`SKILL.md` にフロントマターと手順を書く形式。`.github/skills/` の構成はこの考え方に合わせている | https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills |
| Claude Docs — Prompt engineering overview | 役割・制約・出力形式を明示する書き方。custom agent の記述に反映 | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview |
| Claude Docs — Use XML tags | 長い指示を構造化するときのタグ活用 | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags |
| Claude Docs — Be clear and direct | 曖昧さを避けた指示の書き方。`copilot-instructions.md` の「絶対に守ること」節に反映 | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct |

## 本プロジェクトへの反映

- **Skill を用途で分ける**: 常時インストラクションは短く保ち、詳細は 4 本の Skill に分割した。
- **禁止事項を先に書く**: 子供向けの安全性と決定論の制約を、実装ルールより前に置いている。
- **具体例を添える**: ことばのルールは ✅ / ❌ の実例で示す。

## ライセンス注意

Anthropic の公式ドキュメントは著作物です。本ディレクトリでは要約とリンクのみを扱い、
本文をソースコードやドキュメントへ転載しません。

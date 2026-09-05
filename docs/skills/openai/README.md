# OpenAI 公式資料 — 索引

本プロジェクトで参考にした OpenAI の公開資料です。**本文は転載せず**、要約と出典 URL のみを掲載します。

| 資料 | 概要（本プロジェクトでの使いどころ） | URL |
| --- | --- | --- |
| OpenAI Cookbook | 実装レシピ集。MIT ライセンスのサンプルが多く、引用時はライセンス表記を確認する | https://cookbook.openai.com/ |
| OpenAI Platform — Prompt engineering | 指示・文脈・出力形式の分離。エージェント向け指示の設計に反映 | https://platform.openai.com/docs/guides/prompt-engineering |
| AGENTS.md | エージェント向けリポジトリ指示のコミュニティ仕様。`copilot-instructions.md` の粒度の参考 | https://agents.md/ |

## 本プロジェクトへの反映

- **指示は「何を作るか」と「何をしてはいけないか」を分けて書く**。
- **検証手順を指示に含める**: `npm run build` と `npm test` をどのタイミングで走らせるかを明記した。
- **エージェントに自己検証させる**: ステージを変えたら必ずテストを通す、というルールを Skill に落とした。

## ライセンス注意

OpenAI Cookbook のコードは MIT ライセンスで公開されていますが、
本プロジェクトは外部サンプルコードを取り込んでいません。すべて自前実装です。

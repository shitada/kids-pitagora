# Google 公式資料 — 索引

本プロジェクトで参考にした Google の公開資料です。**本文は転載せず**、要約と出典 URL のみを掲載します。

| 資料 | 概要（本プロジェクトでの使いどころ） | URL |
| --- | --- | --- |
| web.dev — Rendering performance | フレーム予算と `requestAnimationFrame`。固定タイムステップ + accumulator の設計根拠 | https://web.dev/articles/rendering-performance |
| web.dev — Pointer events | マウス・タッチ・ペンを 1 本のコードで扱う。`PlacementInput` はこの方針 | https://web.dev/articles/pointer-events |
| web.dev — Touch action | `touch-action: none` でブラウザのスクロール／ズームを抑える | https://developer.mozilla.org/docs/Web/CSS/touch-action |
| web.dev — Accessible colors | コントラストと、色以外の手がかりの併用 | https://web.dev/articles/color-and-contrast-accessibility |
| Web Audio API（MDN / W3C 仕様） | `OscillatorNode` / `GainNode` / `BiquadFilterNode` / `AudioBufferSourceNode` の合成 | https://developer.mozilla.org/docs/Web/API/Web_Audio_API |
| Google Fonts — Zen Maru Gothic | 丸ゴシック日本語フォント。SIL Open Font License 1.1 | https://fonts.google.com/specimen/Zen+Maru+Gothic |

## 本プロジェクトへの反映

- **描画と物理の分離**: 物理は固定 1/120 秒、描画は `requestAnimationFrame`。
  フレームレートが落ちても物理の結果が変わらない。
- **Pointer Events に統一**: iPad のタッチと PC のマウスで同じコードパスを通す。
- **色覚配慮**: Okabe-Ito ベースのパレットに加え、絵文字・形・文字で情報を二重化した。
- **フォント**: Zen Maru Gothic を CDN 読み込み。OFL-1.1 のためライセンス表記を README に記載。

## ライセンス注意

web.dev の記事本文は CC-BY 4.0、サンプルコードは Apache-2.0 で提供されています。
本プロジェクトは概念のみを参考にし、コードを転載していません。
Zen Maru Gothic は SIL Open Font License 1.1 に従って利用しています。

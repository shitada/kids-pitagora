#!/usr/bin/env python3
"""ころころピタゴラこうじょう のアイコンを生成する。

favicon.svg と同じデザイン言語（ボール / 黄色のランプ / 歯車 / 緑のランプ / ゴール）を
高解像度で描き、iOS / Android / ブラウザ向けの PNG を書き出す。

再生成するには（Pillow が必要）:

    python3 tools/make_icons.py public

出力先は Vite の publicDir である `public/` を指定すること。
`public/` に置いたファイルはハッシュを付けられずに dist/ 直下へそのままコピーされるため、
iOS が参照する `/apple-touch-icon.png` のような固定パスを保てる。

apple-touch-icon 系は iOS が自動で角丸マスクをかけるので、
意図的に「角丸なし・透過なしのベタ塗り正方形」で書き出している
（角丸を焼き込むと二重に丸まって縁が欠ける）。

maskable-512x512.png は Android の maskable アイコン用。
Android は外周およそ 10% を切り落とす（安全領域＝中央 80% の円）ので、
絵柄を中央基準で縮めて余白を作った専用版を書き出す。
背景はフルブリードのベタ塗りで、角丸も透過も付けない。
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image, ImageDraw

SS = 8  # スーパーサンプリング倍率
GRID = 64.0

# Android の maskable アイコンは 外周およそ 10% が けずられる（安全領域＝中央 80% の円）。
# 絵柄を これだけ ちぢめて 余白を つくる。
# 0.74 だと 絵柄の いちばん 外の 画素が 中心から 211.8px（安全半径 204.8px）で
# はみ出したので、実測して 0.70 まで しぼった。
MASKABLE_CONTENT_SCALE = 0.70

NAVY = (43, 58, 103)
NAVY_DARK = (26, 36, 68)
YELLOW = (244, 211, 94)
YELLOW_DARK = (206, 172, 62)
ORANGE = (238, 108, 77)
ORANGE_DARK = (198, 78, 52)
GREEN = (142, 197, 164)
GREEN_DARK = (105, 158, 127)
BLUE = (159, 201, 232)


def draw_icon(px: int, rounded: bool, content_scale: float = 1.0) -> Image.Image:
    """px 四方のアイコンを描く。

    rounded=True なら角丸にする（favicon 用）。
    content_scale は絵柄だけを中央基準で縮める倍率で、
    maskable アイコンのように外周に余白が要るときに 1.0 未満を渡す。
    背景のグラデーションは常にフルブリードのまま。
    """
    n = px * SS
    s = n / GRID  # 64 グリッド -> ピクセル

    if content_scale == 1.0:
        # 既存の出力とバイト単位で一致させるため、等倍のときは変換を挟まない
        def gp(v: float) -> float:
            """64 グリッドの座標 -> ピクセル"""
            return v * s
    else:
        def gp(v: float) -> float:
            return (32.0 + (v - 32.0) * content_scale) * s

    def gl(v: float) -> float:
        """64 グリッドの長さ（半径・太さ）-> ピクセル"""
        return v * content_scale * s

    img = Image.new("RGB", (n, n), NAVY)
    d = ImageDraw.Draw(img)

    # 背景をたてのグラデーションにする
    for y in range(n):
        t = y / max(1, n - 1)
        d.line(
            [(0, y), (n, y)],
            fill=tuple(round(NAVY[i] + (NAVY_DARK[i] - NAVY[i]) * t) for i in range(3)),
        )

    def plank(x1, y1, x2, y2, w, color, shade):
        """まるい はしの いた を かく（下側に影をつけて立体感を出す）。"""
        for dy, col in ((w * 0.28, shade), (0.0, color)):
            a = (gp(x1), gp(y1 + dy))
            b = (gp(x2), gp(y2 + dy))
            r = gl(w) / 2
            d.line([a, b], fill=col, width=round(gl(w)))
            for cx, cy in (a, b):
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

    def ball(cx, cy, r, color, shade):
        d.ellipse(
            [gp(cx - r), gp(cy - r), gp(cx + r), gp(cy + r)], fill=shade
        )
        d.ellipse(
            [gp(cx - r), gp(cy - r), gp(cx + r * 0.86), gp(cy + r * 0.86)],
            fill=color,
        )
        hr = r * 0.30
        hx, hy = cx - r * 0.34, cy - r * 0.38
        d.ellipse(
            [gp(hx - hr), gp(hy - hr), gp(hx + hr), gp(hy + hr)],
            fill=(255, 255, 255),
        )

    def gear(cx, cy, r, teeth=8):
        for i in range(teeth):
            a = 2 * math.pi * i / teeth
            tx, ty = cx + math.cos(a) * r * 1.16, cy + math.sin(a) * r * 1.16
            tr = r * 0.26
            d.ellipse(
                [gp(tx - tr), gp(ty - tr), gp(tx + tr), gp(ty + tr)], fill=BLUE
            )
        d.ellipse([gp(cx - r), gp(cy - r), gp(cx + r), gp(cy + r)], fill=BLUE)
        hr = r * 0.36
        d.ellipse(
            [gp(cx - hr), gp(cy - hr), gp(cx + hr), gp(cy + hr)], fill=NAVY
        )

    # ゴールのかご（したの ほう）
    gx, gy, gw, gh = 7.0, 49.5, 21.0, 10.0
    d.rounded_rectangle(
        [gp(gx), gp(gy), gp(gx + gw), gp(gy + gh)],
        radius=gl(3.4),
        fill=YELLOW_DARK,
    )
    d.rounded_rectangle(
        [gp(gx), gp(gy), gp(gx + gw), gp(gy + gh * 0.66)],
        radius=gl(3.0),
        fill=YELLOW,
    )

    gear(47.5, 21.0, 8.2)
    plank(5.0, 25.0, 33.5, 38.5, 6.0, YELLOW, YELLOW_DARK)
    plank(57.5, 40.0, 31.0, 51.0, 6.0, GREEN, GREEN_DARK)
    # ボールは 黄色いいたの うえに ぴったり のせる（ころがりだす ところ）
    ball(14.6, 17.4, 8.0, ORANGE, ORANGE_DARK)

    img = img.resize((px, px), Image.LANCZOS)

    if rounded:
        # favicon は角丸にする（apple-touch-icon は iOS 側でマスクされるので四角のまま）
        mask = Image.new("L", (px * 4, px * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, px * 4 - 1, px * 4 - 1], radius=px * 4 * 0.22, fill=255
        )
        out = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask.resize((px, px), Image.LANCZOS))
        return out

    return img


def main() -> int:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out_dir, exist_ok=True)

    # apple-touch-icon: 透過なし・角丸なしの ベタ塗り正方形（iOS が自動でマスクする）
    for name, px in (
        ("apple-touch-icon.png", 180),
        ("apple-touch-icon-180x180.png", 180),
        ("apple-touch-icon-167x167.png", 167),
        ("apple-touch-icon-152x152.png", 152),
    ):
        draw_icon(px, rounded=False).save(os.path.join(out_dir, name), optimize=True)

    # favicon / PWA: 角丸の透過 PNG
    for name, px in (
        ("favicon-192x192.png", 192),
        ("favicon-512x512.png", 512),
    ):
        draw_icon(px, rounded=True).save(os.path.join(out_dir, name), optimize=True)

    # maskable: Android が 外周およそ 10% を けずるので、絵柄を 74% に ちぢめて
    # 中央 80% の 安全領域に おさめる。背景は フルブリードの ベタ塗り。
    draw_icon(512, rounded=False, content_scale=MASKABLE_CONTENT_SCALE).save(
        os.path.join(out_dir, "maskable-512x512.png"), optimize=True
    )

    for f in sorted(os.listdir(out_dir)):
        if f.endswith(".png"):
            p = os.path.join(out_dir, f)
            print(f"{f:32s} {os.path.getsize(p):>7,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

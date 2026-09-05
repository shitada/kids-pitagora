import { STAGE_COUNT } from '@/game/config/stages';
import { UI } from '@/game/config/palette';
import { bigButton, el, heading, screen, subText } from '@/ui/widgets';
import type { GameScene, SceneContext } from './Scene';

export class TitleScene implements GameScene {
  private root: HTMLDivElement | null = null;

  enter(ctx: SceneContext): void {
    ctx.renderer.clearStage();
    ctx.renderer.setRunning(false);
    ctx.audio.startBgm('home');

    const root = screen(
      `linear-gradient(180deg, rgba(219,234,254,0.88), rgba(191,216,238,0.94))`,
    );

    const title = heading('');
    title.innerHTML = '⚙️ ころころ<br/>ピタゴラこうじょう';
    root.appendChild(title);
    root.appendChild(subText('パーツを おいて ボールを ゴールまで はこぼう！'));

    const buttons = el('div', 'display:flex;flex-direction:column;gap:12px;align-items:center;');
    buttons.appendChild(
      bigButton('▶ ステージを あそぶ', () => {
        ctx.audio.resume();
        ctx.audio.playSfx('click');
        ctx.goto({ id: 'stage-select' });
      }),
    );

    const row = el('div', 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;');
    row.appendChild(
      bigButton(
        '🛠️ じゆうこうさく',
        () => {
          ctx.audio.resume();
          ctx.audio.playSfx('click');
          ctx.goto({ id: 'sandbox' });
        },
        UI.good,
      ),
    );
    row.appendChild(
      bigButton(
        '📖 はつめいずかん',
        () => {
          ctx.audio.resume();
          ctx.audio.playSfx('click');
          ctx.goto({ id: 'zukan' });
        },
        UI.primary,
      ),
    );
    buttons.appendChild(row);
    root.appendChild(buttons);

    const save = ctx.save.get();
    const progress = el(
      'div',
      `margin-top:clamp(14px,3vw,26px);font-size:clamp(12px,2.4vw,17px);font-weight:700;
       background:rgba(253,251,245,0.9);border-radius:999px;padding:6px 16px;color:${UI.ink};`,
      `クリア ${ctx.save.clearedCount()} / ${STAGE_COUNT}　⭐ ${ctx.save.totalStars()} / ${STAGE_COUNT * 3}`,
    );
    root.appendChild(progress);

    root.appendChild(this.volumeRow(ctx));

    if (ctx.save.warning) {
      root.appendChild(
        el(
          'div',
          `margin-top:10px;font-size:12px;color:${UI.warn};font-weight:700;text-align:center;max-width:80vw;`,
          ctx.save.warning,
        ),
      );
    }

    if (save.allClearCelebrated) {
      root.appendChild(
        el(
          'div',
          `margin-top:10px;font-size:clamp(13px,2.6vw,18px);font-weight:900;color:${UI.warn};`,
          '🎆 ぜんステージ クリア！ すごい！',
        ),
      );
    }

    ctx.uiOverlay.appendChild(root);
    this.root = root;
  }

  exit(): void {
    this.root?.remove();
    this.root = null;
  }

  private volumeRow(ctx: SceneContext): HTMLDivElement {
    const row = el(
      'div',
      `margin-top:12px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;
       font-size:clamp(11px,2.2vw,15px);font-weight:700;color:${UI.ink};`,
    );
    row.appendChild(this.slider('🔊 おと', ctx.save.get().sfxVolume, (v) => {
      ctx.audio.setSfxVolume(v);
      ctx.save.update({ sfxVolume: v });
    }));
    row.appendChild(this.slider('🎵 きょく', ctx.save.get().bgmVolume, (v) => {
      ctx.audio.setBgmVolume(v);
      ctx.save.update({ bgmVolume: v });
    }));
    return row;
  }

  private slider(label: string, value: number, onChange: (v: number) => void): HTMLDivElement {
    const wrap = el('div', 'display:flex;align-items:center;gap:6px;');
    wrap.appendChild(el('span', '', label));
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.1';
    input.value = String(value);
    input.style.cssText = 'width:96px;';
    input.addEventListener('input', () => onChange(Number(input.value)));
    wrap.appendChild(input);
    return wrap;
  }
}

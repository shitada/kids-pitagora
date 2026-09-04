import { STAGES } from '@/game/config/stages';
import { PARTS } from '@/game/config/parts';
import { css, UI } from '@/game/config/palette';
import { el, FONT, heading, screen, smallButton, starRow } from '@/ui/widgets';
import type { GameScene, SceneContext } from './Scene';

export class StageSelectScene implements GameScene {
  private root: HTMLDivElement | null = null;

  enter(ctx: SceneContext): void {
    ctx.renderer.clearStage();
    ctx.renderer.setRunning(false);
    ctx.audio.startBgm('home');

    const root = screen(`linear-gradient(180deg, rgba(219,234,254,0.92), rgba(191,216,238,0.96))`);
    root.style.justifyContent = 'flex-start';

    const bar = el('div', 'display:flex;align-items:center;gap:12px;width:100%;max-width:960px;margin-bottom:10px;');
    bar.appendChild(
      smallButton('← ホーム', () => {
        ctx.audio.playSfx('click');
        ctx.goto({ id: 'title' });
      }),
    );
    const title = heading('ステージを えらぼう');
    title.style.fontSize = 'clamp(20px,4.4vw,34px)';
    title.style.margin = '0';
    title.style.flex = '1';
    bar.appendChild(title);
    bar.appendChild(
      el(
        'div',
        `font-size:clamp(12px,2.4vw,16px);font-weight:900;color:${UI.ink};
         background:rgba(253,251,245,0.9);border-radius:999px;padding:5px 13px;white-space:nowrap;`,
        `⭐ ${ctx.save.totalStars()}`,
      ),
    );
    root.appendChild(bar);

    const grid = el(
      'div',
      `display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;
       width:100%;max-width:960px;padding-bottom:20px;`,
    );

    const unlocked = ctx.save.get().unlockedStage;
    for (const stage of STAGES) {
      const isUnlocked = stage.stageNumber <= unlocked;
      const stars = ctx.save.starsFor(stage.id);
      const cardEl = el(
        'button',
        `font-family:${FONT};display:flex;flex-direction:column;align-items:center;gap:5px;
         padding:11px 8px;border-radius:16px;border:none;cursor:${isUnlocked ? 'pointer' : 'not-allowed'};
         background:${isUnlocked ? UI.paper : '#c9d2df'};color:${UI.ink};
         box-shadow:0 4px 0 rgba(0,0,0,0.14);opacity:${isUnlocked ? 1 : 0.75};touch-action:manipulation;`,
      );

      cardEl.appendChild(
        el('div', `font-size:20px;font-weight:900;color:${UI.primary};`, isUnlocked ? `${stage.stageNumber}` : '🔒'),
      );
      cardEl.appendChild(
        el('div', 'font-size:11px;font-weight:700;text-align:center;line-height:1.3;min-height:28px;',
          isUnlocked ? stage.nameHiragana : 'まだ あそべない'),
      );
      if (isUnlocked) {
        cardEl.appendChild(starRow(stars, 15));
        const chips = el('div', 'display:flex;gap:3px;flex-wrap:wrap;justify-content:center;');
        for (const allowance of stage.availableParts) {
          const part = PARTS[allowance.kind];
          chips.appendChild(
            el(
              'div',
              `font-size:12px;background:${css(part.color)};border-radius:6px;padding:1px 4px;`,
              part.emoji,
            ),
          );
        }
        cardEl.appendChild(chips);
      }

      if (isUnlocked) {
        cardEl.addEventListener('click', () => {
          ctx.audio.resume();
          ctx.audio.playSfx('click');
          ctx.goto({ id: 'play', stageNumber: stage.stageNumber });
        });
      }
      grid.appendChild(cardEl);
    }

    root.appendChild(grid);
    ctx.uiOverlay.appendChild(root);
    this.root = root;
  }

  exit(): void {
    this.root?.remove();
    this.root = null;
  }
}

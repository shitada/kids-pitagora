import type { Placement } from '@/types';
import { SANDBOX_SLOT_COUNT } from '@/game/storage/SaveStorage';
import { UI } from '@/game/config/palette';
import { createDialog, el, smallButton } from '@/ui/widgets';
import { PlayScene } from './PlayScene';
import type { GameScene, SceneContext } from './Scene';

/**
 * じゆうこうさく。
 * ぜんぶの パーツを むせいげんで つかえて、3つの スロットに ほぞんできる。
 */
export class SandboxScene implements GameScene {
  private play: PlayScene | null = null;
  private dialog: ReturnType<typeof createDialog> | null = null;
  private ctx!: SceneContext;

  enter(ctx: SceneContext): void {
    this.ctx = ctx;
    this.dialog = createDialog(ctx.uiOverlay);

    this.play = new PlayScene(0, {
      sandbox: true,
      onBack: () => ctx.goto({ id: 'title' }),
      onExtraControls: (bar, getPlacements, load) => {
        bar.appendChild(
          smallButton('💾 ほぞん', () => {
            ctx.audio.playSfx('click');
            this.openSlots('save', getPlacements, load);
          }, UI.good),
        );
        bar.appendChild(
          smallButton('📂 よみこみ', () => {
            ctx.audio.playSfx('click');
            this.openSlots('load', getPlacements, load);
          }),
        );
        bar.appendChild(
          smallButton('🧹 ぜんぶ けす', () => {
            ctx.audio.playSfx('delete');
            load([]);
          }, UI.warn),
        );
      },
    });
    this.play.enter(ctx);
  }

  update(dt: number): void {
    this.play?.update(dt);
  }

  resize(): void {
    this.play?.resize?.();
  }

  exit(): void {
    this.play?.exit();
    this.play = null;
    this.dialog?.destroy();
    this.dialog = null;
  }

  private openSlots(
    mode: 'save' | 'load',
    getPlacements: () => Placement[],
    load: (placements: Placement[]) => void,
  ): void {
    this.dialog?.open((body, close) => {
      body.appendChild(
        el(
          'div',
          `font-size:clamp(17px,3.4vw,24px);font-weight:900;color:${UI.primary};margin-bottom:10px;`,
          mode === 'save' ? '💾 どこに ほぞんする？' : '📂 どれを よみこむ？',
        ),
      );

      for (let i = 0; i < SANDBOX_SLOT_COUNT; i++) {
        const slot = this.ctx.save.loadSandbox(i);
        const row = el(
          'div',
          `display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:8px;
           background:#f2f5fa;border-radius:14px;`,
        );
        row.appendChild(
          el(
            'div',
            'flex:1;font-size:clamp(13px,2.6vw,17px);font-weight:700;line-height:1.4;',
            slot
              ? `${i + 1}. ${slot.name}（パーツ ${slot.placements.length}こ）`
              : `${i + 1}. からっぽ`,
          ),
        );

        if (mode === 'save') {
          row.appendChild(
            smallButton('ほぞん', () => {
              this.ctx.save.saveSandbox(i, `さくひん ${i + 1}`, getPlacements());
              this.ctx.audio.playSfx('unlock');
              close();
            }, UI.good),
          );
          if (slot) {
            row.appendChild(
              smallButton('けす', () => {
                this.ctx.save.clearSandbox(i);
                this.ctx.audio.playSfx('delete');
                close();
              }, UI.warn),
            );
          }
        } else {
          const button = smallButton('よみこむ', () => {
            const target = this.ctx.save.loadSandbox(i);
            if (!target) return;
            load(target.placements);
            this.ctx.audio.playSfx('place');
            close();
          });
          if (!slot) {
            button.disabled = true;
            button.style.opacity = '0.4';
          }
          row.appendChild(button);
        }

        body.appendChild(row);
      }

      const footer = el('div', 'display:flex;justify-content:flex-end;margin-top:6px;');
      footer.appendChild(smallButton('とじる', close));
      body.appendChild(footer);
    });
  }
}

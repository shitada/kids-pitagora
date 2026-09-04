import type { SimResult } from '@/types';
import { STAGE_COUNT, getStageByNumber } from '@/game/config/stages';
import { PARTS, PART_ORDER } from '@/game/config/parts';
import { UI } from '@/game/config/palette';
import { Fireworks } from '@/game/render/Fireworks';
import { bigButton, el, heading, screen, smallButton, starRow } from '@/ui/widgets';
import type { GameScene, SceneContext } from './Scene';

export interface ResultSceneParams {
  stageId: string;
  stageNumber: number;
  result: SimResult;
  unlockedNew: boolean;
  allCleared: boolean;
}

export class ResultScene implements GameScene {
  private root: HTMLDivElement | null = null;
  private fireworks: Fireworks | null = null;

  constructor(private readonly params: ResultSceneParams) {}

  enter(ctx: SceneContext): void {
    const { result, stageNumber, allCleared } = this.params;
    ctx.renderer.setRunning(false);
    ctx.audio.startBgm('result');

    const celebrate = allCleared && !ctx.save.get().allClearCelebrated;
    if (allCleared) {
      this.fireworks = new Fireworks(ctx.renderer.effectsRoot);
      this.fireworks.start();
      ctx.audio.playSfx('fanfare');
      ctx.save.markAllClearCelebrated();
    }

    const root = screen('linear-gradient(180deg, rgba(253,251,245,0.9), rgba(219,234,254,0.94))');
    root.appendChild(heading(celebrate ? '🎆 ぜんぶ クリア！' : '🎉 クリア！'));

    const stars = starRow(result.stars, 48);
    stars.style.marginBottom = '6px';
    root.appendChild(stars);

    const detail = el(
      'div',
      `display:flex;flex-direction:column;gap:6px;background:${UI.paper};border-radius:18px;
       padding:14px 20px;box-shadow:0 4px 0 rgba(0,0,0,0.14);margin-bottom:16px;
       font-size:clamp(13px,2.6vw,18px);font-weight:700;min-width:min(90vw,340px);`,
    );
    const stage = getStageByNumber(stageNumber);
    detail.appendChild(
      this.line('①', 'ゴールできた', true),
    );
    detail.appendChild(
      this.line(
        '②',
        `パーツ ${result.usedParts}こ（${stage?.parPartCount ?? 0}こ いない）`,
        result.usedParts <= (stage?.parPartCount ?? 0),
      ),
    );
    detail.appendChild(
      this.line(
        '③',
        `★コイン ${result.coinsCollected.length} / ${stage?.coins.length ?? 0}`,
        result.allCoins,
      ),
    );
    detail.appendChild(
      el('div', `font-size:clamp(11px,2.2vw,15px);color:${UI.ink};opacity:0.75;`,
        `かかった じかん ${result.seconds.toFixed(1)} びょう`),
    );
    root.appendChild(detail);

    if (this.params.unlockedNew && stageNumber < STAGE_COUNT) {
      const nextStage = getStageByNumber(stageNumber + 1);
      const newParts = PART_ORDER.filter((kind) => PARTS[kind].unlockStage === stageNumber + 1);
      const banner = el(
        'div',
        `background:${UI.good};color:#fff;border-radius:14px;padding:9px 18px;font-weight:900;
         font-size:clamp(13px,2.6vw,18px);margin-bottom:14px;text-align:center;`,
        newParts.length > 0
          ? `🎁 あたらしい パーツ: ${newParts.map((k) => `${PARTS[k].emoji} ${PARTS[k].nameHiragana}`).join('、')}`
          : `▶ つぎは 「${nextStage?.nameHiragana ?? ''}」`,
      );
      root.appendChild(banner);
      if (newParts.length > 0) ctx.audio.playSfx('unlock');
    }

    const buttons = el('div', 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;');
    if (stageNumber < STAGE_COUNT) {
      buttons.appendChild(
        bigButton('▶ つぎへ', () => {
          ctx.audio.playSfx('click');
          ctx.goto({ id: 'play', stageNumber: stageNumber + 1 });
        }, UI.good),
      );
    }
    buttons.appendChild(
      bigButton('🔁 もういちど', () => {
        ctx.audio.playSfx('click');
        ctx.goto({ id: 'play', stageNumber });
      }),
    );
    root.appendChild(buttons);

    const subRow = el('div', 'display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;justify-content:center;');
    subRow.appendChild(
      smallButton('ステージいちらん', () => {
        ctx.audio.playSfx('click');
        ctx.goto({ id: 'stage-select' });
      }),
    );
    subRow.appendChild(
      smallButton('ホーム', () => {
        ctx.audio.playSfx('click');
        ctx.goto({ id: 'title' });
      }, UI.primary),
    );
    root.appendChild(subRow);

    ctx.uiOverlay.appendChild(root);
    this.root = root;
  }

  update(dt: number): void {
    this.fireworks?.update(dt);
  }

  exit(): void {
    this.fireworks?.dispose();
    this.fireworks = null;
    this.root?.remove();
    this.root = null;
  }

  private line(mark: string, text: string, achieved: boolean): HTMLDivElement {
    return el(
      'div',
      `display:flex;align-items:center;gap:8px;color:${achieved ? UI.good : UI.ink};`,
      `${achieved ? '★' : '☆'} ${mark} ${text}`,
    );
  }
}

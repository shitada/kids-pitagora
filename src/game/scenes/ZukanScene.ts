import type { PartKind, Placement, StageConfig } from '@/types';
import { PARTS, PART_ORDER } from '@/game/config/parts';
import { css, UI } from '@/game/config/palette';
import { FIXED_DT, MAX_STEPS_PER_FRAME } from '@/game/config/physics';
import { StageRuntime } from '@/game/physics/StageRuntime';
import { el, FONT, screen, smallButton } from '@/ui/widgets';
import type { GameScene, SceneContext } from './Scene';

/** ずかんの デモが 1 かい まわる じかん */
const DEMO_SECONDS = 5;

/**
 * はつめいずかん。
 *
 * つかえるようになった パーツの カードを ならべる。
 * えらぶと、ほんものの ぶつりエンジンで しくみが うごいて みられる。
 */
export class ZukanScene implements GameScene {
  private ctx!: SceneContext;
  private root: HTMLDivElement | null = null;
  private runtime: StageRuntime | null = null;
  private demoStage: StageConfig | null = null;
  private demoPlacements: Placement[] = [];
  private accumulator = 0;
  private elapsed = 0;
  private descriptionBox: HTMLDivElement | null = null;
  private cardRow: HTMLDivElement | null = null;

  enter(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.setRunning(true);
    ctx.audio.startBgm('home');

    const root = screen('linear-gradient(180deg, rgba(219,234,254,0.4), rgba(191,216,238,0.55))');
    root.style.justifyContent = 'space-between';
    root.style.pointerEvents = 'none';

    const topBar = el(
      'div',
      'display:flex;align-items:center;gap:10px;width:100%;max-width:960px;pointer-events:auto;',
    );
    topBar.appendChild(
      smallButton('← ホーム', () => {
        ctx.audio.playSfx('click');
        ctx.goto({ id: 'title' });
      }),
    );
    topBar.appendChild(
      el(
        'div',
        `flex:1;font-size:clamp(18px,4vw,30px);font-weight:900;color:${UI.primary};
         text-shadow:0 2px 0 rgba(255,255,255,0.8);`,
        '📖 はつめいずかん',
      ),
    );
    root.appendChild(topBar);

    const bottom = el('div', 'width:100%;max-width:960px;pointer-events:auto;');

    this.descriptionBox = el(
      'div',
      `background:${UI.paper};border-radius:18px;padding:13px 16px;margin-bottom:10px;
       box-shadow:0 4px 0 rgba(0,0,0,0.14);`,
    );
    bottom.appendChild(this.descriptionBox);

    this.cardRow = el(
      'div',
      'display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;justify-content:center;flex-wrap:wrap;',
    );
    bottom.appendChild(this.cardRow);
    root.appendChild(bottom);

    ctx.uiOverlay.appendChild(root);
    this.root = root;

    this.buildCards();
    this.select(this.firstUnlocked());
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= DEMO_SECONDS) this.restartDemo();
    if (!this.runtime) return;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.runtime.step();
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (this.accumulator > FIXED_DT * MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.ctx.renderer.syncRuntime(this.runtime);
  }

  exit(): void {
    this.root?.remove();
    this.root = null;
    this.runtime = null;
    this.ctx.renderer.setFrame();
    this.ctx.renderer.clearStage();
    this.ctx.renderer.setRunning(false);
  }

  // --- うちがわ ------------------------------------------------------------

  private firstUnlocked(): PartKind {
    const unlocked = PART_ORDER.filter((kind) => this.ctx.save.isPartUnlocked(kind));
    return unlocked[0] ?? 'plate';
  }

  private buildCards(): void {
    if (!this.cardRow) return;
    this.cardRow.replaceChildren();
    for (const kind of PART_ORDER) {
      const config = PARTS[kind];
      const unlocked = this.ctx.save.isPartUnlocked(kind);
      const card = el(
        'button',
        `font-family:${FONT};display:flex;flex-direction:column;align-items:center;gap:3px;
         min-width:78px;padding:9px 8px;border-radius:15px;border:3px solid transparent;
         background:${unlocked ? UI.paper : '#c9d2df'};color:${UI.ink};cursor:${unlocked ? 'pointer' : 'not-allowed'};
         box-shadow:0 3px 0 rgba(0,0,0,0.14);opacity:${unlocked ? 1 : 0.7};touch-action:manipulation;`,
      );
      card.dataset.kind = kind;
      card.appendChild(el('div', 'font-size:22px;line-height:1;', unlocked ? config.emoji : '🔒'));
      card.appendChild(
        el('div', 'font-size:11px;font-weight:700;text-align:center;', unlocked ? config.nameHiragana : 'まだ'),
      );
      card.appendChild(el('div', `width:24px;height:4px;border-radius:2px;background:${css(config.color)};`));
      if (unlocked) {
        card.addEventListener('click', () => {
          this.ctx.audio.playSfx('click');
          this.select(kind);
        });
      }
      this.cardRow.appendChild(card);
    }
  }

  private select(kind: PartKind): void {
    const config = PARTS[kind];

    if (this.cardRow) {
      for (const child of Array.from(this.cardRow.children)) {
        if (!(child instanceof HTMLElement)) continue;
        child.style.borderColor = child.dataset.kind === kind ? UI.accent : 'transparent';
      }
    }

    if (this.descriptionBox) {
      this.descriptionBox.replaceChildren(
        el(
          'div',
          `font-size:clamp(16px,3.2vw,23px);font-weight:900;color:${UI.primary};margin-bottom:4px;`,
          `${config.emoji} ${config.nameHiragana}`,
        ),
        el('div', 'font-size:clamp(13px,2.6vw,18px);line-height:1.6;', config.zukanHiragana),
        el(
          'div',
          `margin-top:6px;font-size:clamp(11px,2.2vw,15px);font-weight:700;color:${UI.good};`,
          `まなべること: ${config.learnHiragana}`,
        ),
      );
    }

    const demo = buildDemo(kind);
    this.demoStage = demo.stage;
    this.demoPlacements = demo.placements;
    this.ctx.renderer.setStage(demo.stage);
    this.ctx.renderer.syncPlacements(demo.placements);
    this.ctx.renderer.setFrame({ width: 11, height: 8.4, centerX: 0, centerY: 1.4 });
    this.restartDemo();
  }

  private restartDemo(): void {
    if (!this.demoStage) return;
    this.elapsed = 0;
    this.accumulator = 0;
    this.runtime = new StageRuntime(this.demoStage, this.demoPlacements, { freeplay: true });
    this.ctx.renderer.resetVisualState(this.demoStage);
  }
}

interface Demo {
  stage: StageConfig;
  placements: Placement[];
}

function demoStage(
  terrain: StageConfig['terrain'],
  ballX: number,
  ballY: number,
): StageConfig {
  return {
    id: 'zukan-demo',
    stageNumber: 0,
    nameHiragana: 'デモ',
    hintHiragana: '',
    bounds: { minX: -5.5, maxX: 5.5, minY: -3.4, maxY: 5.6 },
    terrain,
    balls: [{ id: 'ball', x: ballX, y: ballY }],
    goals: [],
    coins: [],
    availableParts: [],
    parPartCount: 0,
    solution: [],
    theme: { sky: 0xdbeafe, floor: 0x7d8aa5, accent: 0xee6c4d },
  };
}

function part(kind: PartKind, x: number, y: number, angle = 0): Placement {
  return { id: `demo-${kind}`, kind, x, y, angle };
}

/** パーツごとの しくみが よく わかる ちいさな デモ */
function buildDemo(kind: PartKind): Demo {
  const floor: StageConfig['terrain'] = [
    { x: 0, y: -3.1, w: 11, h: 0.6, angle: 0, material: 'wood' },
  ];

  switch (kind) {
    case 'plate':
      return {
        stage: demoStage(floor, -2.6, 4.4),
        placements: [part('plate', -1.6, 2.2, -0.34)],
      };
    case 'spring':
      return {
        stage: demoStage(floor, 0, 4.6),
        placements: [part('spring', 0, -2.5)],
      };
    case 'fan':
      return {
        stage: demoStage(floor, -1.6, 4.8),
        placements: [part('fan', -3.6, 1.4)],
      };
    case 'conveyor':
      return {
        stage: demoStage(floor, -3.2, 4.4),
        placements: [part('conveyor', -1.4, 0.4), part('conveyor', 1.4, 0.4)],
      };
    case 'domino':
      return {
        stage: demoStage(
          [
            { x: 0, y: -0.5, w: 10, h: 0.5, angle: 0, material: 'wood' },
          ],
          -4.2, 2.4,
        ),
        placements: [
          part('domino', -2.2, 0.33),
          part('domino', -1.35, 0.33),
          part('domino', -0.5, 0.33),
          part('domino', 0.35, 0.33),
          part('domino', 1.2, 0.33),
        ],
      };
    case 'pipe':
      return {
        stage: demoStage(floor, -1.2, 4.8),
        placements: [part('pipe', -1.2, 1.4)],
      };
    case 'hammer':
      return {
        stage: demoStage(
          [
            { x: 0, y: -0.5, w: 10, h: 0.5, angle: 0, material: 'wood' },
          ],
          -0.2, 1.4,
        ),
        placements: [part('hammer', 0, 3.2)],
      };
  }
}

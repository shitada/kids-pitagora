import type { Placement, PlacementCheck, StageConfig } from '@/types';
import { FIXED_DT, MAX_STEPS_PER_FRAME } from '@/game/config/physics';
import { PART_ORDER } from '@/game/config/parts';
import { getStageByNumber } from '@/game/config/stages';
import { UI } from '@/game/config/palette';
import { PlacementInput } from '@/game/input/PlacementInput';
import { canPlace, remainingCount } from '@/game/parts/placementRules';
import { StageRuntime, type RuntimeEvent } from '@/game/physics/StageRuntime';
import { PartTray } from '@/ui/PartTray';
import { PlayHud } from '@/ui/PlayHud';
import { createDialog, createToast, el, smallButton, type ToastHandle } from '@/ui/widgets';
import type { GameScene, SceneContext } from './Scene';

export interface PlaySceneOptions {
  /** じゆうこうさく モード */
  sandbox?: boolean;
  /** さいしょに よみこむ 配置 */
  initialPlacements?: Placement[];
  /** じゆうこうさく の ほぞん / よみこみ ボタン */
  onExtraControls?(bar: HTMLElement, getPlacements: () => Placement[], load: (p: Placement[]) => void): void;
  onBack?(): void;
}

/** 1 フレームで ならす しょうげき音の かず（うるさくなりすぎない ように） */
const MAX_IMPACT_SOUNDS_PER_FRAME = 3;

/**
 * そうちを くみたてて うごかす、ゲームの ほんたい。
 *
 * 「おく → ▶ためす → なおす」を くりかえす。
 * シミュレーションは 固定タイムステップで まわし、描画は その けっかを よむだけ。
 */
export class PlayScene implements GameScene {
  private ctx!: SceneContext;
  private stage!: StageConfig;
  private placements: Placement[] = [];
  private runtime: StageRuntime | null = null;
  private accumulator = 0;
  private running = false;
  private finishing = false;
  private finishTimer = 0;

  private hud: PlayHud | null = null;
  private tray: PartTray | null = null;
  private input: PlacementInput | null = null;
  private toast: ToastHandle | null = null;
  private dialog: ReturnType<typeof createDialog> | null = null;
  private extraBar: HTMLDivElement | null = null;

  constructor(
    private readonly stageNumber: number,
    private readonly options: PlaySceneOptions = {},
  ) {}

  enter(ctx: SceneContext): void {
    this.ctx = ctx;
    const stage = this.options.sandbox
      ? createSandboxStage()
      : getStageByNumber(this.stageNumber);
    if (!stage) {
      ctx.goto({ id: 'stage-select' });
      return;
    }
    this.stage = stage;
    this.placements = (this.options.initialPlacements ?? []).map((p) => ({ ...p }));

    ctx.renderer.setStage(stage);
    ctx.renderer.setRunning(false);
    ctx.renderer.syncPlacements(this.placements);
    ctx.audio.startBgm('build');

    this.toast = createToast(ctx.uiOverlay);
    this.dialog = createDialog(ctx.uiOverlay);

    this.hud = new PlayHud(ctx.hudRoot, {
      title: this.options.sandbox
        ? '🛠️ じゆうこうさく'
        : `${stage.stageNumber}. ${stage.nameHiragana}`,
      hint: stage.hintHiragana,
      showBack: true,
      sandbox: this.options.sandbox === true,
      onBack: () => this.handleBack(),
      onStart: () => this.startRun(),
      onReset: () => this.resetRun(),
      onHint: () => this.showHint(),
    });
    this.hud.setTrashVisible(false, false);

    this.tray = new PartTray(ctx.hudRoot, {
      onDragStart: (kind, event) => this.input?.beginFromTray(kind, event),
      onSelect: (kind) => this.tray?.setActiveKind(kind),
    });
    if (this.options.sandbox) this.tray.setAllParts(PART_ORDER);
    else this.tray.setStage(stage);

    this.input = new PlacementInput({
      canvas: ctx.canvas,
      overlay: ctx.uiOverlay,
      renderer: ctx.renderer,
      getPlacements: () => this.placements,
      check: (candidate, movingId) => this.checkPlacement(candidate, movingId),
      onChange: (next) => this.applyPlacements(next),
      onSound: (sound) => ctx.audio.playSfx(sound),
      onMessage: (text) => this.toast?.show(text),
      isEditable: () => !this.running,
      trashRect: () => this.hud!.trashRect(),
      setTrashVisible: (visible, hot) => this.hud?.setTrashVisible(visible, hot),
    });

    if (this.options.onExtraControls) {
      this.extraBar = el(
        'div',
        `position:absolute;left:50%;transform:translateX(-50%);
         top:calc(46px + env(safe-area-inset-top,0px));display:flex;gap:8px;flex-wrap:wrap;
         justify-content:center;z-index:26;`,
      );
      this.options.onExtraControls(
        this.extraBar,
        () => this.placements.map((p) => ({ ...p })),
        (next) => this.loadPlacements(next),
      );
      ctx.hudRoot.appendChild(this.extraBar);
    }

    this.refreshHud();
    if (!this.options.sandbox && ctx.save.starsFor(stage.id) === 0) {
      this.toast.show(stage.hintHiragana, 3200);
    }
  }

  update(dt: number): void {
    if (this.finishing) {
      this.finishTimer -= dt;
      if (this.finishTimer <= 0) this.completeFinish();
      return;
    }
    if (!this.running || !this.runtime) return;

    this.accumulator += dt;
    let steps = 0;
    while (
      this.accumulator >= FIXED_DT &&
      steps < MAX_STEPS_PER_FRAME &&
      !this.runtime.finished
    ) {
      this.runtime.step();
      this.handleEvents(this.runtime.events);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    // おいつけない ときは たまった ぶんを すてる（じかんが とばないように）
    if (this.accumulator > FIXED_DT * MAX_STEPS_PER_FRAME) this.accumulator = 0;

    this.ctx.renderer.syncRuntime(this.runtime);
    this.updateRollingSound();
    this.refreshRunHud();

    if (this.runtime.finished) this.beginFinish();
  }

  exit(): void {
    this.ctx.audio.stopRolling();
    this.input?.destroy();
    this.tray?.destroy();
    this.hud?.destroy();
    this.toast?.destroy();
    this.dialog?.destroy();
    this.extraBar?.remove();
    this.ctx.renderer.setRunning(false);
    this.ctx.renderer.setGhost(null, true);
    this.ctx.renderer.setSelected(null);
  }

  resize(): void {
    this.input?.refreshHandle();
  }

  // --- うちがわ ------------------------------------------------------------

  private checkPlacement(candidate: Placement, movingId?: string): PlacementCheck {
    return canPlace(this.stage, this.placements, candidate, {
      ignoreLimits: this.options.sandbox === true,
      movingId,
    });
  }

  private applyPlacements(next: Placement[]): void {
    this.placements = next;
    this.ctx.renderer.syncPlacements(this.placements);
    this.refreshHud();
  }

  private loadPlacements(next: Placement[]): void {
    this.resetRun();
    this.placements = next.map((p, i) => ({ ...p, id: `load-${i}-${p.id}` }));
    this.ctx.renderer.syncPlacements(this.placements);
    this.input?.clearSelection();
    this.refreshHud();
  }

  private refreshHud(): void {
    if (!this.hud || !this.tray) return;
    if (this.options.sandbox) {
      for (const kind of PART_ORDER) this.tray.setRemaining(kind, null);
    } else {
      for (const allowance of this.stage.availableParts) {
        this.tray.setRemaining(allowance.kind, remainingCount(this.stage, this.placements, allowance.kind));
      }
    }
    this.hud.setUsedParts(this.placements.length, this.stage.parPartCount);
    this.hud.setCoins(0, this.stage.coins.length);
    this.hud.setStars(this.options.sandbox ? 0 : this.ctx.save.starsFor(this.stage.id));
    this.input?.refreshHandle();
  }

  private refreshRunHud(): void {
    if (!this.hud || !this.runtime) return;
    this.hud.setCoins(this.runtime.coinsCollected.length, this.stage.coins.length);
  }

  private startRun(): void {
    if (this.running) return;
    if (this.placements.length === 0 && !this.options.sandbox) {
      this.ctx.audio.playSfx('nope');
      this.toast?.show('まず パーツを おいてみよう');
      return;
    }
    this.ctx.audio.resume();
    this.ctx.audio.playSfx('start');
    this.ctx.audio.startBgm('run');
    this.input?.clearSelection();
    this.runtime = new StageRuntime(this.stage, this.placements, {
      freeplay: this.options.sandbox === true,
    });
    this.accumulator = 0;
    this.running = true;
    this.finishing = false;
    this.hud?.setRunning(true);
    this.hud?.hideStatus();
    this.hud?.setTrashVisible(false, false);
    this.ctx.renderer.setRunning(true);
  }

  private resetRun(): void {
    this.running = false;
    this.finishing = false;
    this.runtime = null;
    this.accumulator = 0;
    this.ctx.audio.stopRolling();
    this.ctx.audio.playSfx('reset');
    this.ctx.audio.startBgm('build');
    this.hud?.setRunning(false);
    this.hud?.hideStatus();
    this.ctx.renderer.setRunning(false);
    this.ctx.renderer.resetVisualState(this.stage);
    this.refreshHud();
  }

  private handleEvents(events: readonly RuntimeEvent[]): void {
    let impacts = 0;
    for (const event of events) {
      switch (event.type) {
        case 'impact':
          if (impacts < MAX_IMPACT_SOUNDS_PER_FRAME) {
            this.ctx.audio.playImpact(event.material, event.speed);
            impacts++;
          }
          break;
        case 'spring':
          this.ctx.audio.playSfx('spring');
          break;
        case 'pipe-enter':
          this.ctx.audio.playSfx('pipe-in');
          break;
        case 'pipe-exit':
          this.ctx.audio.playSfx('pipe-out');
          break;
        case 'domino-topple':
          this.ctx.audio.playSfx('domino');
          break;
        case 'hammer-hit':
          this.ctx.audio.playSfx('hammer');
          break;
        case 'coin':
          this.ctx.audio.playSfx('coin');
          break;
        case 'goal':
          this.ctx.audio.playSfx('goal');
          break;
        case 'clear':
          this.ctx.audio.playSfx('fanfare');
          break;
        case 'fail':
          this.ctx.audio.playSfx('nope');
          break;
        case 'out-of-bounds':
        default:
          break;
      }
    }
  }

  private updateRollingSound(): void {
    if (!this.runtime) return;
    let speed = 0;
    let touching = false;
    for (const ball of this.runtime.world.balls) {
      if (!ball.active) continue;
      const s = Math.hypot(ball.vx, ball.vy);
      if (s > speed) speed = s;
      if (ball.touching) touching = true;
    }
    this.ctx.audio.updateRolling(speed, touching);
  }

  private beginFinish(): void {
    if (this.finishing || !this.runtime) return;
    this.finishing = true;
    this.running = false;
    this.ctx.audio.stopRolling();
    this.ctx.renderer.setRunning(false);
    const cleared = this.runtime.status === 'cleared';
    this.hud?.showStatus(cleared ? '🎉 クリア！' : 'ざんねん… もういちど！');
    this.finishTimer = cleared ? 1.3 : 1.6;
  }

  private completeFinish(): void {
    this.finishing = false;
    if (!this.runtime) return;
    const result = this.runtime.result();

    if (this.options.sandbox) {
      this.resetRun();
      return;
    }

    if (!result.cleared) {
      this.resetRun();
      this.toast?.show('パーツを なおして もういちど ためそう', 2400);
      return;
    }

    const { unlockedNew } = this.ctx.save.recordStageResult(
      this.stage.id,
      this.stage.stageNumber,
      result.stars,
    );
    const allCleared = this.ctx.save.allCleared();
    this.ctx.goto({
      id: 'result',
      stageId: this.stage.id,
      stageNumber: this.stage.stageNumber,
      result,
      unlockedNew,
      allCleared,
    });
  }

  private handleBack(): void {
    this.ctx.audio.playSfx('click');
    if (this.options.onBack) this.options.onBack();
    else this.ctx.goto({ id: 'stage-select' });
  }

  private showHint(): void {
    this.ctx.audio.playSfx('click');
    this.dialog?.open((body, close) => {
      body.appendChild(
        el(
          'div',
          `font-size:clamp(17px,3.4vw,24px);font-weight:900;color:${UI.primary};margin-bottom:8px;`,
          '💡 ヒント',
        ),
      );
      body.appendChild(
        el('div', 'font-size:clamp(14px,2.8vw,19px);line-height:1.7;margin-bottom:14px;', this.stage.hintHiragana),
      );
      body.appendChild(
        el(
          'div',
          `font-size:clamp(12px,2.4vw,16px);line-height:1.7;color:${UI.ink};margin-bottom:14px;`,
          `★は 3つ。①ゴールする ②パーツを ${this.stage.parPartCount}こ いないに する ③きいろい ★を ぜんぶ とおる`,
        ),
      );
      const row = el('div', 'display:flex;gap:8px;justify-content:flex-end;');
      row.appendChild(smallButton('とじる', close));
      body.appendChild(row);
    });
  }
}

/** じゆうこうさく用の からっぽの ステージ */
export function createSandboxStage(): StageConfig {
  return {
    id: 'sandbox',
    stageNumber: 0,
    nameHiragana: 'じゆうこうさく',
    hintHiragana: 'すきなように パーツを おいて そうちを つくろう！',
    bounds: { minX: -10, maxX: 10, minY: -6.5, maxY: 7.5 },
    terrain: [
      { x: -7.7, y: 4.3, w: 3.4, h: 0.3, angle: -0.25, material: 'metal' },
      { x: -9.35, y: 4.95, w: 0.3, h: 1.6, angle: 0, material: 'metal' },
      { x: 0, y: -6.4, w: 20, h: 0.7, angle: 0, material: 'wood' },
    ],
    balls: [{ id: 'ball', x: -8.8, y: 5.4 }],
    goals: [],
    coins: [],
    availableParts: PART_ORDER.map((kind) => ({ kind, limit: 99 })),
    parPartCount: 99,
    solution: [],
    theme: { sky: 0xe4ecf6, floor: 0x7d8aa5, accent: 0xee6c4d },
  };
}



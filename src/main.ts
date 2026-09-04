import { AudioEngine } from '@/game/audio/AudioEngine';
import { FactoryRenderer } from '@/game/render/FactoryRenderer';
import { SaveStorage } from '@/game/storage/SaveStorage';
import { PlayScene } from '@/game/scenes/PlayScene';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SandboxScene } from '@/game/scenes/SandboxScene';
import { StageSelectScene } from '@/game/scenes/StageSelectScene';
import { TitleScene } from '@/game/scenes/TitleScene';
import { ZukanScene } from '@/game/scenes/ZukanScene';
import type { GameScene, SceneContext, SceneTarget } from '@/game/scenes/Scene';

/** 1 フレームで すすめる じかんの 上限（タブを もどした ときの とびを ふせぐ） */
const MAX_FRAME_DT = 0.1;

class App {
  private readonly canvas: HTMLCanvasElement;
  private readonly uiOverlay: HTMLElement;
  private readonly hudRoot: HTMLElement;
  private readonly save = new SaveStorage();
  private readonly audio = new AudioEngine();
  readonly renderer: FactoryRenderer;

  private currentScene: GameScene | null = null;
  private lastTime = 0;
  private transitioning = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.uiOverlay = document.getElementById('ui-overlay') as HTMLElement;
    this.hudRoot = document.getElementById('hud') as HTMLElement;
    this.renderer = new FactoryRenderer(this.canvas);

    this.audio.init();
    this.audio.setSfxVolume(this.save.get().sfxVolume);
    this.audio.setBgmVolume(this.save.get().bgmVolume);
    const resume = (): void => this.audio.resume();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });

    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.handleResize(), 120));
    this.handleResize();

    document.getElementById('boot-splash')?.classList.add('hidden');
    window.setTimeout(() => document.getElementById('boot-splash')?.remove(), 500);

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private context(): SceneContext {
    return {
      uiOverlay: this.uiOverlay,
      hudRoot: this.hudRoot,
      canvas: this.canvas,
      renderer: this.renderer,
      save: this.save,
      audio: this.audio,
      goto: (target) => this.goto(target),
    };
  }

  goto(target: SceneTarget): void {
    if (this.transitioning) return;
    this.transitioning = true;
    try {
      this.currentScene?.exit();
      this.currentScene = this.createScene(target);
      this.currentScene.enter(this.context());
    } finally {
      this.transitioning = false;
    }
  }

  private createScene(target: SceneTarget): GameScene {
    switch (target.id) {
      case 'title':
        return new TitleScene();
      case 'stage-select':
        return new StageSelectScene();
      case 'play':
        return new PlayScene(target.stageNumber);
      case 'sandbox':
        return new SandboxScene();
      case 'zukan':
        return new ZukanScene();
      case 'result':
        return new ResultScene({
          stageId: target.stageId,
          stageNumber: target.stageNumber,
          result: target.result,
          unlockedNew: target.unlockedNew,
          allCleared: target.allCleared,
        });
    }
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.currentScene?.resize?.(width, height);
  }

  private loop = (now: number): void => {
    const dt = Math.min(MAX_FRAME_DT, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.currentScene?.update?.(dt);
    this.renderer.render(dt);
    requestAnimationFrame(this.loop);
  };
}

const app = new App();
app.goto({ id: 'title' });

if (import.meta.env.DEV) {
  // かいはつ中だけ、ブラウザの コンソールから ようすを みられるようにする
  (window as unknown as { __pitagora?: App }).__pitagora = app;
}

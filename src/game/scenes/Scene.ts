import type { SimResult } from '@/types';
import type { AudioEngine } from '@/game/audio/AudioEngine';
import type { FactoryRenderer } from '@/game/render/FactoryRenderer';
import type { SaveStorage } from '@/game/storage/SaveStorage';

export type SceneTarget =
  | { id: 'title' }
  | { id: 'stage-select' }
  | { id: 'play'; stageNumber: number }
  | { id: 'sandbox' }
  | { id: 'zukan' }
  | {
      id: 'result';
      stageId: string;
      stageNumber: number;
      result: SimResult;
      unlockedNew: boolean;
      allCleared: boolean;
    };

export interface SceneContext {
  /** DOM の UI を のせる ところ */
  uiOverlay: HTMLElement;
  /** ゲーム中の HUD を のせる ところ */
  hudRoot: HTMLElement;
  canvas: HTMLCanvasElement;
  renderer: FactoryRenderer;
  save: SaveStorage;
  audio: AudioEngine;
  goto(target: SceneTarget): void;
}

export interface GameScene {
  enter(ctx: SceneContext): void | Promise<void>;
  update?(dt: number): void;
  resize?(width: number, height: number): void;
  exit(): void | Promise<void>;
}

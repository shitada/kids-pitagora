import type { PartKind, Placement, PlacementCheck } from '@/types';
import { PARTS } from '@/game/config/parts';
import { PLACE_GRID } from '@/game/config/physics';
import { UI } from '@/game/config/palette';
import { snapPlacement } from '@/game/parts/placementRules';
import type { FactoryRenderer } from '@/game/render/FactoryRenderer';
import { el, FONT } from '@/ui/widgets';

export type PlacementSound = 'place' | 'rotate' | 'delete' | 'nope';

export interface PlacementInputOptions {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  renderer: FactoryRenderer;
  getPlacements(): readonly Placement[];
  check(candidate: Placement, movingId?: string): PlacementCheck;
  onChange(placements: Placement[]): void;
  onSound(sound: PlacementSound): void;
  onMessage(text: string): void;
  isEditable(): boolean;
  trashRect(): DOMRect;
  setTrashVisible(visible: boolean, hot: boolean): void;
}

type DragMode =
  | { type: 'none' }
  | { type: 'new'; draft: Placement }
  | { type: 'move'; draft: Placement; originalId: string; startX: number; startY: number; moved: boolean };

/**
 * パーツを おく・うごかす・まわす・すてる の そうさ。
 *
 * - トレイから ドラッグして おく
 * - おいた パーツを タップすると まわす ハンドルが でる
 * - ゴミばこへ ドラッグすると けせる
 * - PC では ホイールでも まわせる
 */
export class PlacementInput {
  private drag: DragMode = { type: 'none' };
  private selectedId: string | null = null;
  private rotating = false;
  /** いま そうさしている ゆびの ID。べつの ゆびが ふれても じゃまされない ように する */
  private activePointerId: number | null = null;
  private rotateStartAngle = 0;
  private rotatePartAngle = 0;
  private readonly handle: HTMLDivElement;
  private readonly handleRing: HTMLDivElement;
  private nextId = 1;

  constructor(private readonly options: PlacementInputOptions) {
    this.handleRing = el(
      'div',
      `position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;
       border:3px dashed ${UI.accent};pointer-events:none;opacity:0.75;display:none;z-index:23;`,
    );
    this.handle = el(
      'div',
      `position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
       background:${UI.accent};color:#fff;font-family:${FONT};font-size:20px;font-weight:900;
       display:none;align-items:center;justify-content:center;cursor:grab;touch-action:none;
       box-shadow:0 3px 8px rgba(0,0,0,0.3);z-index:24;user-select:none;`,
      '↻',
    );
    this.options.overlay.append(this.handleRing, this.handle);
    this.bind();
  }

  /** トレイから ドラッグを はじめる */
  beginFromTray(kind: PartKind, event: PointerEvent): void {
    if (!this.options.isEditable()) {
      this.options.onSound('nope');
      this.options.onMessage('うごいている あいだは おけないよ');
      return;
    }
    const world = this.options.renderer.screenToWorld(event.clientX, event.clientY);
    const draft = snapPlacement(
      { id: `tmp-${this.nextId}`, kind, x: world.x, y: world.y, angle: defaultAngle(kind) },
      PLACE_GRID,
    );
    this.activePointerId = event.pointerId;
    this.drag = { type: 'new', draft };
    this.setSelected(null);
    this.options.setTrashVisible(true, false);
    this.updateGhost();
  }

  get selection(): string | null {
    return this.selectedId;
  }

  clearSelection(): void {
    this.setSelected(null);
  }

  refreshHandle(): void {
    this.positionHandle();
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.options.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown);
    this.options.canvas.removeEventListener('wheel', this.onWheel);
    this.handle.remove();
    this.handleRing.remove();
  }

  // --- うちがわ ------------------------------------------------------------

  private bind(): void {
    this.options.canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    this.options.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    this.handle.addEventListener('pointerdown', this.onHandlePointerDown);
  }

  private onCanvasPointerDown = (event: PointerEvent): void => {
    if (!this.options.isEditable()) return;
    const hit = this.options.renderer.pickPlacement(
      event.clientX,
      event.clientY,
      this.options.getPlacements(),
    );
    if (!hit) {
      this.setSelected(null);
      return;
    }
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.setSelected(hit.id);
    this.drag = {
      type: 'move',
      draft: { ...hit },
      originalId: hit.id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    this.options.setTrashVisible(true, false);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
    if (this.rotating) {
      this.updateRotation(event);
      return;
    }
    if (this.drag.type === 'none') return;

    const world = this.options.renderer.screenToWorld(event.clientX, event.clientY);
    if (this.drag.type === 'move') {
      const dx = event.clientX - this.drag.startX;
      const dy = event.clientY - this.drag.startY;
      if (!this.drag.moved && Math.hypot(dx, dy) < 6) return;
      this.drag.moved = true;
      this.handle.style.display = 'none';
      this.handleRing.style.display = 'none';
    }
    this.drag.draft = snapPlacement({ ...this.drag.draft, x: world.x, y: world.y }, PLACE_GRID);
    const overTrash = this.isOverTrash(event.clientX, event.clientY);
    this.options.setTrashVisible(true, overTrash);
    this.updateGhost(overTrash);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
    if (this.rotating) {
      this.rotating = false;
      this.activePointerId = null;
      this.handle.style.cursor = 'grab';
      return;
    }
    if (this.drag.type === 'none') return;

    const drag = this.drag;
    this.drag = { type: 'none' };
    this.activePointerId = null;
    this.options.renderer.setGhost(null, true);
    this.options.setTrashVisible(false, false);

    const overTrash = this.isOverTrash(event.clientX, event.clientY);
    const placements = [...this.options.getPlacements()];

    if (drag.type === 'move' && !drag.moved) {
      // うごかさずに はなしたら「えらんだ」だけ
      this.positionHandle();
      return;
    }

    if (overTrash) {
      if (drag.type === 'move') {
        this.options.onChange(placements.filter((p) => p.id !== drag.originalId));
        this.options.onSound('delete');
        this.setSelected(null);
      } else {
        this.options.onSound('nope');
      }
      return;
    }

    const movingId = drag.type === 'move' ? drag.originalId : undefined;
    const check = this.options.check(drag.draft, movingId);
    if (!check.ok) {
      this.options.onSound('nope');
      if (check.messageHiragana) this.options.onMessage(check.messageHiragana);
      if (drag.type === 'move') this.positionHandle();
      return;
    }

    if (drag.type === 'new') {
      const placed: Placement = { ...drag.draft, id: `part-${this.nextId++}` };
      this.options.onChange([...placements, placed]);
      this.options.onSound('place');
      this.setSelected(placed.id);
    } else {
      this.options.onChange(
        placements.map((p) => (p.id === drag.originalId ? { ...drag.draft, id: p.id } : p)),
      );
      this.options.onSound('place');
      this.positionHandle();
    }
  };

  private onHandlePointerDown = (event: PointerEvent): void => {
    const placement = this.selectedPlacement();
    if (!placement) return;
    event.preventDefault();
    event.stopPropagation();
    this.rotating = true;
    this.activePointerId = event.pointerId;
    this.handle.style.cursor = 'grabbing';
    const world = this.options.renderer.screenToWorld(event.clientX, event.clientY);
    this.rotateStartAngle = Math.atan2(world.y - placement.y, world.x - placement.x);
    this.rotatePartAngle = placement.angle;
  };

  private onWheel = (event: WheelEvent): void => {
    const placement = this.selectedPlacement();
    if (!placement || !this.options.isEditable()) return;
    const config = PARTS[placement.kind];
    if (!config.rotatable) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    this.applyAngle(placement, placement.angle + direction * config.angleSnap);
  };

  private updateRotation(event: PointerEvent): void {
    const placement = this.selectedPlacement();
    if (!placement) return;
    const config = PARTS[placement.kind];
    if (!config.rotatable) return;
    const world = this.options.renderer.screenToWorld(event.clientX, event.clientY);
    const current = Math.atan2(world.y - placement.y, world.x - placement.x);
    this.applyAngle(placement, this.rotatePartAngle + (current - this.rotateStartAngle));
  }

  private applyAngle(placement: Placement, angle: number): void {
    const candidate = snapPlacement({ ...placement, angle }, PLACE_GRID);
    if (Math.abs(candidate.angle - placement.angle) < 1e-6) return;
    const check = this.options.check(candidate, placement.id);
    if (!check.ok) {
      if (check.messageHiragana) this.options.onMessage(check.messageHiragana);
      return;
    }
    this.options.onChange(
      this.options.getPlacements().map((p) => (p.id === placement.id ? candidate : p)),
    );
    this.options.onSound('rotate');
    this.positionHandle();
  }

  private updateGhost(overTrash = false): void {
    if (this.drag.type === 'none') return;
    const movingId = this.drag.type === 'move' ? this.drag.originalId : undefined;
    const valid = !overTrash && this.options.check(this.drag.draft, movingId).ok;
    this.options.renderer.setGhost(this.drag.draft, valid);
  }

  private selectedPlacement(): Placement | null {
    if (!this.selectedId) return null;
    return this.options.getPlacements().find((p) => p.id === this.selectedId) ?? null;
  }

  private setSelected(id: string | null): void {
    this.selectedId = id;
    const placement = this.selectedPlacement();
    this.options.renderer.setSelected(placement);
    this.positionHandle();
  }

  private positionHandle(): void {
    const placement = this.selectedPlacement();
    if (!placement || !this.options.isEditable()) {
      this.handle.style.display = 'none';
      this.handleRing.style.display = 'none';
      return;
    }
    const config = PARTS[placement.kind];
    if (!config.rotatable) {
      this.handle.style.display = 'none';
      this.handleRing.style.display = 'none';
      return;
    }
    const radius = Math.max(1.1, config.size.x * 0.62);
    const center = this.options.renderer.worldToScreen(placement.x, placement.y);
    const knob = this.options.renderer.worldToScreen(
      placement.x + Math.cos(placement.angle) * radius,
      placement.y + Math.sin(placement.angle) * radius,
    );
    this.handleRing.style.display = 'block';
    this.handleRing.style.left = `${center.x}px`;
    this.handleRing.style.top = `${center.y}px`;
    this.handle.style.display = 'flex';
    this.handle.style.left = `${knob.x}px`;
    this.handle.style.top = `${knob.y}px`;
  }

  private isOverTrash(clientX: number, clientY: number): boolean {
    const rect = this.options.trashRect();
    return (
      clientX >= rect.left - 12 &&
      clientX <= rect.right + 12 &&
      clientY >= rect.top - 12 &&
      clientY <= rect.bottom + 12
    );
  }
}

function defaultAngle(kind: PartKind): number {
  // いた・ベルトは すこし ななめの ほうが つかいやすい
  if (kind === 'plate' || kind === 'conveyor') return 0;
  return 0;
}

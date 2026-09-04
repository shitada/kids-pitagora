import type { PartKind, StageConfig } from '@/types';
import { PARTS } from '@/game/config/parts';
import { css, UI } from '@/game/config/palette';
import { el, FONT } from './widgets';

interface TrayItem {
  kind: PartKind;
  button: HTMLButtonElement;
  countLabel: HTMLDivElement;
}

export interface PartTrayOptions {
  /** トレイの ボタンで ドラッグを はじめた */
  onDragStart(kind: PartKind, event: PointerEvent): void;
  /** パーツを えらんだ（タップ配置用） */
  onSelect(kind: PartKind): void;
}

/**
 * がめん したの パーツトレイ。
 * ドラッグ&ドロップでも、タップして えらんでから おく でも つかえる。
 */
export class PartTray {
  private readonly root: HTMLDivElement;
  private readonly items: TrayItem[] = [];
  private activeKind: PartKind | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly options: PartTrayOptions,
  ) {
    this.root = el(
      'div',
      `position:absolute;left:50%;transform:translateX(-50%);
       bottom:calc(10px + env(safe-area-inset-bottom,0px));
       display:flex;gap:8px;align-items:flex-end;justify-content:center;flex-wrap:wrap;
       background:rgba(253,251,245,0.92);border-radius:20px;padding:8px 12px;
       box-shadow:0 4px 14px rgba(0,0,0,0.18);font-family:${FONT};max-width:min(94vw,760px);z-index:25;`,
    );
    this.parent.appendChild(this.root);
  }

  setStage(stage: StageConfig): void {
    this.root.replaceChildren();
    this.items.length = 0;
    for (const allowance of stage.availableParts) {
      this.addItem(allowance.kind);
    }
  }

  /** じゆうこうさく用: ぜんぶの パーツを むせいげんで ならべる */
  setAllParts(kinds: readonly PartKind[]): void {
    this.root.replaceChildren();
    this.items.length = 0;
    for (const kind of kinds) this.addItem(kind);
  }

  setRemaining(kind: PartKind, remaining: number | null): void {
    const item = this.items.find((i) => i.kind === kind);
    if (!item) return;
    item.countLabel.textContent = remaining === null ? '∞' : `${remaining}`;
    const empty = remaining !== null && remaining <= 0;
    item.button.style.opacity = empty ? '0.4' : '1';
    item.button.disabled = empty;
    item.countLabel.style.background = empty ? UI.warn : UI.primary;
  }

  setActiveKind(kind: PartKind | null): void {
    this.activeKind = kind;
    for (const item of this.items) {
      const active = item.kind === kind;
      item.button.style.borderColor = active ? UI.accent : 'transparent';
      item.button.style.background = active ? '#fff2ec' : '#fff';
    }
  }

  get selectedKind(): PartKind | null {
    return this.activeKind;
  }

  destroy(): void {
    this.root.remove();
  }

  private addItem(kind: PartKind): void {
    const config = PARTS[kind];
    const button = el(
      'button',
      `position:relative;font-family:${FONT};display:flex;flex-direction:column;align-items:center;
       gap:2px;min-width:66px;padding:6px 8px 5px;border-radius:14px;border:3px solid transparent;
       background:#fff;box-shadow:0 3px 0 rgba(0,0,0,0.14);cursor:grab;touch-action:none;
       color:${UI.ink};`,
    );

    const icon = el('div', `font-size:22px;line-height:1;`, config.emoji);
    const name = el('div', `font-size:11px;font-weight:700;white-space:nowrap;`, config.nameHiragana);
    const countLabel = el(
      'div',
      `position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:999px;
       background:${UI.primary};color:#fff;font-size:11px;font-weight:900;
       display:flex;align-items:center;justify-content:center;padding:0 5px;`,
      '0',
    );

    const swatch = el(
      'div',
      `width:26px;height:4px;border-radius:2px;background:${css(config.color)};`,
    );

    button.append(icon, name, swatch, countLabel);
    button.addEventListener('pointerdown', (event) => {
      if (button.disabled) return;
      event.preventDefault();
      this.options.onSelect(kind);
      this.options.onDragStart(kind, event);
    });

    this.root.appendChild(button);
    this.items.push({ kind, button, countLabel });
  }
}

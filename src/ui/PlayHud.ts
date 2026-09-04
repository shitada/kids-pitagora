import { UI } from '@/game/config/palette';
import { el, FONT, smallButton, starRow } from './widgets';

export interface PlayHudOptions {
  title: string;
  hint: string;
  showBack: boolean;
  /** じゆうこうさく では ★や パーツすうの めやすを ださない */
  sandbox?: boolean;
  onBack(): void;
  onStart(): void;
  onReset(): void;
  onHint(): void;
}

/**
 * あそんでいる あいだの がめん UI。
 * ボタンは おおきく、もじは ひらがな。
 */
export class PlayHud {
  private readonly root: HTMLDivElement;
  private readonly titleLabel: HTMLDivElement;
  private readonly statusLabel: HTMLDivElement;
  private readonly coinLabel: HTMLDivElement;
  private readonly starHolder: HTMLDivElement;
  private readonly startButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly trash: HTMLDivElement;
  private readonly usedLabel: HTMLDivElement;

  constructor(
    private readonly parent: HTMLElement,
    private readonly options: PlayHudOptions,
  ) {
    this.root = el('div', `position:absolute;inset:0;pointer-events:none;font-family:${FONT};z-index:22;`);

    const topBar = el(
      'div',
      `position:absolute;top:calc(8px + env(safe-area-inset-top,0px));
       left:calc(10px + env(safe-area-inset-left,0px));right:calc(10px + env(safe-area-inset-right,0px));
       display:flex;align-items:center;gap:10px;pointer-events:none;`,
    );

    if (options.showBack) {
      const back = smallButton('← もどる', () => options.onBack());
      back.style.pointerEvents = 'auto';
      topBar.appendChild(back);
    }

    this.titleLabel = el(
      'div',
      `background:rgba(253,251,245,0.92);border-radius:999px;padding:6px 16px;font-weight:900;
       font-size:clamp(13px,2.6vw,19px);color:${UI.ink};box-shadow:0 2px 8px rgba(0,0,0,0.14);`,
      options.title,
    );
    topBar.appendChild(this.titleLabel);

    const spacer = el('div', 'flex:1;');
    topBar.appendChild(spacer);

    this.coinLabel = el(
      'div',
      `background:rgba(253,251,245,0.92);border-radius:999px;padding:6px 14px;font-weight:900;
       font-size:clamp(12px,2.4vw,17px);color:${UI.ink};box-shadow:0 2px 8px rgba(0,0,0,0.14);`,
      '⭐ 0 / 0',
    );
    if (!options.sandbox) topBar.appendChild(this.coinLabel);

    this.starHolder = el(
      'div',
      `background:rgba(253,251,245,0.92);border-radius:999px;padding:5px 12px;
       box-shadow:0 2px 8px rgba(0,0,0,0.14);display:flex;align-items:center;`,
    );
    this.starHolder.appendChild(starRow(0, 18));
    if (!options.sandbox) topBar.appendChild(this.starHolder);

    const hintButton = smallButton('？ ヒント', () => options.onHint(), UI.good);
    hintButton.style.pointerEvents = 'auto';
    topBar.appendChild(hintButton);

    this.root.appendChild(topBar);

    this.usedLabel = el(
      'div',
      `position:absolute;top:calc(46px + env(safe-area-inset-top,0px));
       left:calc(12px + env(safe-area-inset-left,0px));
       background:rgba(253,251,245,0.88);border-radius:12px;padding:4px 11px;
       font-size:clamp(11px,2.2vw,15px);font-weight:700;color:${UI.ink};`,
      'つかったパーツ 0',
    );
    this.root.appendChild(this.usedLabel);

    this.statusLabel = el(
      'div',
      `position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);
       font-size:clamp(24px,6vw,46px);font-weight:900;color:${UI.primary};
       text-shadow:0 3px 0 rgba(255,255,255,0.9);text-align:center;opacity:0;
       transition:opacity 0.2s;pointer-events:none;`,
    );
    this.root.appendChild(this.statusLabel);

    const controls = el(
      'div',
      `position:absolute;right:calc(12px + env(safe-area-inset-right,0px));
       bottom:calc(74px + env(safe-area-inset-bottom,0px));
       display:flex;flex-direction:column;gap:8px;pointer-events:auto;`,
    );
    this.startButton = el(
      'button',
      `font-family:${FONT};font-size:clamp(16px,3.4vw,24px);font-weight:900;color:#fff;
       background:${UI.good};border:none;border-radius:18px;padding:11px 22px;cursor:pointer;
       box-shadow:0 5px 0 rgba(0,0,0,0.22);touch-action:manipulation;`,
      '▶ スタート',
    );
    this.startButton.addEventListener('click', () => options.onStart());
    this.resetButton = el(
      'button',
      `font-family:${FONT};font-size:clamp(14px,2.9vw,20px);font-weight:900;color:#fff;
       background:${UI.warn};border:none;border-radius:16px;padding:9px 20px;cursor:pointer;
       box-shadow:0 4px 0 rgba(0,0,0,0.22);touch-action:manipulation;`,
      '⏹ リセット',
    );
    this.resetButton.addEventListener('click', () => options.onReset());
    controls.append(this.startButton, this.resetButton);
    this.root.appendChild(controls);

    this.trash = el(
      'div',
      `position:absolute;left:calc(12px + env(safe-area-inset-left,0px));
       bottom:calc(80px + env(safe-area-inset-bottom,0px));
       width:58px;height:58px;border-radius:18px;border:3px dashed ${UI.warn};
       background:rgba(253,251,245,0.85);display:flex;align-items:center;justify-content:center;
       font-size:26px;transition:transform 0.12s,background 0.12s;pointer-events:none;`,
      '🗑️',
    );
    this.root.appendChild(this.trash);

    this.parent.appendChild(this.root);
  }

  setTitle(text: string): void {
    this.titleLabel.textContent = text;
  }

  setCoins(collected: number, total: number): void {
    this.coinLabel.textContent = `⭐ ${collected} / ${total}`;
  }

  setStars(stars: number): void {
    this.starHolder.replaceChildren(starRow(stars, 18));
  }

  setUsedParts(used: number, par: number): void {
    this.usedLabel.textContent = this.options.sandbox
      ? `つかったパーツ ${used}`
      : `つかったパーツ ${used}（★は ${par}こ いない）`;
  }

  setRunning(running: boolean): void {
    this.startButton.style.opacity = running ? '0.45' : '1';
    this.startButton.disabled = running;
  }

  showStatus(text: string): void {
    this.statusLabel.textContent = text;
    this.statusLabel.style.opacity = '1';
  }

  hideStatus(): void {
    this.statusLabel.style.opacity = '0';
  }

  /** ゴミばこの ハイライト。ドラッグちゅうだけ みせる */
  setTrashVisible(visible: boolean, hot = false): void {
    this.trash.style.opacity = visible ? '1' : '0.28';
    this.trash.style.transform = hot ? 'scale(1.2)' : 'scale(1)';
    this.trash.style.background = hot ? '#ffd9c9' : 'rgba(253,251,245,0.85)';
  }

  /** ゴミばこの がめん上の はんい */
  trashRect(): DOMRect {
    return this.trash.getBoundingClientRect();
  }

  hideControls(): void {
    this.startButton.style.display = 'none';
    this.resetButton.style.display = 'none';
  }

  destroy(): void {
    this.root.remove();
  }

  get hintText(): string {
    return this.options.hint;
  }
}

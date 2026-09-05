import { UI } from '@/game/config/palette';

/**
 * がめんの UI パーツ。
 * もじは すべて ひらがな ちゅうしん（5〜10さいが よめるように）。
 */

const FONT = `'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif`;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  css = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.style.cssText = css;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function screen(background: string): HTMLDivElement {
  return el(
    'div',
    `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
     justify-content:center;background:${background};color:${UI.ink};font-family:${FONT};
     pointer-events:auto;overflow:auto;
     padding:calc(16px + env(safe-area-inset-top,0px)) calc(16px + env(safe-area-inset-right,0px))
             calc(16px + env(safe-area-inset-bottom,0px)) calc(16px + env(safe-area-inset-left,0px));`,
  );
}

export function bigButton(text: string, onClick: () => void, color = UI.accent): HTMLButtonElement {
  const button = el(
    'button',
    `font-family:${FONT};font-size:clamp(18px,4vw,30px);font-weight:900;color:#fff;
     background:${color};border:none;border-radius:20px;
     padding:clamp(10px,2.2vw,16px) clamp(22px,6vw,44px);cursor:pointer;
     box-shadow:0 5px 0 rgba(0,0,0,0.22);transition:transform 0.06s;touch-action:manipulation;`,
    text,
  );
  attachPress(button, onClick);
  return button;
}

export function smallButton(text: string, onClick: () => void, color = UI.primary): HTMLButtonElement {
  const button = el(
    'button',
    `font-family:${FONT};font-size:clamp(13px,2.6vw,18px);font-weight:700;color:#fff;
     background:${color};border:none;border-radius:14px;padding:8px 16px;cursor:pointer;
     box-shadow:0 3px 0 rgba(0,0,0,0.22);transition:transform 0.06s;touch-action:manipulation;`,
    text,
  );
  attachPress(button, onClick);
  return button;
}

export function ghostButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = el(
    'button',
    `font-family:${FONT};font-size:clamp(13px,2.6vw,17px);font-weight:700;color:${UI.primary};
     background:${UI.paper};border:2px solid ${UI.primary};border-radius:14px;padding:7px 15px;
     cursor:pointer;transition:transform 0.06s;touch-action:manipulation;`,
    text,
  );
  attachPress(button, onClick);
  return button;
}

function attachPress(button: HTMLButtonElement, onClick: () => void): void {
  const down = (): void => {
    button.style.transform = 'translateY(3px)';
  };
  const up = (): void => {
    button.style.transform = '';
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointerleave', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    onClick();
  });
}

export function heading(text: string): HTMLDivElement {
  return el(
    'div',
    `font-size:clamp(26px,6.5vw,52px);font-weight:900;color:${UI.primary};text-align:center;
     text-shadow:0 3px 0 rgba(255,255,255,0.8);line-height:1.12;margin-bottom:clamp(8px,2vw,18px);`,
    text,
  );
}

export function subText(text: string): HTMLDivElement {
  return el(
    'div',
    `font-size:clamp(13px,2.8vw,20px);text-align:center;margin-bottom:clamp(12px,3vw,26px);line-height:1.5;`,
    text,
  );
}

export function card(css = ''): HTMLDivElement {
  return el(
    'div',
    `background:${UI.paper};border-radius:18px;padding:14px;box-shadow:0 4px 0 rgba(0,0,0,0.14);${css}`,
  );
}

/** ★★☆ のような ひょうじ。もじでも わかるように かずも そえる */
export function starRow(stars: number, size = 20): HTMLDivElement {
  const row = el('div', `font-size:${size}px;letter-spacing:2px;color:${UI.coin};line-height:1;`);
  row.textContent = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
  row.setAttribute('aria-label', `ほし ${stars} / 3`);
  return row;
}

export function badge(text: string, color = UI.primary): HTMLDivElement {
  return el(
    'div',
    `display:inline-block;background:${color};color:#fff;border-radius:999px;
     padding:3px 11px;font-size:clamp(11px,2.2vw,14px);font-weight:700;`,
    text,
  );
}

export interface ToastHandle {
  show(message: string, ms?: number): void;
  destroy(): void;
}

/** がめん上に みじかく でる おしらせ */
export function createToast(parent: HTMLElement): ToastHandle {
  const node = el(
    'div',
    `position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);
     background:${UI.primary};color:#fff;font-family:${FONT};font-weight:700;
     font-size:clamp(13px,2.6vw,18px);padding:9px 18px;border-radius:999px;
     box-shadow:0 3px 10px rgba(0,0,0,0.22);opacity:0;transition:opacity 0.18s;pointer-events:none;z-index:40;`,
  );
  parent.appendChild(node);
  let timer = 0;
  return {
    show(message, ms = 1700) {
      node.textContent = message;
      node.style.opacity = '1';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        node.style.opacity = '0';
      }, ms);
    },
    destroy() {
      window.clearTimeout(timer);
      node.remove();
    },
  };
}

/** まんなかに でる ダイアログ */
export function createDialog(parent: HTMLElement): {
  open(build: (body: HTMLDivElement, close: () => void) => void): void;
  close(): void;
  destroy(): void;
} {
  const overlay = el(
    'div',
    `position:absolute;inset:0;background:rgba(20,28,48,0.55);display:none;
     align-items:center;justify-content:center;z-index:50;padding:20px;font-family:${FONT};`,
  );
  const body = el(
    'div',
    `background:${UI.paper};border-radius:22px;padding:20px;max-width:min(90vw,520px);
     max-height:86vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,0.3);`,
  );
  overlay.appendChild(body);
  parent.appendChild(overlay);

  const close = (): void => {
    overlay.style.display = 'none';
    body.replaceChildren();
  };

  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) close();
  });

  return {
    open(build) {
      body.replaceChildren();
      build(body, close);
      overlay.style.display = 'flex';
    },
    close,
    destroy() {
      overlay.remove();
    },
  };
}

export { FONT };

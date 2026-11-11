// Horizontal swipe to change tab (used on the page and on the bottom bar).
// Intent is decided from the first ~10px of movement, so vertical scrolling is never hijacked.
import type { Action } from 'svelte/action';

export interface SwipeOpts {
  onDrag: (dx: number) => void;
  /** 1 = finger moved left (go to the next tab), -1 = moved right (previous tab) */
  onSwipe: (direction: 1 | -1) => void;
  onCancel: () => void;
}

// things that own horizontal gestures themselves
const BLOCKED = 'input, textarea, select, [role="slider"], .overflow-x-auto, [data-no-swipe], [data-vaul-drawer]';

export const swipe: Action<HTMLElement, SwipeOpts> = (node, initial) => {
  let opts = initial;
  let sx = 0;
  let sy = 0;
  let mode: 'off' | 'pending' | 'h' | 'v' = 'off';

  const start = (e: TouchEvent) => {
    if (mode === 'h') opts.onCancel(); // a second finger mid-drag must not leave the page shifted
    mode = 'off';
    if (e.touches.length !== 1) return;
    if (document.querySelector('[data-vaul-drawer][data-state="open"], [data-onboarding]')) return;
    if ((e.target as Element | null)?.closest?.(BLOCKED)) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    mode = 'pending';
  };
  const move = (e: TouchEvent) => {
    if (mode === 'off' || mode === 'v') return;
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (mode === 'pending') {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      mode = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'h' : 'v';
      if (mode === 'v') return;
    }
    opts.onDrag(dx);
  };
  const end = (e: TouchEvent) => {
    const was = mode;
    mode = 'off';
    if (was !== 'h') return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) >= 56) opts.onSwipe(dx < 0 ? 1 : -1);
    else opts.onCancel();
  };
  const cancel = () => {
    if (mode === 'h') opts.onCancel();
    mode = 'off';
  };

  node.addEventListener('touchstart', start, { passive: true });
  node.addEventListener('touchmove', move, { passive: true });
  node.addEventListener('touchend', end, { passive: true });
  node.addEventListener('touchcancel', cancel, { passive: true });
  return {
    update: (next) => { opts = next; },
    destroy() {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', cancel);
    },
  };
};

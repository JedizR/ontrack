// L4, the owner's "no colour at the top or the bottom" (DECISIONS L4 cites WebKit). Safari 26 paints a solid band under
// its bars only for a fixed or sticky element that spans the width at an edge (LocalFrameView::fixedContainerEdges), so
// the landing keeps everything fixed off both edges. What it always draws is its own soft edge, in the page's background
// colour (the body's over the root's), and that colour also fills the strip above the page at the top and below it at
// the end. So the page's background follows the section under the top of the screen, and the edge has nothing to show.
import { topColour } from '$lib/prefs.svelte';

/** The section at height `y` of the window: the nearest `[data-edge]` around what is drawn there, leaving out the bar
 *  and the floating action, which sit over the page. */
function regionAt(root: HTMLElement, y: number) {
  for (const el of document.elementsFromPoint(innerWidth / 2, y)) {
    if (el.closest('[data-over]')) continue;
    const r = el.closest<HTMLElement>('[data-edge]');
    if (r && root.contains(r)) return r;
  }
  return root;
}

/** Paints the page's background (and theme-color, for Chrome and older Safari) the colour of the section under the top
 *  edge, `data-edge` naming its token, read inside that section so a dark one gives its dark value; and tells each
 *  watcher whether the section under its element's middle is dark, so what floats over the page (the bar, the floating
 *  action) can follow it. */
export function followEdges(root: HTMLElement, watch: [() => HTMLElement | undefined, (dark: boolean) => void][]) {
  let frame = 0, top: HTMLElement | null = null, lines: (number | null)[] = [];
  const dark: (boolean | undefined)[] = [];
  const colour = () => (top ? getComputedStyle(top).getPropertyValue(top.dataset.edge!).trim() : '');
  // the watched elements are fixed, so their middles move only when the window changes: measured then, not per frame
  const measure = () => (lines = watch.map(([el]) => { const b = el()?.getBoundingClientRect(); return b ? b.top + b.height / 2 : null; }));
  const run = (force = false) => {
    frame = 0;
    const next = regionAt(root, 0);
    if (next !== top || force) { top = next; topColour(colour); }
    watch.forEach(([, on], i) => {
      const y = lines[i];
      const d = (y === null ? next : regionAt(root, y)).closest('[data-theme]')?.getAttribute('data-theme') === 'dark';
      if (d !== dark[i] || force) on((dark[i] = d));
    });
  };
  const soon = () => { frame ||= requestAnimationFrame(() => run()); };
  const resized = () => { measure(); soon(); };
  // a theme change keeps the section but changes its colour
  const themed = new MutationObserver(() => run(true));
  themed.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  addEventListener('scroll', soon, { passive: true });
  addEventListener('resize', resized);
  measure();
  run(true);
  return () => {
    cancelAnimationFrame(frame);
    themed.disconnect();
    removeEventListener('scroll', soon);
    removeEventListener('resize', resized);
    topColour();
  };
}

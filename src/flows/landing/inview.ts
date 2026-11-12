// MOTION.md recipe B: an element's motion starts once it scrolls into view. The CSS keeps the end state for reduced
// motion, so these only mark the element.

/** Sets `data-inview` once a share of the element is on screen, then stops watching. */
export function inview(el: HTMLElement, threshold = 0.2) {
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    el.dataset.inview = '';
    io.disconnect();
  }, { threshold });
  io.observe(el);
  return { destroy: () => io.disconnect() };
}

/** Calls back whenever the element comes on screen or leaves it. */
export function onscreen(el: HTMLElement, cb: (shown: boolean) => void) {
  const io = new IntersectionObserver(([e]) => cb(e.isIntersecting));
  io.observe(el);
  return { destroy: () => io.disconnect() };
}

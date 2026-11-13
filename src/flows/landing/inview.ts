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

/** Calls back whenever the element comes on screen or leaves it (`margin` grows the screen, as rootMargin does). */
export function onscreen(el: HTMLElement, cb: (shown: boolean) => void, margin = '0px') {
  const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: margin });
  io.observe(el);
  return { destroy: () => io.disconnect() };
}

/** L4: marks a section `data-live` while any of it is on screen (and a little before), so its looping motion runs only
 *  then: landing.css pauses every loop outside a live section, which spares the battery and the scroll. */
export const live = (el: HTMLElement) => onscreen(el, (on) => (on ? (el.dataset.live = '') : delete el.dataset.live), '25% 0px');

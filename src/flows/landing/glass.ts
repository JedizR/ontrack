// L4, Liquid Glass after callstack/liquid-glass (DECISIONS L4): the materials and the tint are CSS (landing.css); this is
// the one behaviour that needs the pointer.

/** UIGlassEffect's `isInteractive`, as callstack/liquid-glass's `interactive`: the glass grows under a touch and lights up
 *  where the finger is. Here the light follows the pointer (`--gx`, `--gy` in px, from the glass's top left; unlit until
 *  a pointer comes) and `data-pressed` marks a press; landing.css draws the light, and the growth when motion is welcome.
 *  A glass that sits behind content (the bar's) is a `.liquid-touch` child: it is the one marked, so a move restyles only
 *  it. Works for decoration too: a tap on a chip answers, though it does nothing.
 *  shortcut: the light is placed from the glass's bounding box, a few px off on a tilted chip; map through its transform
 *  if a glass ever tilts more than about 10 degrees */
export function interactive(el: HTMLElement) {
  const glass = el.querySelector<HTMLElement>(':scope > .liquid-touch') ?? el;
  const move = (e: PointerEvent) => {
    const r = glass.getBoundingClientRect();
    glass.style.setProperty('--gx', `${Math.round(e.clientX - r.left)}px`);
    glass.style.setProperty('--gy', `${Math.round(e.clientY - r.top)}px`);
  };
  const down = (e: PointerEvent) => { move(e); glass.dataset.pressed = ''; };
  const up = () => { delete glass.dataset.pressed; };
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerdown', down, { passive: true });
  const ends = ['pointerup', 'pointercancel', 'pointerleave'] as const;
  for (const t of ends) el.addEventListener(t, up);
  return {
    destroy() {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      for (const t of ends) el.removeEventListener(t, up);
    },
  };
}

/** A card leans toward a mouse over it (`--rx`, `--ry` in deg), a few degrees, and settles back when it leaves; touch
 *  scrolls, so only a mouse or pen leans it. landing.css applies it when motion is welcome. */
export function lean(el: HTMLElement, max = 6) {
  const move = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height - 0.5) * -2 * max).toFixed(2)}deg`);
    el.dataset.leaning = '';
  };
  const leave = () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); delete el.dataset.leaning; };
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerleave', leave);
  return { destroy() { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); } };
}

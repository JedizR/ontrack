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

/** 21 Nov, the owner: a chip floating over a phone turns night glass, with white words, where the screen under it is dark
 *  (the ink boxes on Today). It reads the screenshot under its own box as the page scrolls and the phone floats; the
 *  image is our own, so its pixels can be read. Over the sky or the bezel (less than half on the screen) it stays light. */
export function overDark(el: HTMLElement, set: (dark: boolean) => void) {
  const img = el.closest('[data-phone]')?.querySelector('img');
  if (!img) return;
  const W = 98, H = 199; // a quarter of the screenshot's points: enough to tell ink from grey
  let g: CanvasRenderingContext2D | null = null;
  let frame = 0;
  // drawn once the image has decoded: WebKit draws an image with decoding="async" as nothing until then
  const prep = () => img.decode().then(() => {
    g = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d', { willReadFrequently: true });
    g?.drawImage(img, 0, 0, W, H);
    ask();
  }, () => undefined);
  const read = () => {
    frame = 0;
    if (!g) return;
    const i = img.getBoundingClientRect(), b = el.getBoundingClientRect();
    const x0 = Math.max(0, Math.floor(((b.left - i.left) / i.width) * W)), x1 = Math.min(W, Math.ceil(((b.right - i.left) / i.width) * W));
    const y0 = Math.max(0, Math.floor(((b.top - i.top) / i.height) * H)), y1 = Math.min(H, Math.ceil(((b.bottom - i.top) / i.height) * H));
    const whole = ((b.width / i.width) * W) * ((b.height / i.height) * H);
    if (x1 <= x0 || y1 <= y0 || (x1 - x0) * (y1 - y0) < whole / 2) return set(false);
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let sum = 0;
    for (let k = 0; k < d.length; k += 4) sum += 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
    const lum = sum / (d.length / 4);
    set(lum < 170); // about a third of it over ink: dark words would sit on black
  };
  const ask = () => { if (!frame) frame = requestAnimationFrame(read); };
  img.addEventListener('load', prep);
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  const tick = setInterval(ask, 400); // the chip bobs and the phone floats on their own
  void prep();
  return {
    destroy() {
      cancelAnimationFrame(frame);
      clearInterval(tick);
      img.removeEventListener('load', prep);
      removeEventListener('scroll', ask);
      removeEventListener('resize', ask);
    },
  };
}

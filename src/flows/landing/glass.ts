// L3, the owner's "glass that bends": what is behind Liquid Glass warps a little at its edges, as in iOS 26. Two ways,
// since Safari draws no SVG filter inside backdrop-filter (DESIGN.md section 13).

// Chromium draws SVG filters inside backdrop-filter, and only Chromium has userAgentData (Chrome on iOS is WebKit)
const bends = typeof navigator !== 'undefined' && 'userAgentData' in navigator && CSS.supports('backdrop-filter', 'url(#a)');
const NS = 'http://www.w3.org/2000/svg';

/** A displacement map the glass's size: in its colour, ramps over `r` at each edge that draw the backdrop there from a
 *  little further in, so it magnifies toward the rim (red moves x, green moves y, mid grey stays); in its alpha, the rim
 *  itself, a band `r` wide that fades inward. */
export function bendMap(w: number, h: number, r: number) {
  const ramp = (id: string, len: number, axis: 'x' | 'y', stops: [number, string][]) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x2="${axis === 'x' ? len : 0}" y2="${axis === 'y' ? len : 0}">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>';
  const edges = (len: number, at: (v: number) => string, mid: string) => [[0, at(255)], [r / len, mid], [1 - r / len, mid], [1, at(0)]] as [number, string][];
  const band = (len: number) => [[0, 'white'], [r / len, 'black'], [1 - r / len, 'black'], [1, 'white']] as [number, string][];
  const full = 'width="100%" height="100%"';
  const svg = `<svg xmlns="${NS}" width="${w}" height="${h}">` +
    ramp('x', w, 'x', edges(w, (v) => `rgb(${v},0,0)`, 'rgb(128,0,0)')) + ramp('y', h, 'y', edges(h, (v) => `rgb(0,${v},0)`, 'rgb(0,128,0)')) +
    ramp('a', w, 'x', band(w)) + ramp('b', h, 'y', band(h)) +
    `<mask id="k"><rect ${full} fill="url(#a)"/><rect ${full} fill="url(#b)" style="mix-blend-mode:screen"/></mask>` +
    `<g mask="url(#k)"><rect ${full} fill="url(#x)"/><rect ${full} fill="url(#y)" style="mix-blend-mode:screen"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Chromium only: gives every Liquid Glass surface in `root` its own filter, which blurs the backdrop as `--liquid-blur`
 *  does and, in the rim, draws it lightly blurred and bent instead. `--bend` takes the blur's place in the liquid
 *  utilities, and the root is marked so the lens layers stand down. */
export function bend(root: HTMLElement) {
  if (!bends) return;
  root.dataset.bends = '';
  const defs = document.body.appendChild(document.createElementNS(NS, 'svg'));
  defs.setAttribute('aria-hidden', 'true');
  defs.style.cssText = 'position:absolute;width:0;height:0';
  const ro = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const el = target as HTMLElement, w = el.offsetWidth, h = el.offsetHeight, r = Math.min(16, w / 4, h / 4);
      if (!w || !h) continue;
      // the token's blur goes inside the filter, its saturation stays after it
      const blur = getComputedStyle(el).getPropertyValue('--liquid-blur');
      el.style.setProperty('--bend', blur.replace(/blur\([^)]*\)/, `url(#${el.dataset.bend})`));
      defs.querySelector(`#${el.dataset.bend}`)!.innerHTML =
        `<feImage href="${bendMap(w, h, r)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>` +
        `<feGaussianBlur in="SourceGraphic" stdDeviation="${parseFloat(blur.split('blur(')[1]) || 0}" edgeMode="duplicate" result="body"/>` +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="2" edgeMode="duplicate" result="soft"/>' +
        `<feDisplacementMap in="soft" in2="m" scale="${r}" xChannelSelector="R" yChannelSelector="G" result="bent"/>` +
        '<feComposite in="bent" in2="m" operator="in" result="rim"/><feComposite in="rim" in2="body" operator="over"/>';
    }
  });
  // shortcut: scans once at mount; every glass on the landing renders with it. Watch for new ones if one ever renders later
  root.querySelectorAll<HTMLElement>('.liquid, .liquid-bar, .liquid-white, .liquid-violet').forEach((el, i) => {
    el.dataset.bend = `bend-${i}`;
    // the glass's own box, and sRGB, or the map's mid grey reads as a shift in linear light
    defs.insertAdjacentHTML('beforeend', `<filter id="bend-${i}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"></filter>`);
    ro.observe(el);
  });
  return { destroy: () => { ro.disconnect(); defs.remove(); } };
}

/** Safari and the rest: a `.lens` span inside a glass lines its rim with the gradient image behind it (the nearest
 *  `[data-lens]` ancestor, or one beside an ancestor), aligned with it and scaled about the glass's middle by the CSS, so
 *  the picture bends at the edge. Layout offsets, not boxes, so a tilt or a rise in progress does not shift it. */
export function lens(el: HTMLElement) {
  const glass = el.parentElement!;
  let src: HTMLElement | null = null;
  for (let a: HTMLElement | null = glass; a && !src; a = a.parentElement) src = a.matches('[data-lens]') ? a : a.querySelector(':scope > [data-lens]');
  if (!src) return;
  const source = src;
  const at = (e: HTMLElement) => {
    let x = 0, y = 0;
    for (let p: Element | null = e; p instanceof HTMLElement; p = p.offsetParent) { x += p.offsetLeft; y += p.offsetTop; }
    return [x, y];
  };
  const place = () => {
    const [gx, gy] = at(glass), [sx, sy] = at(source), x = gx - sx, y = gy - sy;
    el.style.cssText = `--lx:${x}px;--ly:${y}px;--lw:${source.offsetWidth}px;--lh:${source.offsetHeight}px;--lo:${x + glass.offsetWidth / 2}px ${y + glass.offsetHeight / 2}px`;
  };
  const ro = new ResizeObserver(place);
  ro.observe(glass);
  ro.observe(source);
  return { destroy: () => ro.disconnect() };
}

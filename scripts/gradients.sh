#!/bin/sh
# P1: the photo gradients, made on https://photogradient.com/ in the manner of the owner's example (round 3, screenshots
# 07 and 08): Gradient "Sharp Bézier", Warp Shape "Worley Noise", Warp 0.4 of 1.5 (27 percent), Warp Size 1 of 3
# (33 percent), eight colour points, Noise 0 here. The grain is the site's own noise at 60 percent (0.095 of 0.15), drawn
# once as a tile (the `grain` row, below) and laid over every gradient by `--grain`: a pixel of the site's noise at that
# ratio is its colour mixed 9.5 percent toward a random grey, which is the tile's random grey at 9.5 percent alpha, so the
# result is the site's export, kept crisp at any size and at a fraction of the weight of baking it into each image.
#
# Each row: name, width, height (image px), noise, then eight points "colour x y" (0 to 1 from the top left, the site's
# positions; Worley warp shows each colour up and left of its point), then the palette names. Light gradients use the
# palette as it is (docs/DESIGN.md section 4); a name "@k" is that colour deepened to k over night (#121214), for the dark
# theme and for white words. Every row has the brand: violet (#381AC9) or lavender (#BEBEFF), as depth or an accent; the
# note after "brand:" says which sits where (its point, and the part of the image it shows in). The words each one
# carries are checked in tests/unit/contrast.test.ts (these colours) and tests/e2e/landing.spec.ts (the images).
#= haze-light     800 480 0   F9BBA1 0.30 0.22  EDDECC 0.62 0.20  BEBEFF 0.98 0.26  FFFFFF 0.45 0.55  F9BBA1 0.16 0.86  A7BEDB 0.78 0.70  BEBEFF 0.50 1.00  A7BEDB 1.00 1.00  | peach sand lavender snow peach mist lavender mist; brand: lavender at 0.98 0.26 (top right), lavender at 0.50 1.00 (bottom left)
#= haze-dark      800 480 0   121214 0.30 0.26  384C5A 0.70 0.16  65403C 1.00 0.34  121214 0.40 0.70  733C33 0.86 0.76  381AC9 0.06 1.00  121214 0.70 1.00  6E3A32 1.00 1.00  | night steel@.42 coral@.36 night clay@.46 violet night clay@.44; brand: violet at 0.06 1.00 (bottom left)
#= feature-light  800 480 0   381AC9 0.28 0.26  486478 0.62 0.12  68688A 0.55 0.58  935952 1.00 0.30  381AC9 0.16 0.96  6B6674 0.60 1.00  A95445 1.00 0.70  85524B 0.95 1.00  | violet steel@.6 lavender@.5 coral@.56 violet heather@.6 clay@.72 coral@.5; brand: violet at 0.28 0.26 (top left), lavender@.5 at 0.55 0.58 (centre), violet at 0.16 0.96 (bottom left)
#= feature-dark   800 480 0   121214 0.26 0.22  381AC9 0.62 0.26  90493D 1.00 0.20  121214 0.30 0.74  381AC9 0.78 0.74  85524B 1.00 0.98  3F5668 0.14 0.50  121214 0.52 1.00  | night violet clay@.6 night violet coral@.5 steel@.5 night; brand: violet at 0.62 0.26 (top centre), violet at 0.78 0.74 (centre)
#= sky-light     1200 800 0   A7BEDB 0.45 0.20  FFFFFF 0.75 0.25  6C9BBB 1.00 0.15  EDDECC 0.62 0.52  F9BBA1 0.95 0.55  BEBEFF 0.28 0.60  F89183 0.78 0.92  A69EB4 0.38 1.00  | mist snow steel sand peach lavender coral heather; brand: lavender at 0.28 0.60 (middle left)
#= sky-dark      1200 800 0   121214 0.40 0.14  3A505F 0.78 0.20  381AC9 0.12 0.30  364957 0.62 0.50  121214 1.00 0.46  69423E 0.78 0.80  733C33 1.00 0.98  121214 0.30 0.98  | night steel@.45 violet steel@.4 night coral@.38 clay@.46 night; brand: violet at 0.12 0.30 (top left)
#= glow          1600 624 0   121214 0.20 0.20  121214 1.00 0.15  3F5668 0.40 0.60  9C5E57 0.62 0.58  9D4E41 0.78 0.78  381AC9 0.90 0.66  121214 0.25 1.00  121214 1.00 1.00  | night night steel@.5 coral@.6 clay@.66 violet night night; brand: violet at 0.90 0.66 (middle right)
#= panel          800 800 0   BEBEFF 0.30 0.25  F9BBA1 0.70 0.22  FFFFFF 1.00 0.30  BEBEFF 0.55 0.60  A7BEDB 0.20 0.90  F89183 0.85 0.80  BEBEFF 0.55 1.00  A69EB4 1.00 1.00  | lavender peach snow lavender mist coral lavender heather; brand: lavender at 0.30 0.25 (top left), lavender at 0.55 0.60 (centre), lavender at 0.55 1.00 (bottom centre)
#= wash-ink       600 450 0   121214 0.30 0.25  121214 0.80 0.20  381AC9 1.00 0.45  121214 0.45 0.62  55515C 0.22 0.98  364957 0.70 0.90  121214 1.00 1.00  464E5A 0.55 0.30  | night night violet night heather@.45 steel@.4 night mist@.35; brand: violet at 1.00 0.45 (top right)
#= wash-steel     600 450 0   4A677C 0.30 0.25  5C6878 0.80 0.22  4D6C82 0.98 0.55  445D70 0.50 0.60  121214 0.18 0.85  555F6E 0.80 0.95  486478 1.00 1.00  381AC9 0.55 1.00  | steel@.62 mist@.5 steel@.66 steel@.55 night mist@.45 steel@.6 violet; brand: violet at 0.55 1.00 (bottom centre)
#= wash-clay      600 450 0   A55244 0.30 0.25  975C54 0.78 0.20  816358 1.00 0.50  9A4D40 0.55 0.62  381AC9 0.18 0.95  864439 0.82 0.92  905851 1.00 1.00  121214 0.50 1.00  | clay@.7 coral@.58 peach@.48 clay@.65 violet clay@.55 coral@.55 night; brand: violet at 0.18 0.95 (bottom left)
#= wash-sand      600 450 0   EDDECC 0.30 0.25  F9BBA1 0.80 0.20  FFFFFF 0.55 0.50  F89183 1.00 0.62  EDDECC 0.20 0.85  A7BEDB 0.70 0.92  F9BBA1 1.00 1.00  BEBEFF 0.45 1.00  | sand peach snow coral sand mist peach lavender; brand: lavender at 0.45 1.00 (bottom left)
#= call           800 480 0   6B6674 0.25 0.22  486478 0.62 0.18  381AC9 0.95 0.30  635F6C 0.40 0.62  A95445 0.85 0.78  121214 0.15 0.95  975C54 1.00 1.00  3F5668 0.55 1.00  | heather@.6 steel@.6 violet heather@.55 clay@.72 night coral@.58 steel@.5; brand: violet at 0.95 0.30 (top right)
#= grain          256 256 0.15 808080 0.2 0.2 808080 0.5 0.2 808080 0.8 0.2 808080 0.2 0.5 808080 0.8 0.5 808080 0.2 0.8 808080 0.5 0.8 808080 0.8 0.8 | eight mid greys: the site's noise alone
#
# Usage: sh scripts/gradients.sh [name ...]   (all rows when no name is given)
# Needs Yab (https://yab.app) and cwebp. Yab opens the site, sets its own gradient state (the colours, the positions its
# photo picker would set, the settings, the size at 1x) and clicks Download; it cannot publish a download started by a
# script, so the canvas the site renders for the download is kept on the page and read back in chunks.
set -e
cd "$(dirname "$0")/.."
out=design/gradients
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
tab=null
only=" $* "
sed -n 's/^#= //p' "$0" | cut -d'|' -f1 | while read -r name w h noise rest; do
  case "$only" in "  " | *" $name "*) ;; *) continue ;; esac
  set -- $rest
  cols='' pos=''
  while [ $# -gt 0 ]; do cols="$cols\"#$1\","; pos="$pos$2,$3,"; shift 3; done
  job="{\"name\":\"$name\",\"w\":$w,\"h\":$h,\"noise\":$noise,\"colors\":[${cols%,}],\"pos\":[${pos%,}]}"
  cat > "$tmp/job.js" <<EOF
const J = $job;
const t = $tab ? tab($tab) : open('https://photogradient.com/');
// a script in the page's own world: the site is React, and its state lives there
const page = (body) => t.eval(\`(() => { const s = document.createElement('script'); s.textContent = \${JSON.stringify('(' + body + ')()')}; document.head.appendChild(s); })()\`);
// the site saves its export with canvas.toBlob: keep it as a data URL instead (the grain: as its noise alone, below)
page(\`() => {
  HTMLCanvasElement.prototype.toBlob = function () {
    if (document.body.dataset.job !== 'grain') { document.body.dataset.img = this.toDataURL('image/webp', 1); return; }
    // the site's pixel is mix(grey, rand, 0.15): take rand back out, in eight steps, and give it the grain's alpha
    const c = Object.assign(document.createElement('canvas'), { width: this.width, height: this.height });
    const g = c.getContext('2d'); g.drawImage(this, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height); let m = 0;
    for (let i = 0; i < d.data.length; i += 4) m += d.data[i] / (d.data.length / 4);
    for (let i = 0; i < d.data.length; i += 4) {
      const r = Math.min(7, Math.max(0, Math.floor(((d.data[i] - m) / 255 / 0.15 + 0.5) * 8)));
      d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.round((r + 0.5) * 32); d.data[i + 3] = Math.round(0.095 * 255);
    }
    g.putImageData(d, 0, 0); document.body.dataset.img = c.toDataURL('image/png');
  };
}\`);
const set = (patch) => page(\`() => {
  const el = document.querySelector('.panel');
  let f = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))];
  for (; f; f = f.return) for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next)
    if (h.memoizedState && 'warpRatio' in h.memoizedState) return h.queue.dispatch((p) => ({ ...p, ...\${JSON.stringify(patch)} }));
}\`);
t.eval(\`document.body.dataset.job = \${JSON.stringify(J.name)}; delete document.body.dataset.img;\`);
// a change of randomNumber makes the site place its points again, from positions when it is 0
set({ randomNumber: 1 });
sleep(300);
set({ randomNumber: 0, gradientTypeIndex: 4, warpShapeIndex: 3, warpRatio: 0.4, warpSize: 1, noiseRatio: J.noise,
  numberPoints: 8, colors: J.colors.map((value, i) => ({ id: J.name + i, value })), positions: J.pos, bgColor: J.colors[0],
  customWidth: J.w / 2, customHeight: J.h / 2, widthExport: J.w / 2, heightExport: J.h / 2 });
sleep(700);
// Download opens the export settings (1x of the size above, at the canvas's pixel density 2); its own Download saves
t.click(t.find('Download'));
const refs = [...String(t.snapshot()).matchAll(/(e\d+) clickable "Download"/g)].map((m) => m[1]);
t.click(refs[refs.length - 1]);
let n = 0;
for (let k = 0; k < 40 && !n; k++) { sleep(250); n = Number(t.eval('(document.body.dataset.img || "").length')); }
t.press('Escape');
return JSON.stringify(t.id) + ' ' + n;
EOF
  # yab reads no rows: the loop's stdin is the table
  set -- $(yab exec -f "$tmp/job.js" --timeout 120 2>/dev/null </dev/null | head -1)
  tab=$1 n=$2
  [ "${n:-0}" -gt 0 ] || { echo "$name: no export" >&2; exit 1; }
  : > "$tmp/url"
  a=0
  while [ $a -lt "$n" ]; do
    yab exec "return JSON.parse(tab($tab).eval('document.body.dataset.img.slice($a, $((a + 30000)))'))" --output-limit 32000 2>/dev/null </dev/null | head -1 | tr -d '\n' >> "$tmp/url"
    a=$((a + 30000))
  done
  cut -d, -f2 "$tmp/url" | base64 -d > "$tmp/$name.img"
  if [ "$name" = grain ]; then
    cwebp -quiet -lossless -z 9 "$tmp/$name.img" -o "$out/$name.webp"
  else
    # smooth gradients: lossy at 90 is indistinguishable and a few kilobytes
    cwebp -quiet -q 90 "$tmp/$name.img" -o "$out/$name.webp"
  fi
  echo "$name $(wc -c < "$out/$name.webp" | tr -d ' ') bytes"
done

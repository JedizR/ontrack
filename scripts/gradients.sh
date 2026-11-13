#!/bin/sh
# L2: the photo gradients, made on https://photogradient.com/ (Sharp Bezier, Smooth Noise, warp 0.4, warp size 1, noise 0)
# and exported as PNG at 2x, then turned into small WebP files here. The grain is one shared tile, exported from the same
# site with seven mid greys at noise 0.15, laid over each gradient with soft-light (the `haze`, `feature` and `grained`
# utilities), so it stays crisp at any size and costs one small file. Seven colours, placed by the site in this order:
# top left, top centre, top right, middle left, centre, bottom right, bottom left.
#   haze-light     D4E1FF F4F4FF CECEFF F4F7FF FBFBFF F8DFFA DAF7FC   1000 x 600   the app's hero haze, light
#   haze-dark      26365A 24233A 3A3481 1F1F26 1E1E22 412749 1F2430   1000 x 600   the hero haze, dark
#   feature-light  5B4FF5 4A36DE 381AC9 4B3BE6 3F22C8 9233BB 3A1DC4   1000 x 600   the featured card, light
#   feature-dark   4B40E0 3A28C8 2C14A8 3A2CC8 2E18A6 7A2AA0 2B159E   1000 x 600   the featured card, dark
#   sky-light      8F8CFF 8888FF A3B4FF F2F0FF F5F5FF C9C2FF 9A96FF   1200 x 800   the landing hero, light
#   sky-dark       2E16B0 381AC9 23308F 17142E 1A1638 2A1890 381AC9   1200 x 800   the landing hero, dark
#   glow           121214 121214 121214 1C1650 5B4FF5 121214 121214   1600 x 800   the dark sections' glow
#   panel          BEBEFF D6CCFF B8C8FF CFC6FF E6E0FF C2B4FF D0D8FF    900 x 900   the check-in's lavender field
#   wash-ink       3A3A3E 34343A 2C2C34 24242A 1C1C20 121214 18181C    600 x 450   the sources' cards (pick 10)
#   wash-blue      2F52C8 2747B8 2440A8 213C9E 1E3592 1A2F86 1C3290    600 x 450
#   wash-magenta   9A3AC4 9233BB 8A2DB2 842AAC 7A25A0 6D1F8E 74229A    600 x 450
#   wash-lavender  FFFFFF F7F7FF EDEDFF E4E4FF D8D8FF BEBEFF CACAFF    600 x 450
#   grain          808080 x 7, noise 0.15                              256 x 256
# Usage: sh scripts/gradients.sh <folder of the exports, named as above with .png>
set -e
src=${1:?the folder of PNG exports}
out=design/gradients
# name, width
w() { cwebp -quiet -q 90 -resize "$2" 0 "$src/$1.png" -o "$out/$1.webp"; }
for n in haze-light haze-dark feature-light feature-dark; do w "$n" 800; done
w sky-light 1200
w sky-dark 1200
w panel 800
for n in wash-ink wash-blue wash-magenta wash-lavender; do w "$n" 600; done
# the glow's brightest point sits 61 percent down the export: crop so it sits at the middle, where the page anchors it
cwebp -quiet -q 90 -crop 0 352 3200 1248 -resize 1600 0 "$src/glow.png" -o "$out/glow.webp"
# two image pixels to a CSS pixel at the tile's 128 px
cwebp -quiet -q 60 -crop 0 0 256 256 "$src/grain.png" -o "$out/grain.webp"
ls -l $out

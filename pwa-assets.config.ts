import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// public/favicon.svg is a copy of design/brand/app-icon.svg (`pnpm icons` copies it): a full-bleed ink tile whose
// mark already sits inside the maskable safe zone, so no padding. The ink background matches the tile (--on-lime).
const ink = { background: '#131517', fit: 'contain' } as const;
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: ink },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: ink },
  },
  images: ['public/favicon.svg'],
});

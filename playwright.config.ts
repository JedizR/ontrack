import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;
// Safari on a 390 by 844 iPhone with its toolbars showing (viewport 390 by 664), WebKit, the mock backend, Bangkok time
const phone = { ...devices['iPhone 13'], locale: 'en-US', timezoneId: 'Asia/Bangkok' };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    actionTimeout: 8000,
    // E2E_BASE_URL may be a Vercel preview behind deployment protection
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined,
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `pnpm vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_BACKEND: 'mock', VISION_PROVIDER: 'mock' },
  },
  projects: [
    { name: 'light', testMatch: /(app|sync|onboarding|today|photo|train|progress|thai|supplements|scan)\.spec\.ts/, use: { ...phone, colorScheme: 'light' } },
    { name: 'dark', testMatch: /app\.spec\.ts/, use: { ...phone, colorScheme: 'dark' } },
    // screenshots at scale 2: the same layout as the phone at scale 3, in less CI time
    { name: 'screens', testMatch: /screens\.spec\.ts/, use: { ...phone, deviceScaleFactor: 2 } },
    // a real scan (B1): Chromium's fake camera plays a clip of a barcode, which WebKit cannot. Chromium on Linux has no
    // BarcodeDetector, so CI reads it with the WebAssembly reader Safari uses; macOS uses Chrome's own
    {
      name: 'camera',
      testMatch: /camera\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        locale: 'en-US',
        timezoneId: 'Asia/Bangkok',
        permissions: ['camera'],
        launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=tests/fixtures/barcodes/scan.y4m'] },
      },
    },
    // layout only, no touch input: Chromium, viewports set per describe
    { name: 'stress', testMatch: /stress\.spec\.ts/, use: { locale: 'en-US', timezoneId: 'Asia/Bangkok' } },
  ],
});

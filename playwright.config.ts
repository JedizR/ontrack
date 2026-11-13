import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets two worktrees run end to end tests side by side without reusing each other's server
const PORT = Number(process.env.E2E_PORT) || 5199;
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
    { name: 'light', testMatch: /(app|sync|onboarding|landing|today|photo|train|progress|thai|supplements|scan|friends|settings|motion)\.spec\.ts/, use: { ...phone, colorScheme: 'light' } },
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
    // O1's tap and time measure, printed for the pull request; not part of any gate
    { name: 'measure', testMatch: /(measure|start)\.spec\.ts/, use: { ...phone, colorScheme: 'light' } },
    // M9b: every feature in airplane mode, and U2's update flow, against a production build with its service worker
    // (E2E_BASE_URL, see offline.spec.ts)
    { name: 'offline', testMatch: /(offline|update)\.spec\.ts/, use: { ...phone, colorScheme: 'light' } },
    // U1c's eight main tasks, counted and timed; TASK_VIDEO=1 films them in light and dark. Not part of any gate
    { name: 'tasks', testMatch: /tasks\.spec\.ts/, use: { ...phone, video: process.env.TASK_VIDEO ? 'on' : 'off' } },
    // the landing page's phone screens (L1): writes images only with LANDING_SHOTS=1
    { name: 'shots', testMatch: /landing-shots\.spec\.ts/, use: { ...phone } },
    // layout only, no touch input: Chromium, viewports set per describe
    { name: 'stress', testMatch: /stress\.spec\.ts/, use: { locale: 'en-US', timezoneId: 'Asia/Bangkok' } },
  ],
});

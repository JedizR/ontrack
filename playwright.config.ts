import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;
// iPhone 12 to 16 size, WebKit, the mock backend, Bangkok time
const phone = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'Asia/Bangkok' };

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
    { name: 'light', testMatch: /(app|sync)\.spec\.ts/, use: { ...phone, colorScheme: 'light' } },
    { name: 'dark', testMatch: /app\.spec\.ts/, use: { ...phone, colorScheme: 'dark' } },
    { name: 'screens', testMatch: /screens\.spec\.ts/, use: { ...phone } },
    // layout only, no touch input: Chromium, viewports set per describe
    { name: 'stress', testMatch: /stress\.spec\.ts/, use: { locale: 'en-US', timezoneId: 'Asia/Bangkok' } },
  ],
});

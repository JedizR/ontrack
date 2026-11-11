#!/usr/bin/env node
// Installability + offline check via Chrome's own CDP audit.  node scripts/check-pwa.mjs <url>
import { chromium } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173/';
// a persistent profile: Chrome never reports incognito windows as installable
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pwa-check-')), { channel: 'chromium' });
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(url);
await page.evaluate(() => navigator.serviceWorker.ready);
const cdp = await ctx.newCDPSession(page);
const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
const manifest = await cdp.send('Page.getAppManifest');
console.log('manifest:', manifest.url, manifest.errors.length ? manifest.errors : 'no errors');
console.log('installability errors:', installabilityErrors.length ? installabilityErrors : 'none (installable)');
await page.reload(); // let the SW take control
await ctx.setOffline(true);
await page.reload();
const ok = await page.getByTestId('hero').isVisible().catch(() => false);
console.log('offline reload renders the app:', ok);
await ctx.close();
process.exit(installabilityErrors.length || !ok ? 1 : 0);

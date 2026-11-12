// The shell: header, three tabs, the dock. Runs in the light and dark projects (WebKit, 390 by 844).
import { test, expect } from '@playwright/test';
import { MEALS, open, openFresh, swipeAt, wheelType, withPrefs } from './helpers';

const title = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 1 });

test('the shell opens on Today with the header and dock', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await expect(title(page)).toHaveText('Today');
  await expect(page.getByTestId('tab-0')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('tab-today')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a meal' })).toBeVisible();
  // the theme follows the system before first paint
  const scheme = test.info().project.use.colorScheme;
  await expect(page.locator('html')).toHaveAttribute('data-theme', scheme === 'dark' ? 'dark' : 'light');
});

test('tabs switch from the dock and the last tab is remembered', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await page.getByTestId('tab-1').click();
  await expect(title(page)).toHaveText('Train');
  await expect(page.getByTestId('tab-train')).toBeVisible();
  await page.getByTestId('tab-2').click();
  await expect(title(page)).toHaveText('Progress');
  await expect(page.getByTestId('tab-2')).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(title(page)).toHaveText('Progress');
});

test('swiping anywhere between header and dock moves between tabs and wraps around', async ({ page }) => {
  await open(page);
  await swipeAt(page, -120); // the empty middle of the screen, below the tab's content
  await expect(title(page)).toHaveText('Train');
  await swipeAt(page, 120, { y: 140 }); // on the content
  await expect(title(page)).toHaveText('Today');
  await swipeAt(page, 120);
  await expect(title(page)).toHaveText('Progress');
  // a short drag is not a swipe
  await swipeAt(page, -30);
  await expect(title(page)).toHaveText('Progress');
});

test('theme and text size are set before the app runs', { tag: '@smoke' }, async ({ page }) => {
  // block the app bundle (dev source or built asset), so only the inline pre-paint script can set them
  await page.route(/\/src\/main\.ts|\/assets\/index-.*\.js/, (r) => r.abort());
  await withPrefs(page, { theme: 'dark', fontSize: 'xl' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-fs', 'xl');
  expect(await html.evaluate((h) => h.style.getPropertyValue('--fs'))).toBe('1.3');
  await expect(page.getByTestId('dock')).toHaveCount(0);
});

test('the app sits in a 480 px column on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await open(page);
  const box = await page.getByTestId('header').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(480);
  expect(box!.x).toBeGreaterThan(200);
});

// M1: the component gallery (dev and previews only)
test('a wheel takes keys and typing, and the wheel sheet saves its value', { tag: '@smoke' }, async ({ page }) => {
  await open(page, '/gallery');
  const height = page.getByTestId('wheel-height').getByRole('slider');
  await expect(height).toHaveAttribute('aria-valuenow', '170');
  await expect(height).toHaveAttribute('aria-valuetext', '170 cm');
  await height.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await expect(height).toHaveAttribute('aria-valuenow', '173');
  await page.keyboard.press('End');
  await expect(height).toHaveAttribute('aria-valuenow', '250');
  await page.keyboard.press('Home');
  await expect(height).toHaveAttribute('aria-valuenow', '100');
  await wheelType(page, 'wheel-height', '182');
  await expect(height).toHaveAttribute('aria-valuenow', '182');
  await wheelType(page, 'wheel-height', '400'); // kept inside the range
  await expect(height).toHaveAttribute('aria-valuenow', '250');

  // a decimal wheel: whole and tenths columns, one field for the whole value
  const weight = page.getByTestId('wheel-weight').getByRole('slider');
  await wheelType(page, 'wheel-weight', '82,4');
  await expect(weight.first()).toHaveAttribute('aria-valuenow', '82');
  await expect(weight.nth(1)).toHaveAttribute('aria-valuenow', '4');
  await expect(weight.nth(1)).toHaveAttribute('aria-valuetext', '82.4 kg');

  await page.getByRole('button', { name: 'Open the wheel sheet' }).click();
  await expect(page.getByTestId('picker-save')).toHaveText('Save 82.4 kg');
  await wheelType(page, 'picker-wheel', '83.1');
  await expect(page.getByTestId('picker-save')).toHaveText('Save 83.1 kg');
  await page.getByTestId('picker-save').click();
  await expect(page.getByTestId('picker')).toHaveCount(0);
  await expect(page.getByText('Weigh-in saved, 83.1 kg')).toBeVisible();
});

test('a sheet opens with its main action and closes', async ({ page }) => {
  await open(page, '/gallery');
  await page.getByRole('button', { name: 'Open a sheet' }).click();
  const sheet = page.getByTestId('sample-sheet');
  await expect(sheet.getByRole('heading', { name: 'Chicken rice bowl' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Add 648 kcal' })).toBeInViewport();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);
});

test('the track turns green in its zone and the counterpart follows', async ({ page }) => {
  await open(page, '/gallery');
  const hero = page.locator('[data-section="hero"]');
  const track = hero.getByRole('progressbar');
  await expect(track).toHaveAttribute('data-reached', 'false');
  await expect(hero.getByText('620')).toBeVisible();
  const add = page.getByRole('button', { name: 'Add 250 kcal' });
  await add.click();
  await add.click();
  await expect(track).toHaveAttribute('data-reached', 'true');
  await expect(hero.getByText('On track')).toBeVisible();
  await expect(hero.getByTestId('hero-value')).toHaveText('2,340');
  await add.click();
  await add.click();
  await expect(track).toHaveAttribute('data-reached', 'false');
  await expect(hero.getByText('over')).toBeVisible();
});

test('holding the stepper repeats, an undo toast undoes, the sync mark explains itself', async ({ page }) => {
  await open(page, '/gallery');
  const more = page.getByRole('button', { name: 'More grams' });
  await more.hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  const field = page.getByRole('textbox', { name: 'grams' });
  expect(Number(await field.inputValue())).toBeGreaterThan(200); // one press is 190; holding repeats
  // the number can be typed; it is kept, not rounded to the step, and the buttons go on from it
  await field.fill('125');
  await field.press('Enter');
  await expect(field).toHaveValue('125');
  await more.click();
  await expect(field).toHaveValue('135');
  // a whole number counter: a comma groups thousands, a fraction rounds
  await field.fill('1,250');
  await field.press('Enter');
  await expect(field).toHaveValue('1250');
  await field.fill('12.6');
  await field.press('Enter');
  await expect(field).toHaveValue('13');

  await page.getByRole('button', { name: 'Show an undo toast' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Meal restored')).toBeVisible();

  await page.getByRole('button', { name: /^Offline/ }).click();
  await expect(page.getByText('Offline. Changes stay in this browser until you reconnect')).toBeVisible();
});

test('the theme and text size change from the gallery and are remembered', async ({ page }) => {
  await open(page, '/gallery');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.getByRole('button', { name: 'Larger' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-fs', 'xl');
});

// D2's gate: every button is flat. No gradient, no bevel and no glow on a button, the face that fills it (Button's inner
// span) or their ::before and ::after; a soft drop that falls below the button, or a hairline ring, is all the depth a
// button may have. Smaller things inside a button are content, not its face: that is how Today's hero card, a button
// holding the screen's one haze panel, passes (DESIGN.md section 6).
const unflat = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const layers = (v: string) => (v === 'none' ? [] : v.split(/,(?![^(]*\))/));
  const glow = (layer: string) => {
    if (/inset/.test(layer)) return true; // a bevel or inner light
    const colour = layer.match(/rgba?\(([^)]+)\)/)?.[1];
    if (!colour) return true; // a colour this check cannot read is not taken on trust
    const [r, g, b, a = 1] = colour.split(',').map(Number);
    const [, y = 0, blur = 0] = (layer.replace(/rgba?\([^)]+\)/, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
    // a halo with no drop, or a coloured or light shadow, is a glow
    return a > 0 && blur > 0 && (y <= 0 || Math.max(r, g, b) - Math.min(r, g, b) > 100 || (r + g + b) / 3 > 128);
  };
  const bad: string[] = [];
  let checked = 0;
  for (const btn of document.querySelectorAll<HTMLElement>('button, [role="button"]')) {
    const box = btn.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    checked++;
    const faces = [btn, ...[...btn.querySelectorAll<HTMLElement>('*')].filter((e) => {
      const r = e.getBoundingClientRect();
      return Math.abs(r.width - box.width) < 2 && r.height >= box.height - 10;
    })];
    for (const f of faces) for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(f, pseudo);
      if (pseudo && cs.content === 'none') continue;
      if (cs.backgroundImage !== 'none' || cs.textShadow !== 'none' || layers(cs.boxShadow).some(glow))
        bad.push(`${btn.getAttribute('aria-label') ?? btn.textContent?.trim().slice(0, 30)}${pseudo ?? ''}: ${cs.backgroundImage} ${cs.boxShadow}`);
    }
  }
  return { checked, bad };
});

test('no gradient, bevel or glow on any button in the gallery, on Today and in the Add sheet', { tag: '@smoke' }, async ({ page }) => {
  await open(page, '/gallery');
  await expect(page.locator('[data-section="buttons"]')).toBeVisible();
  // the check itself catches D1's 3D pill, a violet glow and a bevel drawn in a pseudo-element, and lets a soft drop through
  await page.evaluate(() => {
    const add = (style: string, label: string, before = '') => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', label);
      b.style.cssText = `width: 80px; height: 44px; ${style}`;
      if (before) {
        b.className = label.replace(/ /g, '-');
        document.head.append(Object.assign(document.createElement('style'), { textContent: `.${b.className}::before { content: ''; ${before} }` }));
      }
      document.body.append(b);
    };
    add('background: linear-gradient(#6262fe, #381ac9)', 'probe gradient');
    add('box-shadow: inset 0 1px 1px #fff, 0 3px 3px rgba(40, 16, 162, 0.32)', 'probe bevel');
    add('box-shadow: 0 0 24px rgba(98, 98, 254, 0.6)', 'probe glow');
    add('', 'probe rim', 'position: absolute; inset: 0; background: linear-gradient(#fff, transparent)');
    add('background: #121214; box-shadow: 0 6px 14px rgba(18, 18, 20, 0.12)', 'probe flat');
  });
  const probes = (await unflat(page)).bad.filter((b) => b.startsWith('probe')).map((b) => b.split(': ')[0]);
  expect(probes).toEqual(['probe gradient', 'probe bevel', 'probe glow', 'probe rim::before']);
  await page.reload();
  await expect(page.locator('[data-section="buttons"]')).toBeVisible();
  const gallery = await unflat(page);
  expect(gallery.bad).toEqual([]);
  expect(gallery.checked).toBeGreaterThan(30);

  await open(page, '/', MEALS);
  await expect(page.getByTestId('hero')).toBeVisible();
  await expect(page.getByTestId('meal').first()).toBeVisible();
  const today = await unflat(page);
  expect(today.bad).toEqual([]);
  expect(today.checked).toBeGreaterThan(10);
  await page.getByTestId('add').click();
  await expect(page.getByTestId('add-photo')).toBeVisible();
  const add = await unflat(page);
  expect(add.bad).toEqual([]);
  expect(add.checked).toBeGreaterThan(today.checked);
});

test('no gradient, bevel or glow on any button on the landing page', async ({ page }) => {
  await openFresh(page);
  const landing = await unflat(page);
  expect(landing.bad).toEqual([]);
  expect(landing.checked).toBeGreaterThanOrEqual(6);
});

// Friends and the food map (S1b, PRD F16 and F17) on the mock backend, with two people on two phones in one space.
// The gate from BUILD-PLAN S1: request, accept, share, see the pin, open it, unshare, remove the friend.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { EMAIL, open, seedAccount, space, TODAY, takePhoto, vision, withPrefs } from './helpers';
import { befriend, flush, openMap, person, quietTiles, raise, shareAt } from './social';

const BANGKOK = { latitude: 13.74662, longitude: 100.53932 };
const PROGRAM = { collection: 'program', id: 'program', updatedAt: 2, data: { name: 'Upper lower', sessions: [{ key: 'u1', weekday: 0, name: 'Upper A', type: 'strength', minutes: 60, intensity: 'moderate' }, { key: 'r1', weekday: 2, name: 'Easy ride', type: 'cardio', minutes: 30, intensity: 'light' }] } };

/** A second phone for someone else in the same space, signed in, on Today. */
async function phone(browser: Browser, s: string, email: string, geo = false) {
  const context = await browser.newContext({ ...test.info().project.use, ...(geo ? { geolocation: BANGKOK, permissions: ['geolocation'] } : {}) });
  const page = await context.newPage();
  await quietTiles(page);
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await seedAccount(page, { space: s, email });
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
  return page;
}
const pins = (page: Page) => page.getByTestId('pin');
const toast = (page: Page, text: string) => expect(page.locator('[data-sonner-toast]').filter({ hasText: text })).toBeVisible();

test('two friends: request, accept, share, see the pin, open it, unshare, remove', { tag: '@smoke' }, async ({ browser }) => {
  const s = space('friends');
  const setup = await browser.newPage();
  await person(setup, s, EMAIL, { handle: 'nan_eats', name: 'Nan' });
  await person(setup, s, 'rin@example.com', { handle: 'rin', name: 'Rin', showProgram: true }, [PROGRAM]);
  await setup.close();
  const nan = await phone(browser, s, EMAIL, true);
  const rin = await phone(browser, s, 'rin@example.com');

  // Nan finds Rin by handle and asks
  await openMap(nan);
  await nan.getByTestId('friend-search').fill('@Ri');
  const result = nan.getByTestId('search-results').getByTestId('person');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Rin');
  await expect(result).toContainText('@rin');
  await result.getByTestId('person-add').click();
  await toast(nan, 'Request sent to Rin');
  await expect(result).toContainText('Requested');
  await nan.getByTestId('friend-search').fill('');
  await expect(nan.getByTestId('sent')).toContainText('Rin');

  // Rin sees the request on the map button and accepts it
  await rin.reload();
  await expect(rin.getByTestId('friends-badge')).toHaveText('1');
  await expect(rin.getByTestId('friends')).toHaveAttribute('aria-label', 'Friends and map, 1 friend request');
  await openMap(rin);
  await rin.getByTestId('panel-requests').click();
  const request = rin.getByTestId('request');
  await expect(request).toContainText('@nan_eats wants to be friends');
  await request.getByTestId('request-accept').click();
  await toast(rin, 'You and Nan are friends');
  await expect(rin.getByTestId('friend-list')).toContainText('Nan');
  await expect(rin.getByTestId('requests')).toHaveCount(0);

  // Nan sees Rin's program, which Rin shows
  await nan.getByTestId('map-back').click();
  await openMap(nan);
  await raise(nan);
  await nan.getByTestId('friend-list').getByTestId('friend').click();
  const sheet = nan.getByTestId('friend-sheet');
  await expect(sheet.getByTestId('friend-session')).toHaveCount(2);
  await expect(sheet.getByTestId('friend-session').first()).toContainText('Monday');
  await expect(sheet.getByTestId('friend-session').first()).toContainText(/Upper A\W+Strength\W+60 min/);
  await expect(sheet).not.toContainText('kg');
  await nan.keyboard.press('Escape');
  await nan.getByTestId('map-back').click();

  // Nan shares a photo meal: no location in the photo, so one sentence comes before the phone is asked
  await vision(nan, s, { fixture: 'basil-pork' });
  await takePhoto(nan, true);
  const share = nan.getByTestId('review-share');
  await expect(share.getByTestId('review-share-note')).toHaveText('Friends see the photo and its nutrition where it was taken.');
  await share.getByTestId('review-share-switch').click();
  await expect(share.getByTestId('review-share-note')).toHaveText('This photo has no location, so Ontrack asks for yours once, rounded to about 100 m and never live.');
  await share.getByTestId('review-share-locate').click();
  await expect(share.getByTestId('review-share-note')).toHaveText('Placed where you are now, rounded to about 100 m.');
  await nan.getByTestId('review-add').click();
  await expect(nan.getByTestId('review-sheet')).toBeHidden();
  await flush(nan);

  // Nan's own pin shows at once; Rin sees it once it is on the server
  await openMap(nan);
  await expect(pins(nan)).toHaveCount(1);
  await expect(pins(nan)).toHaveAttribute('aria-label', 'You, Basil pork with rice and fried egg');
  await nan.getByTestId('map-back').click();

  await rin.getByTestId('map-fit').click();
  await expect(pins(rin)).toHaveCount(1);
  await expect(pins(rin)).toHaveAttribute('aria-label', 'Nan, Basil pork with rice and fried egg');
  await pins(rin).click();
  const pin = rin.getByTestId('pin-sheet');
  await expect(pin).toContainText('Basil pork with rice and fried egg');
  await expect(pin.getByTestId('pin-who')).toContainText('Nan');
  await expect(pin.getByTestId('pin-who')).toContainText('Today, ');
  await expect(pin.getByTestId('pin-kcal')).toHaveText('712');
  await expect(pin.getByTestId('pin-nutrition')).toContainText('g protein');
  await expect(pin.getByTestId('shared-photo')).toBeVisible();
  await expect(pin.getByTestId('pin-unshare')).toHaveCount(0);
  await rin.keyboard.press('Escape');

  // Nan takes it off the map from the Meal sheet, at once
  await nan.getByTestId('meal').first().click();
  await expect(nan.getByTestId('meal-share-switch')).toHaveAttribute('aria-checked', 'true');
  await nan.getByTestId('meal-share-switch').click();
  await toast(nan, 'Taken off the map');
  await flush(nan);
  await rin.getByTestId('map-fit').click();
  await expect(pins(rin)).toHaveCount(0);

  // Rin removes Nan, behind a confirm step
  await raise(rin);
  await rin.getByTestId('friend-list').getByTestId('friend').click();
  await rin.getByTestId('friend-remove').click();
  await expect(rin.getByTestId('friend-sheet')).toContainText("You stop seeing each other's shared meals and program.");
  await rin.getByTestId('friend-remove-confirm').click();
  await toast(rin, 'Nan removed');
  await expect(rin.getByTestId('friends-none')).toBeVisible();

  await nan.keyboard.press('Escape');
  await openMap(nan);
  await raise(nan);
  await expect(nan.getByTestId('friends-none')).toBeVisible();
});

test('a new profile through Add: set up, the program switch off by default, then the request goes', async ({ page, browser }) => {
  await quietTiles(page);
  const s = await open(page);
  const rin = await person(page, s!, 'rin@example.com', { handle: 'rin', name: 'Rin' });
  await openMap(page);
  await raise(page);
  await expect(page.getByTestId('panel-setup')).toContainText('Pick a handle so friends can find you.');
  await page.getByTestId('friend-search').fill('rin');
  await page.getByTestId('person-add').click();

  const sheet = page.getByTestId('profile-sheet');
  await expect(sheet).toContainText('Set up your profile');
  await expect(page.getByTestId('profile-program')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('profile-save')).toBeDisabled();
  await page.getByTestId('profile-name').fill('Nan');
  await page.getByTestId('profile-handle').fill('Rin');
  await expect(page.getByTestId('profile-handle-note')).toHaveText('That handle is taken. Try another.');
  await page.getByTestId('profile-handle').fill('nan eats');
  await expect(page.getByTestId('profile-handle-note')).toHaveText('Use letters, numbers and underscores only.');
  await page.getByTestId('profile-handle').fill('@Nan_Eats');
  await expect(page.getByTestId('profile-handle-note')).toHaveText('Available');
  await page.getByTestId('profile-photo-input').setInputFiles('tests/fixtures/meal.jpg');
  await expect(page.getByTestId('profile-preview')).toBeVisible();
  await page.getByTestId('profile-save').click();
  await expect(sheet).toBeHidden();
  await toast(page, 'Request sent to Rin');
  await expect(page.getByTestId('person')).toContainText('Requested');
  await page.getByTestId('friend-search').fill('');
  await expect(page.getByTestId('panel-me')).toContainText('@nan_eats');

  // Rin finds the new handle and sees a request from it
  const other = await browser.newContext({ ...test.info().project.use });
  const rp = await other.newPage();
  await quietTiles(rp);
  await rp.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await seedAccount(rp, { space: s, email: rin.email, onboarded: false });
  await rp.goto('/');
  await expect(rp.getByTestId('friends-badge')).toHaveText('1');
  await openMap(rp);
  await rp.getByTestId('friend-search').fill('nan');
  await expect(rp.getByTestId('person')).toContainText('Nan');
  await expect(rp.getByTestId('person-accept')).toBeVisible();
  await other.close();
});

test('pins group with +N more and open as pages; no photo yet, offline and no WebGL each say so', async ({ page, browser }) => {
  await quietTiles(page);
  const s = await open(page, '/', [{ collection: 'social', id: 'social', updatedAt: 1, data: { handle: 'nan_eats', name: 'Nan' } }]);
  const rin = await person(page, s!, 'rin@example.com', { handle: 'rin', name: 'Rin' });
  const nan = await person(page, s!, EMAIL, null);
  await befriend(page, nan, rin);
  await shareAt(page, rin, { id: 'r1', title: 'Khao man kai', kcal: 596, lat: 13.744, lng: 100.53, time: '12:40' });
  await shareAt(page, rin, { id: 'r2', title: 'Som tam', kcal: 180, lat: 13.744, lng: 100.53, time: '18:10', date: '2026-11-10' });
  await shareAt(page, rin, { id: 'r3', title: 'Pad see ew', kcal: 680, lat: 13.744, lng: 100.531, time: '08:00', date: '2026-11-02', photo: false });
  await openMap(page);
  await expect(pins(page)).toHaveCount(1);
  await expect(page.getByTestId('pin-more')).toHaveText('+2 more');
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenStreetMap');
  await pins(page).click();
  const sheet = page.getByTestId('pin-sheet');
  await expect(sheet.getByTestId('pin-page')).toHaveText('1 of 3');
  await expect(sheet.getByTestId('pin-who')).toContainText('Today, 12:40');
  await sheet.getByTestId('pin-next').click();
  await expect(sheet.getByTestId('pin-who')).toContainText('Yesterday, 18:10');
  await sheet.getByTestId('pin-next').click();
  await expect(sheet.getByTestId('pin-who')).toContainText('Nov 2, 08:00');
  await expect(sheet.getByTestId('shared-photo-coming')).toHaveText('The photo is on its way');
  await page.keyboard.press('Escape');

  // the location sentence before the map asks, once
  await page.getByTestId('map-locate').click();
  await expect(page.getByTestId('map-locate-note')).toContainText('It is not sent or kept.');
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByTestId('map-locate-note')).toBeHidden();

  // offline: the map and the friends list say they need a connection
  await page.getByTestId('map-back').click();
  await page.context().setOffline(true);
  await page.getByTestId('friends').click();
  await expect(page.getByTestId('map-message')).toHaveText('The map needs a connection. Meals you share go on it when you are back online.');
  await raise(page);
  await expect(page.getByTestId('panel-message')).toContainText('Friends need a connection.');
  await page.context().setOffline(false);

  // no WebGL: a plain message, and the friends list still works
  const other = await browser.newContext({ ...test.info().project.use });
  const np = await other.newPage();
  await quietTiles(np);
  await np.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return kind.startsWith('webgl') ? null : get.call(this, kind as '2d', ...(rest as []));
    } as typeof get;
  });
  await np.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await seedAccount(np, { space: s, email: EMAIL, onboarded: false });
  await np.goto('/');
  await openMap(np);
  await expect(np.getByTestId('map-message')).toHaveText('This browser cannot draw the map. Your friends are still below.');
  await raise(np);
  await expect(np.getByTestId('friend-list')).toContainText('Rin');
  await other.close();
});

test('Share to map: a refused location turns the switch off and says how to allow it', async ({ page }) => {
  await withPrefs(page, { photoOk: true, locationOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'basil-pork' });
  await takePhoto(page);
  await page.getByTestId('review-share-switch').click();
  await expect(page.getByTestId('review-share-note')).toHaveText("Location is off for Ontrack. Allow it in your browser's settings to share to the map.");
  await expect(page.getByTestId('review-share-switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('review-add').click();
  await expect(page.getByTestId('review-sheet')).toBeHidden();
});

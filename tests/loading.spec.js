import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const origin = 'https://tzechingchan0605-cloud.github.io';
const address = `${origin}/Antibiotic/`;
const mime = { '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.jpg': 'image/jpeg' };

// Exercise the production HTTPS origin and repository subdirectory without
// relying on network access or sending test records to a live service.
async function publishedFiles(page, { oldMarkup = false, failBundle } = {}) {
  let html = await readFile(resolve(root, 'index.html'), 'utf8');
  if (oldMarkup) html = html.replace('id="historyCaption" ', '').replace('id="colonyMeaning" ', '');
  const requested = [];
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url());
    const file = url.pathname.replace(/^\/Antibiotic\//, '') || 'index.html';
    requested.push(file);
    if (file === 'index.html') return route.fulfill({ contentType: 'text/html', body: html });
    if (file === 'app.bundle.js') return route.fulfill({ contentType: 'text/javascript',
      body: 'throw new Error("Stale unversioned JavaScript was loaded")' });
    if (/^app\.bundle\.[a-f0-9]{12}\.js$/.test(file) && failBundle) {
      return failBundle === 'missing'
        ? route.fulfill({ status: 404, body: 'Not found' })
        : route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Startup failure")' });
    }
    const path = resolve(root, file);
    if (!path.startsWith(root + '/')) return route.abort();
    try { return route.fulfill({ contentType: mime[extname(file)], body: await readFile(path) }); }
    catch { return route.fulfill({ status: 404, body: 'Not found' }); }
  });
  return requested;
}

test('GitHub Pages loads the matching versioned bundle despite a stale unversioned asset', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const requested = await publishedFiles(page);
  await page.goto(address);
  await expect(page.locator('#loginDialog')).toBeVisible();
  await expect(page.locator('#loginForm button[type="submit"]')).toHaveText('進入實驗室 →');
  await expect(page.locator('#startupPanel')).toHaveCount(0);
  expect(requested.some(file => /^app\.bundle\.[a-f0-9]{12}\.js$/.test(file))).toBe(true);
  expect(requested).not.toContain('app.bundle.js');
  expect(errors).toEqual([]);
  await page.locator('#profileName').fill('載入測試');
  await page.locator('#profileClass').fill('S4');
  await page.locator('#profileEmail').fill('loading@example.test');
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.getByLabel('你的初步觀察', { exact: true })).toBeVisible();
  expect(await page.locator('#historyFigure image').evaluate(async element => {
    const image = new Image(); image.src = element.getAttribute('href');
    await image.decode(); return [image.naturalWidth, image.naturalHeight];
  })).toEqual([352, 347]);
});

test('older cached caption markup still reaches the student login', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await publishedFiles(page, { oldMarkup: true });
  await page.goto(address);
  await expect(page.locator('#loginDialog')).toBeVisible();
  await expect(page.locator('#startupPanel')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const failure of ['missing', 'runtime']) {
  test(`${failure} bundle failure shows recovery and preserves saved work`, async ({ page }) => {
    const key = 'vl4.antibiotics.records.v1';
    const saved = '[{"id":"saved-student-work"}]';
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key, saved });
    await publishedFiles(page, { failBundle: failure });
    await page.goto(address);
    await expect(page.locator('#startupStatus')).toContainText('載入未完成');
    await expect(page.locator('#startupReload')).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
    await page.locator('#startupReload').click();
    await expect(page).toHaveURL(/\/Antibiotic\/\?reload=\d+/);
    await expect(page.locator('#startupReload')).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
  });
}

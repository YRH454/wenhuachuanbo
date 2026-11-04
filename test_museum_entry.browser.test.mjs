import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

// This server only serves static files. Intercept API calls as an additional safeguard.
const origin = 'http://127.0.0.1:4212';
const browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
const reports = [];

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1093, height: 855 }, { width: 768, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: '静态预览：未连接模型。' } }));
    await page.goto(origin + '/?variant=A#/map', { waitUntil: 'domcontentloaded' });
    const entry = page.getByRole('link', { name: /齐鲁文化博物馆/ });
    await entry.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#city-links .city-link').length === 16);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const entryElement = document.querySelector('.museum-entry');
      const entry = rect(entryElement);
      const coveredCities = new Set();
      entryElement.style.pointerEvents = 'none';
      for (let x = entry.left + 2; x < entry.right; x += 4) {
        for (let y = entry.top + 2; y < entry.bottom; y += 4) {
          const city = document.elementFromPoint(x, y)?.closest('.city-link');
          if (city) coveredCities.add(city.id);
        }
      }
      entryElement.style.removeProperty('pointer-events');
      return { entry, header: rect(document.querySelector('.topbar')),
        map: rect(document.querySelector('.map-figure')), coveredCities: [...coveredCities], scrollWidth: document.documentElement.scrollWidth };
    });
    assert.ok(Math.abs((geometry.entry.left + geometry.entry.right) / 2 - viewport.width / 2) < 2, 'entry is centered in the viewport');
    assert.ok(geometry.entry.top >= geometry.header.bottom - 1, 'entry does not overlap the header');
    assert.ok(geometry.entry.left >= 0 && geometry.entry.right <= viewport.width, 'entry fits the viewport');
    assert.ok(geometry.entry.height >= 44, 'entry has a comfortable touch target');
    assert.deepEqual(geometry.coveredCities, [], 'entry does not cover the clickable city artwork');
    assert.ok(geometry.scrollWidth <= viewport.width, 'page has no horizontal overflow');
    assert.equal(await entry.getAttribute('href'), 'museum/');
    if (viewport.width <= 700) assert.ok(geometry.entry.bottom <= geometry.map.top + 1, 'mobile entry sits above the map');
    const screenshot = join(tmpdir(), 'museum-entry-' + viewport.width + '.png');
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    await entry.focus();
    assert.equal(await entry.evaluate(element => document.activeElement === element), true, 'entry is keyboard-focusable');
    await entry.press('Enter');
    await page.waitForURL('**/museum/');
    assert.deepEqual(errors, [], 'map and museum entry do not raise JavaScript errors');
    reports.push({ viewport, geometry, screenshot, status: 'passed (API mocked)' });
    await context.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}

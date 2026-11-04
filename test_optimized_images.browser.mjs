// No model calls: check real rendered images, both styles, and original fallback.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const read = path => readFile(new URL(`./dist/${path}`, import.meta.url), 'utf8').then(JSON.parse);
const map = await read('assembly-manifest.json');
const optimized = (await read('optimized-assets.json')).entries;
const python = [
  'from functools import partial',
  'from http.server import ThreadingHTTPServer',
  'from pathlib import Path',
  'from server import PreviewHandler',
  's=ThreadingHTTPServer(("127.0.0.1",0),partial(PreviewHandler,directory=str(Path("dist").resolve())))',
  'print(s.server_port,flush=True)',
  's.serve_forever()',
].join('\n');
const service = spawn('python', ['-u', '-c', python], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Static test server did not start')), 10000);
    service.stdout.once('data', data => { clearTimeout(timeout); resolve(Number(String(data).trim())); });
    service.once('error', error => { clearTimeout(timeout); reject(error); });
    service.once('exit', code => { clearTimeout(timeout); reject(new Error(`Static test server exited: ${code}`)); });
  });
  const origin = `http://127.0.0.1:${port}`;
  browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('yiwu-xiaoqi-auto-v1', 'off'));
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/?variant=A#/map', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#map')?.getAttribute('aria-busy') === 'false'
    && document.querySelectorAll('#city-art image[data-state="loaded"]').length === 16);
  assert.equal(await page.locator('#city-art image[href*="/optimized/"]').count(), 16);
  assert.match(await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage), /optimized\/user-selected/);
  await page.getByRole('button', { name: '工艺融合' }).click();
  await page.waitForFunction(() => location.search.includes('variant=B') && document.querySelector('#map')?.getAttribute('aria-busy') === 'false'
    && document.querySelectorAll('#city-art image[data-state="loaded"]').length === 16);
  assert.equal(await page.locator('#city-art image[href*="/optimized/"]').count(), 16);
  await page.evaluate(() => { location.hash = '/city/370300'; });
  await page.waitForFunction(() => document.querySelector('#city-background')?.dataset.state === 'loaded');
  assert.match(await page.locator('#city-background img').getAttribute('src'), /\/optimized\/.*\.webp$/);
  await page.goto(origin + '/museum/#archive', { waitUntil: 'domcontentloaded' });
  const exhibit = page.locator('.artwork-image img').first();
  await exhibit.scrollIntoViewIfNeeded();
  await exhibit.waitFor({ state: 'visible' });
  await page.waitForFunction(() => { const img = document.querySelector('.artwork-image img'); return img?.complete && img.naturalWidth > 0; });
  assert.match(await exhibit.getAttribute('src'), /\/optimized\/.*\.webp$/);
  await page.goto(origin + '/people-culture-v1/?city=370300&preview=1#objects', { waitUntil: 'domcontentloaded' });
  const object = page.locator('.screen img').first();
  await object.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => { const img = document.querySelector('.screen img'); return img?.complete && img.naturalWidth > 0; });
  assert.match(await object.getAttribute('src'), /\/optimized\/.*\.webp$/);
  assert.deepEqual(errors, []);
  await context.close();

  // Failure of an optimized file falls back to the exact original, without losing the city.
  const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await fallbackContext.addInitScript(() => localStorage.setItem('yiwu-xiaoqi-auto-v1', 'off'));
  const fallbackPage = await fallbackContext.newPage();
  const city = map.cities[0], original = city.variants.A.src, display = optimized[original].src;
  await fallbackPage.route('**/' + display, route => route.abort());
  await fallbackPage.goto(origin + '/?variant=A#/map', { waitUntil: 'domcontentloaded' });
  await fallbackPage.waitForFunction(id => document.querySelector(`[data-city-art="${id}"] image`)?.dataset.state === 'loaded', city.cityId);
  assert.equal(await fallbackPage.locator(`[data-city-art="${city.cityId}"] image`).getAttribute('href'), original);
  assert.equal(await fallbackPage.locator('#image-status').isHidden(), true);
  await fallbackContext.close();
  console.log('Optimized image browser checks passed (both map styles, city, museum, object, fallback).');
} finally {
  if (browser) await browser.close();
  service.kill();
}

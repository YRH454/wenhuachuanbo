// Full-page interaction tests. Every model response is intercepted and mocked.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const python = [
  'import museum_assistant_server as app',
  'server = app.make_server(0, "test-only-credential")',
  'print(server.server_port, flush=True)',
  'server.serve_forever()'
].join('\n');
const service = spawn('python', ['-u', '-c', python], { stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Test service did not start')), 10000);
  service.stdout.once('data', data => { clearTimeout(timeout); resolve(Number(String(data).trim())); });
  service.once('error', error => { clearTimeout(timeout); reject(error); });
  service.once('exit', code => { clearTimeout(timeout); reject(new Error(`Test service exited: ${code}`)); });
});
let browser;
try {
  browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
  const reports = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 360, height: 720 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.__spoken = [];
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        cancel() {}, getVoices() { return []; }, speak(utterance) { window.__spoken.push(utterance.text); }
      } });
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    });
    const page = await context.newPage();
    const requests = [], errors = [];
    const mobile = viewport.width <= 700;
    async function openPanel() {
      const companion = page.getByRole('button', { name: '打开小齐文化向导' });
      if (await companion.isVisible()) await companion.click();
      else await page.getByRole('button', { name: /小齐.*陪你逛展/ }).click();
      const panel = page.getByRole('dialog', { name: '小齐' });
      await panel.waitFor();
      return panel;
    }
    async function toggleControl(from, to, pressed) {
      const scope = mobile ? await openPanel() : page;
      await scope.getByRole('button', { name: from, exact: true }).click();
      assert.equal(await scope.getByRole('button', { name: to, exact: true }).getAttribute('aria-pressed'), pressed);
      if (mobile) await scope.getByRole('button', { name: '关闭小齐对话' }).click();
    }
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/museum-assistant/chat', async route => {
      const body = route.request().postDataJSON(); requests.push(body);
      const id = body.sceneId || body.exhibitId || 'general';
      const data = { answer: `模拟讲解 ${id}`, sources: [] };
      if (body.sceneId) data.scene = { id, evidence: 'draft', hasImage: true };
      if (body.exhibitId) data.exhibit = { id, evidence: 'unverified' };
      await route.fulfill({ json: data }).catch(() => {});
    });
    await page.goto(`http://127.0.0.1:${port}/?variant=A#/map`, { waitUntil: 'domcontentloaded' });
    await page.locator('.guide-reading-text').filter({ hasText: '模拟讲解 map' }).waitFor({ state: 'attached', timeout: 15000 });
    assert.equal(await page.locator('[data-museum-assistant]').count(), 1, 'the map has one shared assistant');
    assert.equal(await page.locator('.guide-disclosure').count(), 0, 'the narration dock has no persistent disclosure label');
    assert.equal(requests.filter(item => item.sceneId === 'map').length, 1, 'map narration is requested once');
    const screenshot = join(tmpdir(), `xiaoqi-universal-map-${viewport.width}.png`);
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await toggleControl('语音 · 关', '语音 · 开', 'true');
    assert.deepEqual(await page.evaluate(() => window.__spoken), ['模拟讲解 map']);

    await toggleControl('自动讲解 · 开', '自动讲解 · 关', 'false');
    const count = requests.length;
    await page.evaluate(() => { location.hash = '/city/370300'; });
    await page.waitForTimeout(4000);
    assert.equal(requests.length, count, 'turning automatic narration off prevents model calls after navigation');
    await toggleControl('自动讲解 · 关', '自动讲解 · 开', 'true');
    await page.locator('.guide-reading-text').filter({ hasText: '模拟讲解 city-370300' }).waitFor({ state: 'attached', timeout: 15000 });
    assert.equal(requests.at(-1).sceneId, 'city-370300');
    const cityScreenshot = join(tmpdir(), `xiaoqi-universal-city-${viewport.width}.png`);
    await page.screenshot({ path: cityScreenshot, animations: 'disabled' });
    await page.getByRole('button', { name: '打开小齐文化向导' }).click();
    const panel = page.getByRole('dialog', { name: '小齐' });
    await panel.waitFor();
    assert.equal(await panel.getByText('模拟讲解 city-370300').count(), 1, 'opening chat retains the current narration');
    const input = page.getByRole('textbox', { name: '问问小齐' });
    await input.fill('这座城市有什么文化？'); await input.press('Enter');
    await page.waitForFunction(() => [...document.querySelector('[data-museum-assistant]').shadowRoot.querySelectorAll('.message-user .message-text')].some(n => n.textContent === '这座城市有什么文化？'));
    await page.waitForTimeout(300);
    assert.equal(requests.at(-1).sceneId, 'city-370300', 'manual questions use the same city');
    await panel.getByRole('button', { name: '自动讲解 · 开' }).click();
    assert.equal(await panel.getByRole('button', { name: '自动讲解 · 关' }).getAttribute('aria-pressed'), 'false');
    await panel.getByRole('button', { name: '自动讲解 · 关' }).click();
    const afterQuestion = requests.length;
    await page.waitForTimeout(2500);
    assert.equal(requests.length, afterQuestion, 'automatic requests pause while chat is open');
    await page.getByRole('button', { name: '关闭小齐对话' }).click();
    await page.waitForTimeout(2600);
    assert.equal(requests.length, afterQuestion, 'reopening the same context uses its cached narration');

    // Navigation closes the old panel; reopening it must target the newly selected city.
    await page.getByRole('button', { name: '打开小齐文化向导' }).click();
    await page.evaluate(() => { location.hash = '/city/370200'; });
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-museum-assistant]')?.shadowRoot;
      return root?.querySelector('.exhibit-context strong')?.textContent === '青岛';
    }, null, { timeout: 15000 });
    await page.getByRole('button', { name: '打开小齐文化向导' }).click();
    assert.equal(requests.length, afterQuestion, 'reopening immediately does not start narration');
    await input.fill('这里有什么文化？'); await input.press('Enter');
    await page.waitForFunction(() => [...document.querySelector('[data-museum-assistant]').shadowRoot.querySelectorAll('.message-user .message-text')].some(n => n.textContent === '这里有什么文化？'));
    await page.waitForTimeout(300);
    assert.equal(requests.at(-1).sceneId, 'city-370200', 'questions follow the newly selected city');
    await page.getByRole('button', { name: '关闭小齐对话' }).click();

    await page.goto(`http://127.0.0.1:${port}/museum/#archive`, { waitUntil: 'domcontentloaded' });
    const artwork = page.getByRole('button', { name: '让小齐看看：蛋壳陶高柄杯' });
    await artwork.scrollIntoViewIfNeeded();
    await artwork.focus();
    await page.locator('.guide-reading-text').filter({ hasText: '模拟讲解 sdu-egg' }).waitFor({ state: 'attached', timeout: 15000 });
    assert.ok(requests.some(item => item.exhibitId === 'sdu-egg'));
    const museumScreenshot = join(tmpdir(), `xiaoqi-universal-museum-${viewport.width}.png`);
    await page.screenshot({ path: museumScreenshot, animations: 'disabled' });
    await page.evaluate(() => {
      const host = document.querySelector('[data-museum-assistant]');
      window.__exhibitGuideVisibility = [];
      host.addEventListener('assistantvisibility', event => window.__exhibitGuideVisibility.push({
        open: event.detail.open, dockHidden: host.shadowRoot.querySelector('.guide-dock').hidden
      }));
    });
    await artwork.click();
    await page.getByRole('dialog', { name: '小齐' }).waitFor();
    assert.equal(await page.getByRole('dialog', { name: '小齐' }).getByText('模拟讲解 sdu-egg').count(), 1, 'picture click opens its own narration');
    await page.getByRole('button', { name: '关闭小齐对话' }).click();
    assert.deepEqual(await page.evaluate(() => window.__exhibitGuideVisibility.slice(-2)), [
      { open: true, dockHidden: true }, { open: false, dockHidden: false }
    ], 'exhibit panel and guide dock never overlap during open or close');
    await toggleControl('自动讲解 · 开', '自动讲解 · 关', 'false');
    const stopped = requests.length;
    await page.goto(`http://127.0.0.1:${port}/people-culture-v1/?city=370300&preview=1#objects`, { waitUntil: 'domcontentloaded' });
    if (mobile) {
      const settings = await openPanel();
      assert.equal(await settings.getByRole('button', { name: '自动讲解 · 关' }).count(), 1, 'off preference survives page navigation');
      await settings.getByRole('button', { name: '关闭小齐对话' }).click();
    } else assert.equal(await page.getByRole('button', { name: '自动讲解 · 关' }).count(), 1, 'off preference survives page navigation');
    await page.waitForTimeout(2600);
    assert.equal(requests.length, stopped);
    await toggleControl('自动讲解 · 关', '自动讲解 · 开', 'true');
    const object = page.locator('#object-trigger-zibo-boshan-glass');
    await object.waitFor(); await object.click();
    await page.locator('#object-zibo-boshan-glass').scrollIntoViewIfNeeded();
    await page.locator('.guide-reading-text').filter({ hasText: '模拟讲解 object-370300-zibo-boshan-glass' }).waitFor({ state: 'attached', timeout: 15000 });
    assert.equal(requests.at(-1).sceneId, 'object-370300-zibo-boshan-glass');
    assert.deepEqual(errors, []);
    reports.push({ viewport, screenshot, cityScreenshot, museumScreenshot, status: 'passed (mock model)' });
    await context.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  if (browser) await browser.close();
  service.kill();
}

// Browser tests use an isolated local service and mocked model responses only.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const python = [
  'import museum_assistant_server as app',
  'server=app.make_server(0,"test-only-credential")',
  'print(server.server_port,flush=True)',
  'server.serve_forever()',
].join('\n');
const service = spawn('python', ['-u', '-c', python], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const index = { version: 1, contexts: {
  'scene:map': { text: '济南泉水与淄博琉璃资料', evidence: 'draft', sources: [
    { label: '泉水资料', url: 'https://example.org/springs' },
    { label: '危险链接', url: 'javascript:alert(1)' },
  ] },
  'scene:map-b': { text: '地图工艺版资料', evidence: 'draft', sources: [] },
  'scene:city-370300': { text: '淄博文化资料', evidence: 'draft', sources: [] },
} };
try {
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Test service did not start')), 10000);
    service.stdout.once('data', data => { clearTimeout(timeout); resolve(Number(String(data).trim())); });
    service.once('error', error => { clearTimeout(timeout); reject(error); });
    service.once('exit', code => { clearTimeout(timeout); reject(new Error(`Test service exited: ${code}`)); });
  });
  browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
  async function newPage(viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('yiwu-xiaoqi-auto-v1', 'off'));
    const page = await context.newPage();
    return { context, page };
  }
  async function openMap(page, variant = 'A') {
    await page.goto(`http://127.0.0.1:${port}/?variant=${variant}#/map`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-museum-assistant]')?.shadowRoot
      ?.querySelector('.exhibit-context strong')?.textContent === '山东文化地图');
    await page.getByRole('button', { name: '打开小齐文化向导' }).click();
    await page.getByRole('dialog', { name: '小齐' }).waitFor();
  }
  async function ask(page, question) {
    const input = page.getByRole('textbox', { name: '问问小齐' });
    await input.fill(question); await input.press('Enter');
  }

  // Useful, attributed local notes appear before a slow model, and stay on error.
  {
    const { context, page } = await newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/museum-assistant/context-index', route => route.fulfill({ json: index }));
    await page.route('**/api/museum-assistant/chat', async route => {
      await gate;
      await route.fulfill({ status: 503, json: { error: '模拟服务繁忙' } }).catch(() => {});
    });
    await openMap(page); await ask(page, '地图里有哪些文化？');
    const note = page.locator('.waiting-note');
    await note.waitFor({ state: 'visible' });
    assert.match(await note.innerText(), /济南泉水与淄博琉璃资料/);
    assert.equal(await note.getByRole('link', { name: '泉水资料' }).count(), 1);
    assert.equal(await note.getByRole('link', { name: '危险链接' }).count(), 0);
    release();
    await page.getByText('模拟服务繁忙').waitFor();
    assert.equal(await page.locator('.message-notice').filter({ hasText: '济南泉水与淄博琉璃资料' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: '重新提问' }).count(), 1);
    await context.close();
  }

  // A slow index arriving after an immediate model failure still supplies its note.
  {
    const { context, page } = await newPage({ width: 390, height: 844 });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/museum-assistant/context-index', async route => {
      await gate; await route.fulfill({ json: index }).catch(() => {});
    });
    let requestBody;
    await page.route('**/api/museum-assistant/chat', async route => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 503, json: { error: '模型暂时不可用' } });
    });
    await openMap(page, 'B'); await ask(page, '看看地图');
    await page.getByText('模型暂时不可用').waitFor();
    assert.equal(requestBody.sceneId, 'map-b');
    release();
    await page.locator('.message-notice').filter({ hasText: '地图工艺版资料' }).waitFor();
    assert.equal(await page.locator('.message-notice').filter({ hasText: '济南泉水与淄博琉璃资料' }).count(), 0);
    await context.close();
  }
  console.log('Quick context browser checks passed (mock model; desktop and phone).');
} finally {
  if (browser) await browser.close();
  service.kill();
}

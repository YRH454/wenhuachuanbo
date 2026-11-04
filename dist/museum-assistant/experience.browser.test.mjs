// All requests are intercepted; this test must only use a static local preview.
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const origin = 'http://127.0.0.1:4212';
const browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
const question = '请像文化向导一样，用两三句简短介绍当前画面和有依据的文化线索；资料不足不要猜。';

async function checkGuide(viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel() {}, getVoices() { return []; }, speak() {}
    } });
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  });
  const page = await context.newPage();
  const requests = [], counts = new Map(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname !== '/api/museum-assistant/chat') return route.continue();
    const body = request.postDataJSON(); requests.push(body);
    const id = body.sceneId || body.exhibitId || 'general';
    const count = (counts.get(id) || 0) + 1; counts.set(id, count);
    if (id === 'map' && count === 1) return route.fulfill({ status: 429, json: { error: '请求较多，请稍后重试。' } });
    if (id === 'city-370300' && count === 1) {
      await new Promise(resolve => setTimeout(resolve, 1800));
      return route.fulfill({ json: { answer: '不应出现的旧讲解', sources: [], scene: { id, evidence: 'draft' } } }).catch(() => {});
    }
    return route.fulfill({ json: { answer: `山东的手艺与生活在器物中相遇，留下值得细细品味的文化故事。模拟讲解 ${id}`, sources: [], scene: { id, evidence: 'draft' } } }).catch(() => {});
  });
  try {
    await page.goto(origin + '/?variant=A#/map', { waitUntil: 'domcontentloaded' });
    await page.locator('.guide-dock[data-state="error"]').waitFor({ state: 'attached', timeout: 15000 });
    await page.evaluate(() => {
      const host = document.querySelector('[data-museum-assistant]');
      window.__guideVisibilityChecks = [];
      host.addEventListener('assistantvisibility', event => window.__guideVisibilityChecks.push({
        open: event.detail.open, dockHidden: host.shadowRoot.querySelector('.guide-dock').hidden
      }));
    });
    assert.equal(requests.length, 1, 'one automatic request is made initially');
    assert.equal(requests[0].mode, 'guide');
    assert.equal(requests[0].messages.at(-1).content, question, 'the server cache question is unchanged');
    await page.waitForTimeout(2600);
    assert.equal(requests.length, 1, '429 is not retried automatically');
    const retry = page.getByRole('button', { name: '重试讲解 · 山东文化地图' });
    await retry.focus(); await retry.press('Enter');
    await page.locator('.guide-dock[data-state="ready"]').waitFor({ state: 'attached', timeout: 15000 });
    assert.equal(requests.length, 2, 'a retry happens only after the user asks for it');
    const readGeometry = () => page.evaluate(() => {
      const root = document.querySelector('[data-museum-assistant]').shadowRoot;
      const dock = root.querySelector('.guide-dock'), reading = root.querySelector('.guide-reading');
      const text = root.querySelector('.guide-reading-text'), style = getComputedStyle(text);
      const r = reading.getBoundingClientRect();
      const selectors = '.topbar,.museum-entry,#city-links .city-hit,.map-figure figcaption,.art-shelf,.artwork-image,.artwork-meta,.cg-scene-open,.zibo-scene-open,.cg-scene-back,.zibo-scene-back,.object-panel,[role="tabpanel"],#xiaoqi-actor';
      const covered = [...document.querySelectorAll(selectors)].filter(node => {
        const o = node.getBoundingClientRect();
        return o.width && o.height && Math.min(r.right, o.right) > Math.max(r.left, o.left)
          && Math.min(r.bottom, o.bottom) > Math.max(r.top, o.top);
      }).map(node => node.className?.baseVal || node.className || node.id);
      return { layout: dock.dataset.mobileLayout, occluded: dock.dataset.occluded, visibility: getComputedStyle(reading).visibility,
        width: r.width, height: r.height, scrollWidth: document.documentElement.scrollWidth, covered,
        textHeight: text.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight), clipPath: style.clipPath,
        describedBy: root.querySelector('.guide-reading-open').getAttribute('aria-describedby') };
    });
    const geometry = await readGeometry();
    assert.ok(geometry.scrollWidth <= viewport.width);
    if (viewport.width <= 700) {
      assert.equal(geometry.describedBy, 'guide-reading-description', 'the full guide remains available to assistive technology');
      if (geometry.layout === 'summary') {
        assert.ok(geometry.width <= 225 && geometry.height <= 90, 'the mobile summary remains compact');
        assert.equal(geometry.clipPath, 'none', 'the summary is visually readable');
        assert.ok(geometry.textHeight <= geometry.lineHeight * 2 + 1, 'the visible summary is at most two lines');
        assert.deepEqual(geometry.covered, [], 'the summary does not cover protected content');
      } else {
        assert.ok(geometry.height <= 45 && geometry.width <= 165, 'the compact fallback fits');
        if (geometry.occluded !== 'true') {
          assert.equal(geometry.clipPath, 'none', 'even the compact fallback shows a line of narration');
          assert.ok(geometry.textHeight <= geometry.lineHeight + 1, 'the compact narration fits one line');
          assert.deepEqual(geometry.covered, [], 'the compact cue avoids protected content');
        }
      }
      if (geometry.occluded === 'true') assert.equal(geometry.visibility, 'hidden', 'the cue yields to important content');
    }
    const screenshot = join(tmpdir(), `xiaoqi-resilient-map-${viewport.width}.png`);
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    const pageVisibility = await page.evaluate(() => {
      const dock = document.querySelector('[data-museum-assistant]').shadowRoot.querySelector('.guide-dock');
      let hidden = false;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      try {
        hidden = true; document.dispatchEvent(new Event('visibilitychange'));
        const hiddenImmediately = dock.hidden;
        hidden = false; document.dispatchEvent(new Event('visibilitychange'));
        return { hiddenImmediately, restoredImmediately: !dock.hidden };
      } finally { delete document.hidden; }
    });
    assert.deepEqual(pageVisibility, { hiddenImmediately: true, restoredImmediately: true },
      'the dock also follows page visibility synchronously');
    await page.getByRole('button', { name: '打开小齐文化向导' }).click();
    let panel = page.getByRole('dialog', { name: '小齐' });
    await panel.waitFor();
    assert.equal(await panel.getByRole('button', { name: '山东地图有哪些文化线索？' }).isVisible(), true);
    assert.equal(await panel.getByText('场景资料待核实').isVisible(), true);
    await panel.getByRole('button', { name: '语音 · 关' }).click();
    assert.equal(await panel.getByRole('button', { name: '自动讲解 · 开' }).getAttribute('aria-pressed'), 'true');
    await panel.getByRole('button', { name: '自动讲解 · 开' }).click();
    assert.equal(await panel.getByRole('button', { name: '语音 · 开' }).getAttribute('aria-pressed'), 'true', 'voice is independent');
    await panel.getByRole('button', { name: '自动讲解 · 关' }).click();
    await panel.getByRole('button', { name: '关闭小齐对话' }).click();
    assert.deepEqual(await page.evaluate(() => window.__guideVisibilityChecks.slice(-2)), [
      { open: true, dockHidden: true }, { open: false, dockHidden: false }
    ], 'the dock hides and returns synchronously with the panel');
    const cityRequest = page.waitForRequest(request => request.url().endsWith('/api/museum-assistant/chat') && request.postDataJSON()?.sceneId === 'city-370300', { timeout: 15000 });
    await page.evaluate(() => { location.hash = '/city/370300'; });
    await cityRequest;
    await page.getByRole('button', { name: '打开小齐文化向导' }).click();
    panel = page.getByRole('dialog', { name: '小齐' });
    await panel.waitFor();
    await page.waitForTimeout(2000);
    assert.equal(await panel.getByText('不应出现的旧讲解').count(), 0, 'opening chat cancels the old in-flight narration');
    assert.equal(await page.locator('.guide-dock').getAttribute('data-state'), 'paused');
    await panel.getByRole('button', { name: '关闭小齐对话' }).click();
    const before = requests.length;
    await page.waitForTimeout(2600);
    assert.equal(requests.length, before, 'a cancelled request is not silently repeated');
    await page.getByRole('button', { name: '继续讲解 · 淄博' }).click();
    await page.locator('.guide-reading-text').filter({ hasText: '模拟讲解 city-370300' }).waitFor({ state: 'attached', timeout: 15000 });
    assert.equal(requests.length, before + 1);
    const cityGeometry = await readGeometry();
    let cityScreenshot;
    if (viewport.width <= 700 && cityGeometry.layout === 'summary') {
      assert.equal(cityGeometry.clipPath, 'none', 'city narration is readable without opening chat');
      assert.ok(cityGeometry.textHeight <= cityGeometry.lineHeight * 2 + 1);
      assert.deepEqual(cityGeometry.covered, [], 'city summary avoids protected content');
      cityScreenshot = join(tmpdir(), `xiaoqi-summary-city-${viewport.width}.png`);
      await page.screenshot({ path: cityScreenshot, animations: 'disabled' });
      await page.getByRole('button', { name: '小齐讲解 · 淄博' }).click();
      await page.getByRole('dialog', { name: '小齐' }).getByText('山东的手艺与生活在器物中相遇', { exact: false }).waitFor();
      await page.getByRole('button', { name: '关闭小齐对话' }).click();
      assert.equal(await page.getByRole('button', { name: '小齐讲解 · 淄博' }).evaluate(element => element.getRootNode().activeElement === element), true,
        'closing chat restores focus to the summary that opened it');
    }
    assert.deepEqual(errors, []);
    return { viewport, screenshot, cityScreenshot, geometry, cityGeometry, status: 'passed (all API calls mocked)' };
  } finally { await context.close(); }
}

async function checkContexts() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requests = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname !== '/api/museum-assistant/chat') return route.continue();
    const body = request.postDataJSON(); requests.push(body);
    const id = body.sceneId || body.exhibitId;
    const data = { answer: `模拟回答 ${id}；模型文字里的 https://not-a-source.example/ 不是资料链接。`,
      sources: [{ label: '齐鲁晚报', url: 'https://www.qlwb.com.cn/detail/25200144.html' }] };
    if (body.sceneId) data.scene = { id, evidence: 'draft' };
    else data.exhibit = { id, evidence: 'unverified' };
    return route.fulfill({ json: data });
  });
  try {
    // The index preload can remain pending or fail on a static-only preview;
    // UI interaction should depend on DOM readiness, not global network idleness.
    await page.goto(origin + '/museum-assistant/', { waitUntil: 'domcontentloaded' });
    const panel = page.getByRole('dialog', { name: '小齐' });
    await panel.waitFor();
    const cases = [
      ['map', '山东文化地图', '山东地图有哪些文化线索？'],
      ['city-370300', '淄博', '介绍一下这座城市'],
      ['person-370300-example', '淄博 · 人物', '介绍一下这位人物'],
      ['object-370300-example', '淄博 · 文化', '介绍一下这项文化'],
      ['citymedia-370300-example', '淄博 · 画面', '这幅画面有哪些细节？'],
      ['topic-370300-example', '淄博 · 主题', '这一主题讲了什么？'],
      ['museum-cover', '齐鲁文化博物馆', '展馆有哪些文化主题？']
    ];
    for (const [id, title, prompt] of cases) {
      await page.evaluate(value => document.querySelector('[data-museum-assistant]').museumAssistant.setContext(value), { kind: 'scene', id, title });
      await panel.getByRole('button', { name: prompt, exact: true }).click();
      await panel.getByText(`模拟回答 ${id}`, { exact: false }).waitFor();
      assert.equal(requests.at(-1).sceneId, id);
      assert.equal(Object.hasOwn(requests.at(-1), 'mode'), false, 'a suggested question is a manual request');
      assert.equal(await panel.getByText('场景资料待核实').isVisible(), true);
      assert.equal(await panel.getByText('相关资料', { exact: true }).count(), 1);
      assert.match(await panel.getByRole('link', { name: /齐鲁晚报/ }).getAttribute('href'), /^https:\/\/www\.qlwb\.com\.cn\//);
      assert.equal(await panel.locator('.message-text a, .message-text img').count(), 0, 'model text never becomes an HTML link or image');
      assert.equal(await panel.getByRole('button', { name: prompt, exact: true }).isVisible(), true, 'suggestions remain available after an answer');
      await panel.getByRole('button', { name: '清空' }).click();
    }
    const exhibit = { id: 'sdu-egg', title: '蛋壳陶高柄杯' };
    await page.evaluate(value => document.querySelector('[data-museum-assistant]').museumAssistant.setContext(value), exhibit);
    await page.evaluate(value => document.querySelector('[data-museum-assistant]').museumAssistant.seedGuide(value, '模拟展品讲解', [], 'unverified'), exhibit);
    assert.equal(await panel.getByText('展签资料待核实').isVisible(), true, 'automatic exhibit narration keeps its evidence status');
    assert.equal(await panel.getByRole('button', { name: '介绍一下这件作品' }).isVisible(), true);
    return { cases: cases.length + 1, status: 'passed (all API calls mocked)' };
  } finally { await context.close(); }
}

try {
  // Chrome may mark background pages hidden; automatic narration intentionally pauses there.
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 640 }, { width: 320, height: 568 }]) {
    results.push(await checkGuide(viewport));
  }
  assert.ok(results.some(result => result.viewport.width <= 700 && (result.geometry.layout === 'summary' || result.cityGeometry.layout === 'summary')),
    'at least one mobile view displays the narration summary');
  results.push(await checkContexts());
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }

import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const { chromium } = playwright;
const origin = process.env.MUSEUM_TEST_ORIGIN || 'http://127.0.0.1:4200';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const reports = [];

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 360, height: 640 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await context.newPage();
    const failures = [];
    const external = [];
    const requests = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
    page.on('response', response => {
      if (response.status() >= 400 && !response.url().endsWith('/api/museum-assistant/chat')) failures.push(response.status() + ' ' + response.url());
    });
    await page.route('**/api/museum-assistant/chat', async route => {
      const data = route.request().postDataJSON();
      requests.push(data);
      const question = data.messages.at(-1).content;
      if (question === '模拟错误') {
        await route.fulfill({ status: 429, json: { error: '模型暂时繁忙或额度不足，请稍后再试。' } });
      } else if (question === '等待中的问题') {
        await new Promise(resolve => setTimeout(resolve, 800));
        await route.fulfill({ json: { answer: '取消后不应出现', sources: [] } }).catch(() => {});
      } else {
        await route.fulfill({ json: {
          answer: question === '安全测试' ? '<img src=x onerror=alert(1)> 安全文本' : '这是模拟的模型回答。\n\n这是一段用于检查长内容阅读效果的文字。'.repeat(4),
          sources: [{ label: '德州黑陶 · 非遗网', url: 'https://www.ihchina.cn/project_details/14466.html' }]
        } });
      }
    });
    await page.goto(origin + '/museum-assistant/', { waitUntil: 'networkidle' });
    const panel = page.getByRole('dialog', { name: '小齐' });
    await panel.waitFor();
    const screenshot = join(tmpdir(), 'museum-assistant-model-' + viewport.width + '.png');
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });

    const geometry = await page.evaluate(() => {
      const shadow = document.querySelector('[data-museum-assistant]').shadowRoot;
      const panel = shadow.querySelector('.panel').getBoundingClientRect();
      const composer = shadow.querySelector('.composer').getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        composer: { top: composer.top, bottom: composer.bottom },
        animation: getComputedStyle(shadow.querySelector('.panel')).animationName,
        brokenImages: [...document.images, ...shadow.querySelectorAll('img')].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)
      };
    });
    assert.equal(geometry.scrollWidth <= geometry.innerWidth, true, 'page does not overflow horizontally');
    assert.equal(geometry.panel.left >= 0 && geometry.panel.right <= viewport.width && geometry.panel.top >= 0 && geometry.panel.bottom <= viewport.height, true, 'panel fits viewport');
    assert.equal(geometry.composer.bottom <= viewport.height, true, 'composer is visible');
    assert.equal(geometry.animation, 'none', 'reduced motion disables entrance animation');
    assert.deepEqual(geometry.brokenImages, [], 'all preview and assistant images load');
    assert.equal(await page.getByText('提问与所选展品会发送至阿里云，请勿输入隐私信息。AI 回答请核实。').count(), 1);
    assert.equal(await page.locator('.prompt-button').count(), 3, 'the opening state keeps three concise suggestions');
    assert.equal(await page.locator('.head-portrait').isVisible(), false, 'the avatar is not duplicated in the welcome state');
    const targets = await page.locator('.prompt-button, .send-button, .close-button').evaluateAll(elements =>
      elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    assert.equal(targets.every(target => target.width >= 44 && target.height >= 44), true, 'all primary touch targets are at least 44 pixels');

    await page.getByRole('button', { name: '从黑陶能看到什么？' }).click();
    await page.getByText('这是模拟的模型回答。').waitFor();
    const answeredScreenshot = join(tmpdir(), 'museum-assistant-paper-answer-' + viewport.width + '.png');
    await page.screenshot({ path: answeredScreenshot, fullPage: true, animations: 'disabled' });
    const background = await panel.evaluate(element => getComputedStyle(element).backgroundImage);
    assert.match(background, /xiaoqi-jinshi-paper-v1\.png/, 'the artwork remains in the reading area');
    assert.match(background, /0\.93/, 'the artwork is softened when an answer is visible');
    assert.equal(await page.locator('.head-portrait').isVisible(), true, 'the assistant remains present during a conversation');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].messages[0].content, '从黑陶能看到什么？');
    assert.equal(await page.getByText('相关资料').count(), 1);
    assert.match(await page.getByRole('link', { name: /德州黑陶/ }).getAttribute('href'), /^https:\/\/www\.ihchina\.cn\//);

    const input = page.getByRole('textbox', { name: '问问小齐' });
    await input.fill('安全测试');
    await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
    assert.equal(requests.length, 1, 'IME composition does not submit');
    await input.press('Enter');
    await page.getByText('<img src=x onerror=alert(1)> 安全文本').waitFor();
    assert.equal(requests[1].messages.length, 3, 'follow-up sends preceding successful exchange');
    assert.equal(await page.locator('.message-text img').count(), 0, 'model output is rendered as text');

    await input.fill('模拟错误');
    await input.press('Enter');
    await page.getByText('模型暂时繁忙或额度不足，请稍后再试。').waitFor();
    assert.equal(await input.inputValue(), '模拟错误', 'failed question remains available to retry');
    await page.getByRole('button', { name: '清空' }).click();
    assert.equal(await page.locator('.message').count(), 0);

    await input.fill('等待中的问题');
    await input.press('Enter');
    await page.getByText('小齐正在思考…').waitFor();
    await page.getByRole('button', { name: '清空' }).click();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('.message').count(), 0, 'clearing cancels the in-flight reply');
    await input.press('Escape');
    const launcher = page.getByRole('button', { name: /小齐.*陪你逛展/ });
    assert.equal(await launcher.isVisible(), true);
    assert.equal(await launcher.evaluate(el => el.getRootNode().activeElement === el), true, 'focus returns to launcher');
    await launcher.press('Enter');
    assert.equal(await panel.isVisible(), true);
    assert.deepEqual(external, [], 'browser only talks to the same-origin service');
    assert.deepEqual(failures, [], 'no failed page resources or JavaScript errors');
    reports.push({ viewport, screenshot, answeredScreenshot, geometry, status: 'passed (mock model)' });
    await context.close();
  }
  const museumContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const museumPage = await museumContext.newPage();
  const museumErrors = [];
  museumPage.on('pageerror', error => museumErrors.push(error.message));
  await museumPage.route('**/api/museum-assistant/chat', route => route.fulfill({ json: { answer: '展馆接入测试回答。', sources: [] } }));
  await museumPage.goto(origin + '/museum/', { waitUntil: 'networkidle' });
  const museumLauncher = museumPage.getByRole('button', { name: /小齐.*陪你逛展/ });
  await museumLauncher.click();
  await museumPage.getByRole('textbox', { name: '问问小齐' }).fill('你好');
  await museumPage.getByRole('button', { name: '发送' }).click();
  await museumPage.getByText('展馆接入测试回答。').waitFor();
  await museumPage.getByRole('textbox', { name: '问问小齐' }).press('Escape');
  assert.equal(await museumLauncher.isVisible(), true, 'the assistant returns to the museum');
  assert.deepEqual(museumErrors, [], 'museum integration has no JavaScript errors');
  reports.push({ page: '/museum/', status: 'passed (mock model)' });
  await museumContext.close();
  // Explicit opt-in only: this invokes the real, potentially billable provider.
  if (process.env.MUSEUM_REAL_MODEL_TEST === '1') {
    const liveContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const livePage = await liveContext.newPage();
    await livePage.goto(origin + '/museum/', { waitUntil: 'networkidle' });
    await livePage.getByRole('button', { name: /小齐.*陪你逛展/ }).click();
    const input = livePage.getByRole('textbox', { name: '问问小齐' });
    await input.fill('请用一句话介绍山东黑陶。');
    await input.press('Enter');
    await livePage.locator('.message-assistant .message-text').waitFor({ timeout: 60000 });
    assert.ok((await livePage.locator('.message-assistant .message-text').innerText()).trim());
    reports.push({ page: '/museum/', status: 'passed (real model, one request)' });
    await liveContext.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}

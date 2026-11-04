// Browser integration tests use a mocked response; they never call the paid model.
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
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const requests = [];
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && !response.url().endsWith('/api/museum-assistant/chat')) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.route('**/api/museum-assistant/chat', async route => {
      const body = route.request().postDataJSON();
      requests.push(body);
      if (body.messages.at(-1).content === '等待中的问题') await new Promise(resolve => setTimeout(resolve, 500));
      const data = { answer: `模拟回答：${body.exhibitId || '普通对话'}`, sources: [] };
      if (body.exhibitId) data.exhibit = { id: body.exhibitId, evidence: body.exhibitId === 'sdu-egg' ? 'checked' : 'unverified' };
      await route.fulfill({ json: data }).catch(() => {});
    });
    await page.goto(origin + '/museum/#archive', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.ask-assistant').count(), 60, 'every exhibit has an entry');
    const egg = page.getByRole('button', { name: '向小齐了解：蛋壳陶高柄杯' });
    await egg.scrollIntoViewIfNeeded();
    await egg.focus();
    await egg.press('Enter');
    const panel = page.getByRole('dialog', { name: '小齐' });
    await panel.waitFor();
    assert.equal(await panel.getByText('蛋壳陶高柄杯').count(), 1);
    assert.equal(await panel.getByRole('link', { name: '查看资料' }).getAttribute('href'), 'https://museum.sdu.edu.cn/info/1075/7023.htm');
    const screenshot = join(tmpdir(), `museum-exhibit-context-${viewport.width}.png`);
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.leave-exhibit').evaluate(el => el.getBoundingClientRect().width >= 44 && el.getBoundingClientRect().height >= 44), true);
    await page.getByRole('button', { name: '介绍一下这件作品' }).click();
    await page.getByText('模拟回答：sdu-egg').waitFor();
    assert.equal(requests.at(-1).exhibitId, 'sdu-egg');
    assert.deepEqual(Object.keys(requests.at(-1)).sort(), ['exhibitId', 'messages']);
    assert.equal(await page.getByText('馆藏资料摘记已核对').count(), 1);
    await page.getByRole('button', { name: '关闭小齐对话' }).click();
    assert.equal(await egg.evaluate(el => document.activeElement === el), true, 'closing restores focus to the exhibit action');

    const other = page.getByRole('button', { name: '向小齐了解：铜方壶' });
    await other.scrollIntoViewIfNeeded();
    await other.click();
    assert.equal(await panel.getByText('铜方壶').count(), 1);
    assert.equal(await panel.getByText('模拟回答：sdu-egg').count(), 0, 'previous exhibit conversation does not leak into another');
    const input = page.getByRole('textbox', { name: '问问小齐' });
    await input.fill('说说这件');
    await input.press('Enter');
    await page.getByText('模拟回答：sdu-fanghu').waitFor();
    assert.equal(requests.at(-1).exhibitId, 'sdu-fanghu');
    assert.equal(requests.at(-1).messages.length, 1, 'each exhibit has isolated model history');
    assert.equal(await page.getByText('展签资料待核实').count(), 1);

    await input.fill('等待中的问题');
    await input.press('Enter');
    await page.getByText('小齐正在思考…').waitFor();
    await page.getByRole('button', { name: '关闭小齐对话' }).click();
    await egg.scrollIntoViewIfNeeded();
    await egg.click();
    assert.equal(await panel.getByText('模拟回答：sdu-egg').count(), 1, 'returning restores the previous exhibit conversation');
    await page.getByRole('button', { name: '关闭小齐对话' }).click();
    await other.scrollIntoViewIfNeeded();
    await other.click();
    assert.equal(await page.getByText('已停止提问。').count(), 1, 'closing cancels and preserves the previous exhibit question');
    assert.equal(await input.inputValue(), '等待中的问题');
    await page.getByRole('button', { name: '退出当前展品，返回普通对话' }).click();
    assert.equal(await panel.getByText('铜方壶').isVisible(), false);
    await input.fill('普通问题');
    await input.press('Enter');
    await page.getByText('模拟回答：普通对话').waitFor();
    assert.equal(Object.hasOwn(requests.at(-1), 'exhibitId'), false, 'ordinary chat remains backward compatible');
    assert.deepEqual(errors, []);
    reports.push({ viewport, screenshot, status: 'passed (mock model)' });
    await context.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}

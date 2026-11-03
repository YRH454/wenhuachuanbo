// Full browser -> local Python endpoint -> stubbed provider. No external model call.
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
  'def fake_model(key, endpoint, messages, sources, exhibit=None):',
  '    if not exhibit: return "普通对话"',
  '    return exhibit["id"] + "：" + ("；".join(exhibit.get("facts", [])) or "资料待核实")',
  'app.call_model = fake_model',
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
  assert.ok(Number.isInteger(port) && port > 0);
  browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/museum/#archive`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '向小齐了解：蛋壳陶高柄杯' }).click();
  await page.getByRole('button', { name: '介绍一下这件作品' }).click();
  await page.getByText(/sdu-egg：.*龙山文化/).waitFor();
  assert.equal(await page.getByText('馆藏资料摘记已核对').count(), 1);
  assert.equal(await page.getByRole('link', { name: /山东大学博物馆 · 蛋壳陶高柄杯/ }).count(), 1);
  await page.getByRole('button', { name: '关闭小齐对话' }).click();
  await page.getByRole('button', { name: '向小齐了解：铜方壶' }).click();
  await page.getByRole('button', { name: '介绍一下这件作品' }).click();
  await page.getByText('sdu-fanghu：资料待核实').waitFor();
  assert.equal(await page.getByText('展签资料待核实').count(), 1);
  assert.equal(await page.getByText(/sdu-egg：/).count(), 0);
  assert.deepEqual(errors, []);
  console.log('Browser + local server + stubbed provider: passed.');
} finally {
  if (browser) await browser.close();
  service.kill();
}

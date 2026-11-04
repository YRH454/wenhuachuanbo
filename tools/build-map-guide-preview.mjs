// Render the *actual* map component, not the decorative mountain background.
// These small, derived copies are used only as model inputs; map assets are untouched.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(join(root, 'dist/assembly-manifest.json'), 'utf8'));
const backgrounds = JSON.parse(await readFile(join(root, 'dist/city-backgrounds.json'), 'utf8'));
const optimized = JSON.parse(await readFile(join(root, 'dist/optimized-assets.json'), 'utf8')).entries;
if (manifest.templateVersion !== 'map-base-v1' || manifest.cities?.length !== 16) throw new Error('Unexpected map manifest');
const python = [
  'from functools import partial',
  'from http.server import ThreadingHTTPServer',
  'from pathlib import Path',
  'from server import PreviewHandler',
  'server=ThreadingHTTPServer(("127.0.0.1",0),partial(PreviewHandler,directory=str(Path("dist").resolve())))',
  'print(server.server_port,flush=True)',
  'server.serve_forever()',
].join('\n');
const service = spawn('python', ['-u', '-c', python], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  const port = await new Promise((resolvePort, reject) => {
    const timeout = setTimeout(() => reject(new Error('Map preview server did not start')), 10000);
    service.stdout.once('data', data => { clearTimeout(timeout); resolvePort(Number(String(data).trim())); });
    service.once('error', error => { clearTimeout(timeout); reject(error); });
    service.once('exit', code => { clearTimeout(timeout); reject(new Error(`Map preview server exited: ${code}`)); });
  });
  if (!Number.isInteger(port) || !port) throw new Error('Invalid map preview port');
  browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
  for (const variant of ['A', 'B']) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('yiwu-xiaoqi-auto-v1', 'off'));
    await page.goto(`http://127.0.0.1:${port}/?variant=${variant}#/map`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('#city-art image')];
      return document.querySelector('#map')?.getAttribute('aria-busy') === 'false'
        && images.length === 16 && images.every(image => image.dataset.state === 'loaded');
    }, { timeout: 45000 });
    await page.evaluate(() => {
      const map = document.querySelector('#map');
      document.body.replaceChildren(map);
      Object.assign(document.body.style, { margin: '0', background: '#f7f2e7' });
      Object.assign(map.style, { display: 'block', width: '1200px', height: '880px', minHeight: '0', maxHeight: 'none' });
    });
    await page.locator('#map').screenshot({ path: join(root, `dist/backgrounds/guide-map-${variant.toLowerCase()}.jpg`), type: 'jpeg', quality: 85, animations: 'disabled' });
    console.log(`Rendered ${variant} from all 16 loaded city tiles`);
    await page.close();
  }
  const mapSources = [backgrounds.home.src,
    ...manifest.cities.flatMap(city => ['A', 'B'].map(variant => city.variants[variant].src))];
  const inputPaths = new Set(['assembly-manifest.json', 'app.mjs', 'index.html', 'styles.css',
    'city-backgrounds.json', 'backgrounds.mjs', 'optimized-assets.mjs', 'optimized-home.css', ...mapSources,
    ...mapSources.map(path => optimized[path]?.src).filter(Boolean)]);
  // Text checkouts can use CRLF on Windows and LF elsewhere; hash the same
  // normalized bytes Git stores, while leaving raster inputs byte-for-byte.
  const digest = async path => {
    const bytes = await readFile(join(root, 'dist', path));
    const content = /\.(?:mjs|json|css|html)$/i.test(path) ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
    return createHash('sha256').update(content).digest('hex');
  };
  const inputs = Object.fromEntries(await Promise.all([...inputPaths].sort().map(async path => [path, await digest(path)])));
  const outputs = Object.fromEntries(await Promise.all(['a', 'b'].map(async variant => {
    const path = `backgrounds/guide-map-${variant}.jpg`;
    return [path, await digest(path)];
  })));
  await writeFile(join(root, 'dist/backgrounds/guide-map-previews.json'), JSON.stringify({ version: 1, inputs, outputs }, null, 2) + '\n');
} finally {
  if (browser) await browser.close();
  service.kill();
}

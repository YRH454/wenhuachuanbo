import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { optimizedAsset } from './dist/optimized-assets.mjs';

test('display copies are content-addressed, traceable, and much smaller for the first map screen', async () => {
  const read = path => readFile(new URL(`./dist/${path}`, import.meta.url));
  const data = JSON.parse(await read('optimized-assets.json'));
  const map = JSON.parse(await read('assembly-manifest.json'));
  const backgrounds = JSON.parse(await read('city-backgrounds.json'));
  assert.equal(data.version, 1);
  for (const [source, record] of Object.entries(data.entries)) {
    assert.equal(optimizedAsset(source), record.src);
    assert.match(record.src, /\/optimized\/[a-z0-9_-]+-[a-f0-9]{12}\.webp$/i);
    const [original, display] = await Promise.all([read(source), read(record.src)]);
    assert.equal(createHash('sha256').update(original).digest('hex'), record.sourceSha256, source);
    assert.equal(createHash('sha256').update(display).digest('hex'), record.sha256, record.src);
    assert.ok(record.src.endsWith(record.sha256.slice(0, 12) + '.webp'));
  }
  assert.equal(optimizedAsset('not-registered.png'), 'not-registered.png');
  for (const variant of ['A', 'B']) {
    const records = map.cities.map(city => data.entries[city.variants[variant].src]);
    const full = records.reduce((sum, item) => sum + item.sourceBytes, 0);
    const display = records.reduce((sum, item) => sum + item.bytes, 0);
    assert.ok(display < full * 0.1, `${variant} tiles should save at least 90% of bytes`);
    assert.ok(display < 4 * 1024 * 1024, `${variant} tiles should be under 4 MiB`);
  }
  const home = data.entries[backgrounds.home.src];
  assert.ok(home.bytes < home.sourceBytes * 0.15);
  assert.match((await read('optimized-home.css')).toString(), new RegExp(home.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

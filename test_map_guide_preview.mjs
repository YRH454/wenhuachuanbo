import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('AI map previews are synchronized with both variants of the actual sixteen-city map', async () => {
  const read = path => readFile(new URL(`./dist/${path}`, import.meta.url));
  const manifest = JSON.parse(await read('assembly-manifest.json'));
  const record = JSON.parse(await read('backgrounds/guide-map-previews.json'));
  const inputPaths = Object.keys(record.inputs);
  assert.equal(manifest.cities.length, 16);
  for (const city of manifest.cities) for (const variant of ['A', 'B']) {
    assert.ok(inputPaths.includes(city.variants[variant].src), `${city.cityId} ${variant}`);
  }
  assert.deepEqual(Object.keys(record.outputs).sort(), ['backgrounds/guide-map-a.jpg', 'backgrounds/guide-map-b.jpg']);
  for (const [path, expected] of Object.entries({ ...record.inputs, ...record.outputs })) {
    const bytes = await read(path);
    const content = /\.(?:mjs|json|css|html)$/i.test(path) ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
    const actual = createHash('sha256').update(content).digest('hex');
    assert.equal(actual, expected, `${path} changed: rebuild the map previews`);
  }
  assert.notEqual(record.outputs['backgrounds/guide-map-a.jpg'], record.outputs['backgrounds/guide-map-b.jpg']);
});

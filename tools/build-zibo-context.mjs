// Keep the server's Zibo scene facts in sync with the site's actual article.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ZIBO_GUIDE } from '../dist/zibo-guide.mjs';

const destination = fileURLToPath(new URL('../dist/museum-assistant/zibo-scene-context.json', import.meta.url));
const data = {
  version: 1,
  cityId: ZIBO_GUIDE.cityId,
  sources: ZIBO_GUIDE.sources,
  passages: ZIBO_GUIDE.passages.map(({ id, title, paragraphs, sources }) => ({ id, title, paragraphs, sources })),
};
const expected = JSON.stringify(data, null, 2) + '\n';
if (process.argv.includes('--check')) {
  let actual = '';
  try { actual = readFileSync(destination, 'utf8'); } catch { /* Report a stale or missing index below. */ }
  if (actual !== expected) {
    console.error('Zibo scene index is missing or stale; run node tools/build-zibo-context.mjs.');
    process.exitCode = 1;
  } else {
    console.log('Zibo scene index matches the article.');
  }
} else {
  writeFileSync(destination, expected, 'utf8');
  console.log('Zibo scene index updated.');
}

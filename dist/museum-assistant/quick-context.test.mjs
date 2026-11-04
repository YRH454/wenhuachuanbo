import test from 'node:test';
import assert from 'node:assert/strict';
import { preloadQuickContexts, quickContextFor } from './quick-context.mjs';

test('quick contexts deduplicate preload and can recover from a temporary failure', async () => {
  let count = 0;
  const win = { fetch: async () => {
    count++;
    if (count === 1) return { ok: false };
    return { ok: true, json: async () => ({ version: 1, contexts: {
      'scene:map': { text: '济南泉水', evidence: 'draft', sources: [] },
      'scene:city-370300': { text: '淄博琉璃', evidence: 'draft', sources: [] },
    } }) };
  } };
  assert.deepEqual(await Promise.all([preloadQuickContexts(win), preloadQuickContexts(win)]), [null, null]);
  assert.equal(count, 1);
  const [map, city] = await Promise.all([
    quickContextFor(win, { kind: 'scene', id: 'map' }),
    quickContextFor(win, { kind: 'scene', id: 'city-370300' }),
  ]);
  assert.equal(count, 2);
  assert.equal(map.text, '济南泉水');
  assert.equal(city.text, '淄博琉璃');
  assert.equal(await quickContextFor(win, { kind: 'scene', id: 'city-999999' }), null);
});

test('a stalled index request is bounded and a later request may retry', async () => {
  let attempts = 0;
  const win = { AbortController, clearTimeout, setTimeout: callback => setTimeout(callback, 1),
    fetch: (_url, { signal }) => {
      attempts++;
      if (attempts > 1) return Promise.resolve({ ok: true, json: async () => ({ version: 1, contexts: {} }) });
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    } };
  assert.equal(await preloadQuickContexts(win), null);
  assert.deepEqual(await preloadQuickContexts(win), {});
  assert.equal(attempts, 2);
});

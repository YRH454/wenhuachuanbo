// Public project notes only: no questions, credentials or conversation history.
const requests = new WeakMap();

export function preloadQuickContexts(win) {
  if (!win || typeof win.fetch !== 'function') return Promise.resolve(null);
  if (!requests.has(win)) {
    const controller = typeof win.AbortController === 'function' ? new win.AbortController() : null;
    const timeout = controller && typeof win.setTimeout === 'function'
      ? win.setTimeout(() => controller.abort(), 5000) : null;
    const pending = Promise.resolve().then(() => win.fetch('/api/museum-assistant/context-index', controller ? { signal: controller.signal } : {}))
      .then(response => response.ok ? response.json() : null)
      .then(data => data?.version === 1 && data.contexts && typeof data.contexts === 'object' ? data.contexts : null)
      .catch(() => null)
      .finally(() => { if (timeout !== null) win.clearTimeout(timeout); });
    requests.set(win, pending);
    // A temporary offline/HTTP error must not poison the whole tab forever.
    void pending.then(index => { if (!index && requests.get(win) === pending) requests.delete(win); });
  }
  return requests.get(win);
}

export async function quickContextFor(win, context) {
  if (!context || typeof context.id !== 'string') return null;
  const kind = context.kind === 'scene' ? 'scene' : 'exhibit';
  const index = await preloadQuickContexts(win);
  const item = index?.[kind + ':' + context.id];
  if (!item || typeof item.text !== 'string' || !item.text.trim()
      || !['checked', 'draft'].includes(item.evidence)) return null;
  return { text: item.text.trim().slice(0, 300), evidence: item.evidence,
    sources: Array.isArray(item.sources) ? item.sources : [] };
}

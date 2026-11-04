import { CITIES } from '../people-culture-v1/model.mjs';
import { quickContextFor } from './quick-context.mjs';

const AUTO_KEY = 'yiwu-xiaoqi-auto-v1';
const VOICE_KEY = 'yiwu-xiaoqi-voice-v1';
const CACHE_KEY = 'yiwu-xiaoqi-guide-cache-v1';
const DWELL_MS = 2200;
const CACHE_MS = 30 * 60 * 1000;
const QUESTION = '请像文化向导一样，用两三句简短介绍当前画面和有依据的文化线索；资料不足不要猜。';

const storageGet = (storage, key) => { try { return storage.getItem(key); } catch { return null; } };
const storageSet = (storage, key, value) => { try { storage.setItem(key, value); } catch { /* Browsing still works without storage. */ } };
const contextKey = value => value ? `${value.kind}:${value.id}` : '';

/** Select only a visible, explicitly tagged part of this website, never the desktop. */
export function currentPageContext(doc) {
  const win = doc.defaultView;
  if (!win || doc.hidden) return null;
  const path = win.location.pathname;
  const inMuseum = /\/museum\/(?:index\.html)?$/.test(path);
  const inPeople = /\/people-culture-v1\/(?:index\.html)?$/.test(path);
  const inHome = /\/(?:index\.html)?$/.test(path) && !inMuseum && !inPeople;
  if (!inMuseum && !inPeople && !inHome) return null;
  if (inHome && ['entering', 'leaving'].includes(doc.body.dataset.transition)) return null;
  const candidates = [...doc.querySelectorAll('[data-guide-id]')].flatMap(node => {
    if (node.dataset.state === 'error') return [];
    const rect = node.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, win.innerHeight) - Math.max(rect.top, 0));
    const visibleWidth = Math.max(0, Math.min(rect.right, win.innerWidth) - Math.max(rect.left, 0));
    if (!rect.width || !rect.height || visibleHeight < Math.min(110, rect.height * .3) || visibleWidth < Math.min(60, rect.width * .3)) return [];
    const center = Math.abs((Math.max(rect.top, 0) + Math.min(rect.bottom, win.innerHeight)) / 2 - win.innerHeight / 2);
    const focused = doc.activeElement === node || node.contains(doc.activeElement);
    const imageLead = node.dataset.guideKind === 'exhibit' || /^(citymedia|object)-/.test(node.dataset.guideId) ? .1 : 0;
    return [{ node, score: visibleHeight / Math.min(rect.height, win.innerHeight) - center / win.innerHeight * .4 + (focused ? 2 : 0) + imageLead }];
  }).sort((a, b) => b.score - a.score);
  if (candidates.length) {
    const node = candidates[0].node;
    return { kind: node.dataset.guideKind === 'exhibit' ? 'exhibit' : 'scene', id: node.dataset.guideId, title: node.dataset.guideTitle || '当前画面', source: node.dataset.guideSource || '' };
  }
  if (inMuseum) return { kind: 'scene', id: 'museum-cover', title: '齐鲁文化博物馆' };
  const cityId = inPeople ? doc.body.dataset.city : /^#\/city\/(\d{6})$/.exec(win.location.hash)?.[1];
  if (cityId && Object.hasOwn(CITIES, cityId)) return { kind: 'scene', id: 'city-' + cityId, title: CITIES[cityId] };
  const mapId = new URLSearchParams(win.location.search).get('variant') === 'B' ? 'map-b' : 'map';
  return inHome ? { kind: 'scene', id: mapId, title: '山东文化地图' } : null;
}

/** One unobtrusive guide for the site's map, city pages and museum. */
export function mountUniversalGuide({ assistant, doc = document } = {}) {
  if (!assistant?.host?.shadowRoot || !doc?.defaultView) throw new TypeError('Assistant and document are required.');
  const win = doc.defaultView, shadow = assistant.host.shadowRoot;
  const existing = shadow.querySelector('.guide-dock');
  if (existing?.guideController) return existing.guideController;
  const dock = doc.createElement('aside');
  dock.className = 'guide-dock';
  dock.setAttribute('aria-label', '小齐自动讲解');
  dock.innerHTML = '<div class="guide-reading" hidden><button class="guide-reading-open" type="button" aria-describedby="guide-reading-description"><span class="guide-reading-label"></span><span class="guide-reading-title"></span><span class="guide-reading-hint" aria-hidden="true">查看全文</span><span class="guide-reading-text" id="guide-reading-description"></span></button></div>'
    + '<div class="guide-controls"><button class="guide-toggle" type="button"></button><button class="guide-voice" type="button"></button></div>';
  shadow.querySelector('.assistant-shell').append(dock);
  const reading = dock.querySelector('.guide-reading'), openReading = dock.querySelector('.guide-reading-open');
  const label = dock.querySelector('.guide-reading-label'), title = dock.querySelector('.guide-reading-title'), copy = dock.querySelector('.guide-reading-text');
  const toggle = dock.querySelector('.guide-toggle'), voice = dock.querySelector('.guide-voice');
  const panelControls = doc.createElement('div');
  panelControls.className = 'guide-panel-controls';
  const panelToggle = doc.createElement('button');
  panelToggle.type = 'button'; panelToggle.className = 'guide-panel-toggle';
  const panelVoice = doc.createElement('button');
  panelVoice.type = 'button'; panelVoice.className = 'guide-panel-voice';
  panelControls.append(panelToggle, panelVoice);
  shadow.querySelector('.panel-head').after(panelControls);
  const supportedVoice = Boolean(win.speechSynthesis && win.SpeechSynthesisUtterance);
  let local, session;
  try { local = win.localStorage; session = win.sessionStorage; } catch { /* Storage may be unavailable. */ }
  let enabled = storageGet(local, AUTO_KEY) !== 'off';
  let voiceEnabled = supportedVoice && storageGet(session, VOICE_KEY) === 'on';
  let current = null, request = null, timer = null, refreshTimer = null, disposed = false;
  let shownText = '', guideState = 'idle', lastAttempt = '', lastDelivered = '', voiceAwaitingClose = false;
  let quickPreview = null, previewAttempt = '', guideProblem = '';
  const actor = doc.getElementById('xiaoqi-actor');
  function placeDock() {
    if (dock.hidden) return;
    const actorRect = actor?.getBoundingClientRect();
    const anchor = actorRect?.width && actorRect?.height ? actor : (doc.getElementById('xiaoqi-restore') || shadow.querySelector('.launcher'));
    const rect = anchor?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    const gap = 12;
    let left, top, width, height;
    if (win.innerWidth > 700) {
      delete dock.dataset.mobileLayout;
      width = dock.offsetWidth; height = dock.offsetHeight;
      if (!width || !height) return;
      left = rect.right - width;
      top = rect.top - height - gap;
      if (top < 8) top = rect.bottom + gap;
      delete dock.dataset.occluded;
    } else {
      // Try a readable summary first; fall back to the smaller cue when space is tight.
      const protectedNodes = '.topbar,.museum-entry,#city-links .city-hit,.map-figure figcaption,.art-shelf,.artwork-image,.artwork-meta,.cg-scene-open,.zibo-scene-open,.cg-scene-back,.zibo-scene-back,.object-panel,[role="tabpanel"]';
      const obstacles = [...doc.querySelectorAll(protectedNodes), anchor].map(node => node.getBoundingClientRect())
        .filter(r => r.width && r.height && r.bottom > 0 && r.top < win.innerHeight && r.right > 0 && r.left < win.innerWidth);
      const clamp = (value, low, high) => Math.max(low, Math.min(value, Math.max(low, high)));
      function bestPosition(width, height) {
        const xs = [8, win.innerWidth - width - 8, rect.right - width, rect.left];
        const ys = [rect.top - height - gap, rect.bottom + gap, 8, win.innerHeight - height - 8,
          ...obstacles.flatMap(r => [r.top - height - 8, r.bottom + 8])];
        let best = null;
        for (const x of xs) for (const y of ys) {
          const candidate = { left: clamp(x, 8, win.innerWidth - width - 8), top: clamp(y, 8, win.innerHeight - height - 8) };
          const area = obstacles.reduce((sum, r) => sum
            + Math.max(0, Math.min(candidate.left + width, r.right) - Math.max(candidate.left, r.left))
              * Math.max(0, Math.min(candidate.top + height, r.bottom) - Math.max(candidate.top, r.top)), 0);
          const score = area * 1000 + Math.abs(candidate.left - rect.left) + Math.abs(candidate.top - rect.top);
          if (!best || score < best.score) best = { ...candidate, area, score };
        }
        return best;
      }
      let best = null;
      if (guideState === 'ready' && shownText && !reading.hidden) {
        dock.dataset.mobileLayout = 'summary';
        width = dock.offsetWidth; height = dock.offsetHeight;
        if (width && height) best = bestPosition(width, height);
      }
      if (!best || best.area > 0) {
        dock.dataset.mobileLayout = 'compact';
        width = dock.offsetWidth; height = dock.offsetHeight;
        if (!width || !height) return;
        best = bestPosition(width, height);
      }
      left = best.left; top = best.top;
      dock.dataset.occluded = String(best.area > 0);
    }
    dock.style.left = Math.max(8, Math.min(left, win.innerWidth - width - 8)) + 'px';
    dock.style.top = Math.max(8, Math.min(top, win.innerHeight - height - 8)) + 'px';
    dock.style.right = 'auto'; dock.style.bottom = 'auto';
  }
  const cache = new Map();
  try {
    const stored = JSON.parse(storageGet(session, CACHE_KEY) || '[]');
    if (Array.isArray(stored)) for (const entry of stored.slice(-100)) {
      if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1]?.answer === 'string'
          && Date.now() - entry[1].time < CACHE_MS) cache.set(entry[0], entry[1]);
    }
  } catch { /* A corrupt cache is ignored. */ }
  const saveCache = () => storageSet(session, CACHE_KEY, JSON.stringify([...cache].slice(-100)));
  const stopVoice = () => { if (supportedVoice) win.speechSynthesis.cancel(); };
  function speak(text) {
    if (!voiceEnabled || !enabled || !supportedVoice || assistant.isOpen() || doc.hidden || !text) return;
    stopVoice();
    const utterance = new win.SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; utterance.rate = .95;
    const chinese = win.speechSynthesis.getVoices().find(item => /^zh(?:-|_)/i.test(item.lang));
    if (chinese) utterance.voice = chinese;
    win.speechSynthesis.speak(utterance);
  }
  function controls() {
    toggle.textContent = '自动讲解 · ' + (enabled ? '开' : '关');
    toggle.setAttribute('aria-pressed', String(enabled));
    panelToggle.textContent = '自动 · ' + (enabled ? '开' : '关');
    panelToggle.setAttribute('aria-label', '自动讲解 · ' + (enabled ? '开' : '关'));
    panelToggle.setAttribute('aria-pressed', String(enabled));
    voice.textContent = supportedVoice ? '语音 · ' + (voiceEnabled ? '开' : '关') : '语音不可用';
    voice.setAttribute('aria-pressed', String(voiceEnabled));
    voice.disabled = !supportedVoice;
    panelVoice.textContent = voice.textContent;
    panelVoice.setAttribute('aria-pressed', String(voiceEnabled));
    panelVoice.disabled = !supportedVoice;
    dock.hidden = assistant.isOpen() || doc.hidden;
    placeDock();
  }
  function show(text, context = current, state = 'ready') {
    shownText = text || '';
    guideState = state;
    dock.dataset.state = state;
    label.textContent = state === 'loading' ? '正在讲解' : state === 'error' ? '重试讲解'
      : state === 'paused' ? '继续讲解' : state === 'preview'
        ? (quickPreview?.evidence === 'checked' ? '馆藏资料摘记' : '资料线索 · 待核') : '小齐讲解';
    title.textContent = context?.title || '小齐';
    copy.textContent = shownText;
    openReading.setAttribute('aria-label', label.textContent + ' · ' + title.textContent);
    reading.hidden = !enabled || !shownText;
    placeDock();
  }
  function cancel() {
    win.clearTimeout(timer); timer = null;
    if (request) request.abort();
    request = null;
    stopVoice();
  }
  function previewContext(context) {
    const key = contextKey(context);
    if (!key || previewAttempt === key) return;
    previewAttempt = key;
    void quickContextFor(win, context).then(note => {
      if (!note || disposed || !enabled || assistant.isOpen() || doc.hidden || key !== contextKey(current)
          || (guideState === 'ready' && shownText) || guideState === 'paused') return;
      quickPreview = note;
      if (guideState === 'error') show(guideProblem + ' 先参考资料：' + note.text, context, 'error');
      else show(note.text, context, 'preview');
    });
  }
  async function narrate(context) {
    const key = contextKey(context);
    if (!enabled || assistant.isOpen() || doc.hidden || !context || key !== contextKey(current) || request) return;
    const saved = cache.get(key);
    if (saved && Date.now() - saved.time < CACHE_MS) {
      show(saved.answer, context);
      assistant.seedGuide(context, saved.answer, saved.sources, saved.evidence);
      if (lastDelivered !== key) { lastDelivered = key; speak(saved.answer); }
      return;
    }
    if (lastAttempt === key) return;
    lastAttempt = key;
    guideProblem = '';
    if (guideState !== 'preview' || !shownText) show('正在准备讲解…', context, 'loading');
    const controller = new win.AbortController(); request = controller;
    const timeout = win.setTimeout(() => controller.abort(), 50000);
    try {
      const selection = context.kind === 'exhibit' ? { exhibitId: context.id } : { sceneId: context.id };
      const response = await win.fetch('/api/museum-assistant/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: QUESTION }], ...selection, mode: 'guide' }), signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : '暂时无法讲解，请稍后重试。');
      const identity = context.kind === 'exhibit' ? data.exhibit : data.scene;
      if (identity?.id !== context.id || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('场景资料暂未确认。');
      if (request !== controller || key !== contextKey(current) || !enabled) return;
      const answer = data.answer.trim().slice(0, 2000), sources = Array.isArray(data.sources) ? data.sources : [];
      const evidence = context.kind === 'scene' ? 'draft' : (['checked', 'unverified'].includes(identity.evidence) ? identity.evidence : '');
      cache.set(key, { answer, sources, evidence, time: Date.now() }); saveCache();
      assistant.seedGuide(context, answer, sources, evidence);
      if (!assistant.isOpen() && !doc.hidden) { lastDelivered = key; show(answer, context); speak(answer); }
    } catch (error) {
      if (request !== controller || !enabled || assistant.isOpen() || key !== contextKey(current)) return;
      guideProblem = error?.name === 'AbortError' ? '讲解暂时超时，请重试。' : (error?.message || '暂时无法讲解，请重试。');
      show(quickPreview ? guideProblem + ' 先参考资料：' + quickPreview.text : guideProblem, context, 'error');
    } finally {
      win.clearTimeout(timeout);
      if (request === controller) request = null;
    }
  }
  function refresh() {
    if (disposed) return;
    controls();
    if (doc.hidden) { win.clearTimeout(timer); timer = null; stopVoice(); return; }
    if (assistant.isOpen()) { win.clearTimeout(timer); timer = null; stopVoice(); return; }
    const next = currentPageContext(doc), changed = contextKey(next) !== contextKey(current);
    if (changed) {
      cancel(); current = next; lastAttempt = ''; lastDelivered = ''; quickPreview = null; previewAttempt = ''; guideProblem = ''; show('');
    }
    if (current) assistant.setContext(current);
    if (!enabled || !current || request || timer) return;
    if (!shownText) previewContext(current);
    const captured = current;
    timer = win.setTimeout(() => { timer = null; void narrate(captured); }, DWELL_MS);
  }
  function schedule() {
    if (disposed) return;
    win.clearTimeout(timer); timer = null;
    win.clearTimeout(refreshTimer);
    refreshTimer = win.setTimeout(refresh, 100);
  }
  function toggleAuto() {
    enabled = !enabled; storageSet(local, AUTO_KEY, enabled ? 'on' : 'off');
    cancel(); lastAttempt = ''; lastDelivered = ''; quickPreview = null; previewAttempt = ''; show(''); controls(); if (enabled) refresh();
  }
  toggle.addEventListener('click', toggleAuto);
  panelToggle.addEventListener('click', toggleAuto);
  function toggleVoice() {
    voiceEnabled = !voiceEnabled; storageSet(session, VOICE_KEY, voiceEnabled ? 'on' : 'off');
    voiceAwaitingClose = Boolean(voiceEnabled && assistant.isOpen() && shownText && !request && guideState === 'ready');
    controls(); if (voiceEnabled && shownText && !request && guideState === 'ready') speak(shownText); else stopVoice();
  }
  voice.addEventListener('click', toggleVoice);
  panelVoice.addEventListener('click', toggleVoice);
  openReading.addEventListener('click', () => {
    if ((guideState === 'error' || guideState === 'paused') && current) {
      cancel(); lastAttempt = ''; void narrate(current); return;
    }
    if (current) assistant.setContext(current);
    assistant.open(openReading);
  });
  const onVisibility = () => {
    if ((assistant.isOpen() || doc.hidden) && request) {
      cancel(); lastAttempt = contextKey(current);
      show('讲解已暂停，可继续。', current, 'paused');
    } else { win.clearTimeout(timer); timer = null; stopVoice(); }
    if (!assistant.isOpen() && !doc.hidden && voiceAwaitingClose) {
      voiceAwaitingClose = false;
      if (voiceEnabled && enabled && guideState === 'ready' && contextKey(currentPageContext(doc)) === contextKey(current)) speak(shownText);
    }
    win.clearTimeout(refreshTimer); refreshTimer = null;
    refresh();
  };
  const onStorage = event => { if (event.key === AUTO_KEY) { enabled = event.newValue !== 'off'; cancel(); quickPreview = null; previewAttempt = ''; show(''); schedule(); } };
  assistant.host.addEventListener('assistantvisibility', onVisibility);
  win.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', schedule);
  win.addEventListener('hashchange', schedule);
  win.addEventListener('popstate', schedule);
  win.addEventListener('storage', onStorage);
  doc.addEventListener('visibilitychange', onVisibility);
  doc.addEventListener('focusin', schedule);
  const observer = new win.MutationObserver(schedule);
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-view', 'data-city', 'data-transition', 'aria-expanded', 'aria-selected'] });
  const actorObserver = actor ? new win.MutationObserver(placeDock) : null;
  actorObserver?.observe(actor, { attributes: true, attributeFilter: ['style', 'hidden'] });
  const controller = { refresh, dispose() {
    if (disposed) return; disposed = true; cancel(); win.clearTimeout(refreshTimer); observer.disconnect(); actorObserver?.disconnect();
    assistant.host.removeEventListener('assistantvisibility', onVisibility);
    win.removeEventListener('scroll', schedule); win.removeEventListener('resize', schedule);
    win.removeEventListener('hashchange', schedule); win.removeEventListener('popstate', schedule);
    win.removeEventListener('storage', onStorage); doc.removeEventListener('visibilitychange', onVisibility); doc.removeEventListener('focusin', schedule);
    dock.remove(); panelControls.remove();
  } };
  dock.guideController = controller;
  controls(); schedule();
  return controller;
}

// The browser talks only to the same-origin service; credentials stay on the server.
export const SUGGESTED_QUESTIONS = Object.freeze([
  '画像石里藏着什么？',
  '一块砖也能讲故事吗？',
  '从黑陶能看到什么？'
]);
export const EXHIBIT_QUESTIONS = Object.freeze([
  '介绍一下这件作品',
  '有哪些细节值得看？',
  '它的资料来源是什么？'
]);

const AVATAR_URL = new URL('../assets/xiaoqi/xiaoqi-scroll-a-d9cf1a109245.png', import.meta.url).href;
const STYLE_URL = new URL('./assistant.css', import.meta.url).href;
const TRUSTED_SOURCE_HOSTS = new Set([
  'digitalarchive.npm.gov.tw', 'commons.wikimedia.org', 'www.ihchina.cn',
  'museum.sdu.edu.cn', 'www.metmuseum.org', 'www.clevelandart.org'
]);

// Related records are suggestions, not citations asserting support for every model claim.
export function safeRelatedSources(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).flatMap(source => {
    if (!source || typeof source.label !== 'string' || typeof source.url !== 'string') return [];
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !TRUSTED_SOURCE_HOSTS.has(url.hostname)) return [];
      const label = source.label.trim().slice(0, 80);
      return label ? [{ label, url: url.href }] : [];
    } catch {
      return [];
    }
  });
}

export function safeExhibit(value) {
  if (!value || typeof value.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)
      || value.id.length > 80 || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120) return null;
  let source = '';
  try {
    const url = new URL(value.source);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port) source = url.href;
  } catch { /* A source link is optional; never turn an invalid value into a link. */ }
  return { id: value.id, title: value.title.trim(), source };
}

function safeScene(value) {
  if (!value || typeof value.id !== 'string' || value.id.length > 120
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)
      || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120) return null;
  let source = '';
  try {
    const url = new URL(value.source);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port) source = url.href;
  } catch { /* The reference is optional. */ }
  return { id: value.id, title: value.title.trim(), source, kind: 'scene' };
}

/** Mount the assistant without changing the host page's styles or routes. */
export function mountMuseumAssistant({ container = document.body, openInitially = false, showLauncher = true } = {}) {
  if (!container?.ownerDocument) throw new TypeError('A page element is required as the assistant container.');
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  const existing = [...container.children].find(element => element.hasAttribute('data-museum-assistant'));
  if (existing?.museumAssistant) {
    if (openInitially) existing.museumAssistant.open();
    return existing.museumAssistant;
  }

  const host = doc.createElement('div');
  host.setAttribute('data-museum-assistant', '');
  if (!showLauncher) host.setAttribute('data-external-launcher', '');
  const shadow = host.attachShadow({ mode: 'open' });
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = STYLE_URL;
  shadow.append(stylesheet);
  const shell = doc.createElement('div');
  shell.className = 'assistant-shell';
  shell.innerHTML = [
    '<button class="launcher" type="button" aria-expanded="false" aria-controls="assistant-panel">',
    '  <span class="launcher-portrait"><img src="' + AVATAR_URL + '" alt="" aria-hidden="true"></span>',
    '  <span class="launcher-copy"><strong>小齐</strong><span>陪你逛展</span></span>',
    '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    '</button>',
    '<section class="panel" id="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title" hidden>',
    '  <header class="panel-head">',
    '    <div class="head-identity"><span class="head-portrait"><img src="' + AVATAR_URL + '" alt="" aria-hidden="true"></span><h2 id="assistant-title" tabindex="-1">小齐</h2></div>',
    '    <div class="head-actions"><details class="usage-details"><summary aria-label="查看小齐使用说明" title="使用说明"><span aria-hidden="true">?</span></summary><p>提问与相关画面会发送至模型服务，可能产生费用。请勿输入隐私信息，AI 回答请核实。</p></details><button class="clear-button" type="button" disabled>清空</button><button class="close-button" type="button" aria-label="关闭小齐对话"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>',
    '  </header>',
    '  <div class="conversation-area">',
    '    <div class="exhibit-context" hidden><div class="exhibit-context-copy"><p>正在了解 <strong></strong></p><div class="exhibit-context-meta"><a target="_blank" rel="noopener noreferrer" hidden>查看资料</a><span class="exhibit-evidence" aria-live="polite"></span></div></div><button type="button" class="leave-exhibit" aria-label="退出当前展品，返回普通对话"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>',
    '    <div class="welcome"><div class="welcome-portrait"><img src="' + AVATAR_URL + '" alt="" aria-hidden="true"></div><div><h3>你好，我是小齐。</h3><p>从一件物，慢慢认识山东。</p></div></div>',
    '    <ol class="thread" role="log" aria-label="对话内容" aria-live="polite" aria-relevant="additions" hidden></ol>',
    '    <div class="waiting" role="status" aria-live="polite" hidden><span class="waiting-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>小齐正在思考…</span></div>',
    '    <div class="prompt-section"><div class="prompt-list" role="group" aria-label="示例问题"></div></div>',
    '  </div>',
    '  <form class="composer"><label class="visually-hidden" for="assistant-input">问问小齐</label><div class="input-wrap"><textarea id="assistant-input" rows="1" maxlength="400" placeholder="问问小齐…"></textarea><button class="send-button" type="submit" disabled><span>发送</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg></button></div></form>',
    '</section>'
  ].join('');
  shadow.append(shell);
  container.append(host);

  const launcher = shadow.querySelector('.launcher');
  launcher.hidden = !showLauncher;
  const panel = shadow.querySelector('.panel');
  const heading = shadow.querySelector('#assistant-title');
  const closeButton = shadow.querySelector('.close-button');
  const clearButton = shadow.querySelector('.clear-button');
  const welcome = shadow.querySelector('.welcome');
  const thread = shadow.querySelector('.thread');
  const waiting = shadow.querySelector('.waiting');
  const area = shadow.querySelector('.conversation-area');
  const contextBox = shadow.querySelector('.exhibit-context');
  const contextTitle = contextBox.querySelector('strong');
  const contextSource = contextBox.querySelector('a');
  const contextEvidence = contextBox.querySelector('.exhibit-evidence');
  const leaveExhibit = contextBox.querySelector('.leave-exhibit');
  const promptSection = shadow.querySelector('.prompt-section');
  const promptList = shadow.querySelector('.prompt-list');
  const form = shadow.querySelector('.composer');
  const input = shadow.querySelector('#assistant-input');
  const sendButton = shadow.querySelector('.send-button');
  let activeRequest = null;
  let activeQuestion = '';
  let history = [];
  let currentExhibit = null;
  let evidenceStatus = '';
  let autoDescribeRequested = false;
  let returnFocus = launcher;
  const sessions = new Map();
  let destroyed = false;

  function refreshControls() {
    const busy = activeRequest !== null;
    sendButton.disabled = busy || !input.value.trim();
    clearButton.disabled = !busy && thread.childElementCount === 0;
    for (const button of promptList.querySelectorAll('button')) button.disabled = busy;
    thread.setAttribute('aria-busy', String(busy));
  }

  function scrollToLatest() {
    win.requestAnimationFrame(() => {
      if (!destroyed) area.scrollTop = area.scrollHeight;
    });
  }

  function addMessage(speaker, content, sources = []) {
    const item = doc.createElement('li');
    item.className = 'message message-' + speaker;
    const label = doc.createElement('p');
    label.className = 'message-label';
    label.textContent = speaker === 'user' ? '你' : speaker === 'assistant' ? '小齐' : '提示';
    const text = doc.createElement('p');
    text.className = 'message-text';
    text.textContent = content;
    item.append(label, text);
    if (sources.length) {
      const sourceArea = doc.createElement('div');
      sourceArea.className = 'message-source';
      const caption = doc.createElement('span');
      caption.textContent = '相关资料';
      sourceArea.append(caption);
      for (const source of sources) {
        const link = doc.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = source.label;
        link.setAttribute('aria-label', source.label + '，在新标签页打开');
        sourceArea.append(link);
      }
      item.append(sourceArea);
    }
    thread.append(item);
    thread.hidden = false;
  }

  function renderPrompts() {
    promptList.replaceChildren();
    for (const question of currentExhibit ? EXHIBIT_QUESTIONS : SUGGESTED_QUESTIONS) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'prompt-button';
      button.textContent = question;
      button.addEventListener('click', () => submitQuestion(question));
      promptList.append(button);
    }
  }

  function renderContext() {
    contextBox.hidden = !currentExhibit;
    if (!currentExhibit) return;
    contextTitle.textContent = currentExhibit.title;
    contextSource.hidden = !currentExhibit.source;
    if (currentExhibit.source) contextSource.href = currentExhibit.source;
    else contextSource.removeAttribute('href');
    contextEvidence.textContent = evidenceStatus === 'checked' ? '馆藏资料摘记已核对' : evidenceStatus === 'unverified' ? '展签资料待核实' : evidenceStatus === 'draft' ? '场景资料待核实' : '';
  }

  function selectExhibit(next) {
    const contextKey = value => value ? (value.kind === 'scene' ? 'scene:' : 'exhibit:') + value.id : '';
    const previousKey = contextKey(currentExhibit);
    const nextKey = contextKey(next);
    if (previousKey === nextKey) {
      currentExhibit = next;
      renderContext();
      return;
    }
    if (activeRequest) {
      activeRequest.abort();
      activeRequest = null;
      waiting.hidden = true;
      addMessage('notice', '切换展品，已取消上一次提问。');
      if (!input.value.trim()) input.value = activeQuestion;
      activeQuestion = '';
    }
    sessions.set(previousKey, { history: history.slice(), nodes: [...thread.childNodes], input: input.value, evidenceStatus, autoDescribeRequested });
    currentExhibit = next;
    const saved = sessions.get(nextKey);
    history = saved?.history.slice() || [];
    thread.replaceChildren(...(saved?.nodes || []));
    thread.hidden = !thread.childElementCount;
    welcome.hidden = !!thread.childElementCount;
    promptSection.hidden = !!thread.childElementCount;
    input.value = saved?.input || '';
    evidenceStatus = saved?.evidenceStatus || '';
    autoDescribeRequested = saved?.autoDescribeRequested || false;
    renderContext();
    renderPrompts();
    refreshControls();
    area.scrollTop = 0;
  }

  async function requestAnswer(question, request, previous, exhibit) {
    let timedOut = false;
    const timeout = win.setTimeout(() => { timedOut = true; request.abort(); }, 50000);
    try {
      const response = await win.fetch('/api/museum-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...previous, { role: 'user', content: question }], ...(exhibit ? (exhibit.kind === 'scene' ? { sceneId: exhibit.id } : { exhibitId: exhibit.id }) : {}) }),
        signal: request.signal
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('当前预览未连接模型服务，请打开模型预览地址。');
      }
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error.slice(0, 120) : '暂时无法连接模型，请稍后重试。');
      if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('小齐暂时没有收到回答，请重试。');
      if (activeRequest !== request || destroyed) return;
      const received = exhibit?.kind === 'scene' ? data?.scene : data?.exhibit;
      if (exhibit && (received?.id !== exhibit.id || !(exhibit.kind === 'scene' ? ['draft'] : ['checked', 'unverified']).includes(received.evidence))) {
        throw new Error('展品资料未能确认，请刷新页面或重启模型服务。');
      }
      if (exhibit) { evidenceStatus = received.evidence; renderContext(); }
      const answer = data.answer.trim().slice(0, 2000);
      history = [...previous, { role: 'user', content: question }, { role: 'assistant', content: answer }].slice(-6);
      addMessage('assistant', answer, safeRelatedSources(data.sources));
    } catch (error) {
      if (activeRequest !== request || destroyed) return;
      const message = timedOut ? '等待超时，请稍后重试。' : (error?.name === 'AbortError' ? '请求已取消。' : error?.message || '暂时无法连接模型，请稍后重试。');
      addMessage('notice', message);
      if (!input.value.trim()) input.value = question;
    } finally {
      win.clearTimeout(timeout);
      if (activeRequest === request && !destroyed) {
        activeRequest = null;
        activeQuestion = '';
        waiting.hidden = true;
        refreshControls();
        scrollToLatest();
      }
    }
  }

  function submitQuestion(value) {
    const question = String(value ?? '').trim().slice(0, 400);
    if (!question || activeRequest !== null || destroyed) return;
    welcome.hidden = true;
    promptSection.hidden = true;
    addMessage('user', question);
    input.value = '';
    waiting.hidden = false;
    const request = new win.AbortController();
    activeRequest = request;
    activeQuestion = question;
    const previous = history.slice(-6);
    refreshControls();
    scrollToLatest();
    void requestAnswer(question, request, previous, currentExhibit);
  }

  function open(target = launcher) {
    if (destroyed) return;
    if (target && typeof target.focus === 'function') returnFocus = target;
    panel.hidden = false;
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');
    heading.focus({ preventScroll: true });
    host.dispatchEvent(new win.CustomEvent('assistantvisibility', { detail: { open: true } }));
  }

  function close() {
    if (destroyed || panel.hidden) return;
    panel.hidden = true;
    launcher.hidden = !showLauncher;
    launcher.setAttribute('aria-expanded', 'false');
    (returnFocus?.isConnected ? returnFocus : launcher).focus({ preventScroll: true });
    host.dispatchEvent(new win.CustomEvent('assistantvisibility', { detail: { open: false } }));
  }

  function clearConversation() {
    if (activeRequest) activeRequest.abort();
    activeRequest = null;
    activeQuestion = '';
    history = [];
    autoDescribeRequested = false;
    waiting.hidden = true;
    thread.replaceChildren();
    thread.hidden = true;
    welcome.hidden = false;
    promptSection.hidden = false;
    input.value = '';
    refreshControls();
    input.focus({ preventScroll: true });
    area.scrollTop = 0;
  }

  function onSubmit(event) {
    event.preventDefault();
    submitQuestion(input.value);
  }

  function onInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      if (!sendButton.disabled) form.requestSubmit();
    }
  }

  function onEscape(event) {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      close();
    }
  }

  launcher.addEventListener('click', () => open(launcher));
  closeButton.addEventListener('click', close);
  leaveExhibit.addEventListener('click', () => { selectExhibit(null); heading.focus({ preventScroll: true }); });
  clearButton.addEventListener('click', clearConversation);
  form.addEventListener('submit', onSubmit);
  input.addEventListener('input', refreshControls);
  input.addEventListener('keydown', onInputKeydown);
  shadow.addEventListener('keydown', onEscape);

  const api = {
    open,
    close,
    isOpen() { return !panel.hidden; },
    setContext(value) {
      if (destroyed) return false;
      const context = value?.kind === 'scene' ? safeScene(value) : safeExhibit(value);
      if (!context) return false;
      selectExhibit(context);
      return true;
    },
    seedGuide(value, answer, sources = []) {
      const keyMatches = currentExhibit && value && currentExhibit.id === value.id
        && (currentExhibit.kind === 'scene') === (value.kind === 'scene');
      if (!keyMatches || activeRequest || history.length || thread.childElementCount || typeof answer !== 'string' || !answer.trim()) return false;
      const text = answer.trim().slice(0, 2000);
      history = [{ role: 'user', content: '请简短介绍当前画面。' }, { role: 'assistant', content: text }];
      evidenceStatus = currentExhibit.kind === 'scene' ? 'draft' : '';
      renderContext();
      welcome.hidden = true;
      promptSection.hidden = true;
      addMessage('assistant', text, safeRelatedSources(sources));
      refreshControls();
      return true;
    },
    openForExhibit(value, trigger, { describe = false } = {}) {
      const exhibit = safeExhibit(value);
      if (!exhibit || destroyed) return false;
      selectExhibit(exhibit);
      open(trigger || launcher);
      if (describe && !autoDescribeRequested && !thread.childElementCount && activeRequest === null) {
        autoDescribeRequested = true;
        submitQuestion('请描述这幅画面，并说说有哪些值得留意的细节。');
      }
      return true;
    },
    destroy() {
      if (destroyed) return;
      if (activeRequest) activeRequest.abort();
      activeRequest = null;
      history = [];
      sessions.clear();
      destroyed = true;
      host.remove();
    },
    host
  };
  host.museumAssistant = api;
  renderPrompts();
  refreshControls();
  if (openInitially) open();
  return api;
}

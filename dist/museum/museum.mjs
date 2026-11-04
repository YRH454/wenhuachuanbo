import { artworks, filterArtworks } from './artworks.mjs';
import { mountMosaics } from './mosaic.mjs';
import { mountMuseumAssistant } from '../museum-assistant/assistant.mjs';
import { mountUniversalGuide } from '../museum-assistant/universal-guide.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storageKey = 'yiwu-museum-board-v1';
const state = { query: '', theme: 'all', color: 'all', mode: 'theme', saved: new Set() };
const byId = new Map(artworks.map(item => [item.id, item]));
const assistant = mountMuseumAssistant();
mountUniversalGuide({ assistant });
let storageAvailable = true;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) state.saved = new Set(saved.filter(id => byId.has(id)));
} catch { storageAvailable = false; }

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify([...state.saved])); }
  catch { storageAvailable = false; }
  $('#board-message').textContent = storageAvailable ? '' : '当前浏览器无法保存收藏，刷新后可能丢失。';
}

function makeImage(item, decorative = false) {
  const image = document.createElement('img');
  image.src = decorative ? `images/mosaic/${item.id}.jpg?v=2` : item.image; image.alt = decorative ? '' : item.alt;
  image.loading = decorative ? 'eager' : 'lazy'; image.decoding = 'async';
  image.style.objectPosition = item.position || 'center';
  image.addEventListener('error', () => { image.classList.add('image-error'); image.alt = decorative ? '' : `${item.title}图片暂时无法载入`; }, {once: true});
  return image;
}

function textElement(tag, className, value) {
  const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
}

function toggleSaved(id) {
  const item = byId.get(id); if (!item) return;
  const restoreCardFocus = document.activeElement?.classList.contains('save-button');
  const restoreBoardFocus = $('#board-dialog').contains(document.activeElement);
  const added = !state.saved.has(id);
  if (added) state.saved.add(id); else state.saved.delete(id);
  persist(); renderBoard(); renderResults();
  $('#live-message').textContent = `${item.title}${added ? '已加入' : '已移出'}灵感板。`;
  if (restoreCardFocus) $$('.save-button').find(button => button.dataset.artworkId === id)?.focus();
  if (restoreBoardFocus) $('[data-close-board]').focus();
}

function renderResults() {
  const visible = filterArtworks(artworks, state);
  const grid = $('#artwork-grid'); grid.replaceChildren();
  for (const item of visible) {
    const card = document.createElement('article'); card.className = 'artwork';
    const imageFrame = document.createElement('button'); imageFrame.type = 'button'; imageFrame.className = 'artwork-image';
    imageFrame.dataset.guideKind = 'exhibit'; imageFrame.dataset.guideId = item.id; imageFrame.dataset.guideTitle = item.title; imageFrame.dataset.guideSource = item.source;
    imageFrame.setAttribute('aria-label', `让小齐看看：${item.title}`); imageFrame.title = '让小齐看看这幅画';
    imageFrame.addEventListener('click', () => assistant.openForExhibit(item, imageFrame, { describe: true }));
    imageFrame.append(makeImage(item));
    const meta = document.createElement('div'); meta.className = 'artwork-meta';
    const heading = document.createElement('div'); heading.className = 'artwork-heading';
    const labels = document.createElement('div'); labels.append(textElement('h3', '', item.title), textElement('p', 'artwork-date', item.date));
    const save = document.createElement('button'); save.type = 'button'; save.className = 'save-button';
    save.dataset.artworkId = item.id;
    const saved = state.saved.has(item.id); save.setAttribute('aria-pressed', String(saved));
    save.setAttribute('aria-label', `${saved ? '移出灵感板' : '收藏'}：${item.title}`); save.textContent = saved ? '已收藏' : '收藏';
    save.addEventListener('click', () => toggleSaved(item.id)); heading.append(labels, save);
    const description = textElement('p', 'artwork-description', item.description);
    const source = document.createElement('a'); source.className = 'source-link'; source.href = item.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = `${item.sourceLabel} ↗`;
    const ask = document.createElement('button'); ask.type = 'button'; ask.className = 'ask-assistant';
    ask.dataset.artworkId = item.id; ask.textContent = '问问小齐'; ask.setAttribute('aria-label', `向小齐了解：${item.title}`);
    ask.addEventListener('click', () => assistant.openForExhibit(item, ask));
    const actions = document.createElement('div'); actions.className = 'artwork-actions'; actions.append(source, ask);
    meta.append(heading, description, textElement('p', 'artwork-credit', item.credit), actions); card.append(imageFrame, meta); grid.append(card);
  }
  const active = !!state.query || state.theme !== 'all' || state.color !== 'all';
  $('#results-status').textContent = active ? `找到 ${visible.length} 幅影像` : `共 ${visible.length} 幅影像 · 持续收录中`;
  $('#empty-state').hidden = visible.length > 0; $('[data-reset]').hidden = !active;
}

function renderBoard() {
  const items = $('#board-items'); items.replaceChildren();
  for (const id of state.saved) {
    const item = byId.get(id); if (!item) continue;
    const row = document.createElement('article'); row.className = 'board-item';
    const picture = makeImage(item); picture.loading = 'lazy';
    const info = document.createElement('div'); info.append(textElement('h3', '', item.title), textElement('p', '', item.date));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除'; remove.setAttribute('aria-label', `从灵感板移除${item.title}`);
    remove.addEventListener('click', () => toggleSaved(item.id)); row.append(picture, info, remove); items.append(row);
  }
  $('#board-empty').hidden = state.saved.size > 0;
  $$('[data-board-count]').forEach(node => { node.textContent = String(state.saved.size); });
  $('#board-message').textContent = storageAvailable ? '' : '当前浏览器无法保存收藏，刷新后可能丢失。';
}

function selectFilter(button, attribute, value) {
  $$(`[${attribute}]`).forEach(node => node.setAttribute('aria-pressed', String(node === button)));
  state[value] = button.getAttribute(attribute); renderResults();
}

function reset() {
  state.query = ''; state.theme = 'all'; state.color = 'all'; $('#search-input').value = '';
  $$('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === 'all')));
  $$('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === 'all')));
  renderResults();
}

$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  $$('[data-mode]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
  $('[data-theme-filters]').hidden = state.mode !== 'theme'; $('[data-color-filters]').hidden = state.mode !== 'color';
  state.theme = 'all'; state.color = 'all';
  $$('[data-theme]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.theme === 'all')));
  $$('[data-color]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.color === 'all')));
  renderResults();
}));
$$('[data-theme]').forEach(button => button.addEventListener('click', () => selectFilter(button, 'data-theme', 'theme')));
$$('[data-color]').forEach(button => button.addEventListener('click', () => selectFilter(button, 'data-color', 'color')));
$('.search-form').addEventListener('submit', event => { event.preventDefault(); state.query = $('#search-input').value.trim(); renderResults(); });
$$('[data-reset], [data-clear-search]').forEach(button => button.addEventListener('click', reset));
$$('[data-open-board]').forEach(button => button.addEventListener('click', () => $('#board-dialog').showModal()));
$('[data-close-board]').addEventListener('click', () => $('#board-dialog').close());
mountMosaics($$('[data-mosaic]'), artworks, makeImage, $$('[data-mosaic-toggle]')); renderBoard(); renderResults();

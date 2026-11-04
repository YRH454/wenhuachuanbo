import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import {artworks, filterArtworks} from './dist/museum/artworks.mjs';
import {mosaicRows, mountMosaics} from './dist/museum/mosaic.mjs';

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  for (let offset = 2; offset < bytes.length;) {
    assert.equal(bytes[offset++], 0xff, 'invalid JPEG marker');
    let marker = bytes[offset++];
    while (marker === 0xff) marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5)};
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

test('museum records have unique identifiers and traceable image information', () => {
  assert.ok(artworks.length >= 60);
  assert.equal(new Set(artworks.map(item => item.id)).size, artworks.length);
  for (const item of artworks) {
    assert.ok(item.title && item.alt && item.credit && item.image && item.description);
    assert.equal(new URL(item.source).protocol, 'https:');
    assert.ok(item.image.startsWith('images/'));
    assert.ok(item.themes.length && item.colors.length);
  }
});

test('keyword, theme and color filters use only the supplied records', () => {
  assert.equal(filterArtworks(artworks).length, artworks.length);
  assert.ok(filterArtworks(artworks, {query: '画像石'}).some(item => item.id === 'jiaxiang-rubbing'));
  assert.ok(filterArtworks(artworks, {query: '画像石'}).some(item => item.id === 'cma-1985-73'));
  assert.ok(filterArtworks(artworks, {query: '高密 剪纸'}).some(item => item.id === 'shandong-cut-shuihu'));
  assert.deepEqual(filterArtworks(artworks, {query: '临清 砖'}).map(item => item.id), ['linqing-bricks']);
  assert.deepEqual(filterArtworks(artworks, {query: '完全不存在的展品'}), []);
  assert.ok(filterArtworks(artworks, {theme: 'earth'}).every(item => item.themes.includes('earth')));
  assert.ok(filterArtworks(artworks, {color: 'ink'}).every(item => item.colors.includes('ink')));
});

test('every exhibition image is present and every offered theme has works', () => {
  for (const item of artworks) {
    const image = new URL(`./dist/museum/${item.image}`, import.meta.url);
    assert.ok(statSync(image).size > 0, `${item.title}: missing or empty image`);
    if (item.mosaic !== false) {
      const thumbnail = new URL(`./dist/museum/images/mosaic/${item.id}.jpg`, import.meta.url);
      assert.ok(statSync(thumbnail).size > 0, `${item.title}: missing mosaic image`);
      const {width, height} = jpegDimensions(readFileSync(thumbnail));
      assert.ok(Math.min(width, height) >= 100 && Math.max(width, height) <= 650, `${item.title}: invalid mosaic dimensions ${width}×${height}`);
    }
  }
  for (const theme of ['earth', 'bronze', 'jadeglass', 'painting', 'craft']) {
    assert.ok(filterArtworks(artworks, {theme}).length > 0, `${theme}: empty theme`);
  }
});

test('museum retains the original collection identifiers and mounts Xiaoqi', () => {
  for (const id of ['sdu-egg', 'folk-lantern', 'jiaxiang-rubbing', 'linqing-bricks', 'glaze-liyue', 'glaze-guanyin-vase']) {
    assert.ok(artworks.some(item => item.id === id), `${id}: original collection ID changed`);
  }
  const museumModule = readFileSync(new URL('./dist/museum/museum.mjs', import.meta.url), 'utf8');
  const assistantModule = readFileSync(new URL('./dist/museum-assistant/assistant.mjs', import.meta.url), 'utf8');
  assert.match(museumModule, /import\s*\{\s*mountMuseumAssistant\s*\}\s*from\s*['"]\.\.\/museum-assistant\/assistant\.mjs['"]/);
  assert.match(museumModule, /\bmountMuseumAssistant\(\)/);
  assert.match(assistantModule, /export function mountMuseumAssistant/);
  assert.ok(statSync(new URL('./dist/museum-assistant/assistant.css', import.meta.url)).size > 0);
});

test('assistant identity index matches the live museum and checked sources match their cards', () => {
  const index = JSON.parse(readFileSync(new URL('./dist/museum/artwork-context.json', import.meta.url), 'utf8'));
  const checked = JSON.parse(readFileSync(new URL('./dist/museum-assistant/verified-exhibits.json', import.meta.url), 'utf8'));
  assert.deepEqual(index.records, artworks.map(({id, title, image}) => ({id, title, image})));
  for (const [id, record] of Object.entries(checked.records)) {
    const artwork = artworks.find(item => item.id === id);
    assert.ok(artwork, `${id}: checked record has no matching artwork`);
    assert.equal(record.source.url, artwork.source, `${id}: checked source differs from the exhibit source`);
    assert.ok(record.facts.length > 0, `${id}: checked record has no facts`);
  }
});

test('mosaic rows draw from eligible old and new images without changing records', () => {
  const rows = mosaicRows(artworks, 3, 10);
  assert.equal(rows.length, 3);
  assert.ok(rows.every(row => row.length === 10));
  assert.ok(rows.flat().some(item => item.id === 'sdu-egg'));
  assert.ok(rows.flat().some(item => item.id === 'met-42698'));
  assert.ok(rows.flat().every(item => item.mosaic !== false));
  assert.deepEqual(mosaicRows([], 3), []);
});

test('mosaic loops are seamless and pause off-screen or in a hidden tab', () => {
  const original = {window: globalThis.window, document: globalThis.document, observer: globalThis.IntersectionObserver};
  let observer;
  class Element {
    constructor(className = '') {
      this.className = className; this.children = []; this.dataset = {}; this.flags = new Set();
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name) || this.flags.has(name),
        toggle: (name, enabled) => enabled ? this.flags.add(name) : this.flags.delete(name)
      };
    }
    append(...nodes) { this.children.push(...nodes); }
  }
  class Observer {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() {}
  }
  const events = {};
  globalThis.window = {IntersectionObserver: Observer};
  globalThis.IntersectionObserver = Observer;
  globalThis.document = {hidden: false, createElement: () => new Element(), addEventListener: (name, callback) => { events[name] = callback; }};
  try {
    const cover = new Element('cover-mosaic');
    const banner = new Element('banner-mosaic');
    const toggles = [new Element('toggle'), new Element('toggle')];
    toggles.forEach(button => { button.addEventListener = (event, callback) => { button[event] = callback; }; });
    mountMosaics([cover, banner], artworks, () => new Element('img'), toggles);
    assert.equal(cover.children.length, 3);
    assert.equal(banner.children.length, 1);
    const sequences = cover.children[0].children[0].children;
    assert.equal(sequences.length, 2);
    assert.deepEqual(sequences[0].children.map(tile => tile.dataset.artworkId), sequences[1].children.map(tile => tile.dataset.artworkId));
    assert.ok(cover.flags.has('motion-paused'));
    observer.callback([{target: cover, isIntersecting: true, intersectionRatio: 1}, {target: banner, isIntersecting: false, intersectionRatio: 0}]);
    assert.equal(cover.flags.has('motion-paused'), false);
    assert.ok(banner.flags.has('motion-paused'));
    document.hidden = true; events.visibilitychange();
    assert.ok(cover.flags.has('motion-paused'));
    document.hidden = false; events.visibilitychange();
    assert.equal(cover.flags.has('motion-paused'), false);
    toggles[0].click();
    assert.ok(cover.flags.has('motion-paused'));
    assert.equal(toggles[1].textContent, '继续动态');
    toggles[1].click();
    assert.equal(cover.flags.has('motion-paused'), false);
    assert.equal(toggles[0].textContent, '暂停动态');
    observer.callback([{target: cover, isIntersecting: true, intersectionRatio: 0}]);
    assert.ok(cover.flags.has('motion-paused'));
  } finally {
    globalThis.window = original.window; globalThis.document = original.document; globalThis.IntersectionObserver = original.observer;
  }
  const css = readFileSync(new URL('./dist/museum/museum.css', import.meta.url), 'utf8');
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?animation:none!important/);
});

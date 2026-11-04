import test from 'node:test';
import assert from 'node:assert/strict';
import { SUGGESTED_QUESTIONS, EXHIBIT_QUESTIONS, questionsForContext, safeExhibit, safeRelatedSources } from './assistant.mjs';

test('the suggested questions are distinct, concise prompts rather than fixed answers', () => {
  assert.equal(SUGGESTED_QUESTIONS.length, 3);
  assert.equal(new Set(SUGGESTED_QUESTIONS).size, 3);
  assert.ok(SUGGESTED_QUESTIONS.every(item => typeof item === 'string' && item.length <= 20));
});

test('exhibit prompts are concise and exhibit values do not create unsafe links', () => {
  assert.equal(EXHIBIT_QUESTIONS.length, 3);
  assert.equal(safeExhibit({ id: '../a', title: '作品' }), null);
  assert.equal(safeExhibit({ id: 'sdu-egg', title: '作品', source: 'javascript:alert(1)' }).source, '');
  assert.equal(safeExhibit({ id: 'sdu-egg', title: '作品', source: 'https://name@museum.sdu.edu.cn/a' }).source, '');
  assert.equal(safeExhibit({ id: 'sdu-egg', title: '作品', source: 'https://museum.sdu.edu.cn/info/1075/7023.htm' }).title, '作品');
});

test('scene suggestions match the map, city, person, object, picture, topic and museum', () => {
  for (const [id, word] of [['map', '地图'], ['city-370300', '城市'], ['person-370300-example', '人物'],
    ['object-370300-example', '文化'], ['citymedia-370300-example', '画面'], ['topic-370300-example', '主题'], ['museum-cover', '展馆']]) {
    const prompts = questionsForContext({ kind: 'scene', id });
    assert.equal(prompts.length, 3);
    assert.ok(prompts.some(prompt => prompt.includes(word)), `${id} prompts identify their subject`);
    assert.equal(prompts.some(prompt => prompt.includes('这件作品')), false);
  }
  assert.deepEqual(questionsForContext({ kind: 'exhibit', id: 'sdu-egg' }), EXHIBIT_QUESTIONS);
  assert.deepEqual(questionsForContext(null), SUGGESTED_QUESTIONS);
});

test('service-provided related records accept safe HTTPS sources and reject unsafe or duplicate URLs', () => {
  assert.deepEqual(safeRelatedSources(null), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'javascript:alert(1)' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'https://user@www.ihchina.cn/' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'https://www.ihchina.cn:443/' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'https://www.ihchina.cn:8443/' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'https://www.ihchina.cn/\n' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不\n安全', url: 'https://www.ihchina.cn/' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'http://www.ihchina.cn/' }]), []);
  assert.equal(safeRelatedSources([{ label: '非遗网', url: 'https://www.ihchina.cn/project_details/14466.html' }]).length, 1);
  const sources = safeRelatedSources([
    { label: '齐鲁晚报', url: 'https://www.qlwb.com.cn/detail/25200144.html' },
    { label: '重复来源', url: 'https://www.qlwb.com.cn/detail/25200144.html' },
    { label: '文化资料', url: 'https://www.dpm.org.cn/' },
    { label: '超过两条', url: 'https://example.org/' }
  ]);
  assert.deepEqual(sources.map(source => source.label), ['齐鲁晚报', '文化资料']);
});

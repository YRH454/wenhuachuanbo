import test from 'node:test';
import assert from 'node:assert/strict';
import { SUGGESTED_QUESTIONS, EXHIBIT_QUESTIONS, safeExhibit, safeRelatedSources } from './assistant.mjs';

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

test('related records allow only expected HTTPS hosts without credentials or ports', () => {
  assert.deepEqual(safeRelatedSources(null), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'javascript:alert(1)' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'https://www.ihchina.cn.evil.example/' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'https://user@www.ihchina.cn/' }]), []);
  assert.deepEqual(safeRelatedSources([{ label: '不安全', url: 'http://www.ihchina.cn/' }]), []);
  assert.equal(safeRelatedSources([{ label: '非遗网', url: 'https://www.ihchina.cn/project_details/14466.html' }]).length, 1);
});

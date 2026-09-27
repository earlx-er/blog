import { test } from 'node:test';
import assert from 'node:assert/strict';
import { externalEmbeds } from '../scripts/remark-embeds.mjs';

function renderStandalone(url) {
  const tree = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'link', url, children: [{ type: 'text', value: url }] }] }] };
  externalEmbeds()(tree);
  return tree.children[0];
}

test('standalone YouTube and Hatena Anonymous Diary URLs become embeds', () => {
  const youtube = renderStandalone('https://youtu.be/tnYvq6CYlJA?si=example');
  assert.equal(youtube.type, 'html');
  assert.match(youtube.value, /youtube-nocookie\.com\/embed\/tnYvq6CYlJA/);

  const hatena = renderStandalone('https://anond.hatelabo.jp/20170415160437');
  assert.equal(hatena.type, 'html');
  assert.match(hatena.value, /class="external-card"/);
  assert.match(hatena.value, /href="https:\/\/anond\.hatelabo\.jp\/20170415160437"/);
});

test('unrelated and non-standalone links stay unchanged', () => {
  assert.equal(renderStandalone('https://example.com/20170415160437').type, 'paragraph');
  const tree = { type: 'root', children: [{ type: 'paragraph', children: [
    { type: 'text', value: '記事：' },
    { type: 'link', url: 'https://anond.hatelabo.jp/20170415160437', children: [] },
  ] }] };
  externalEmbeds()(tree);
  assert.equal(tree.children[0].type, 'paragraph');
});

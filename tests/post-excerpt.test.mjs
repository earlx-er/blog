import test from 'node:test';
import assert from 'node:assert/strict';
import { postExcerpt } from '../src/lib/post-excerpt.mjs';

test('archive excerpt uses article prose and skips markdown-only media and links', () => {
  const body = `# Heading\n\n![photo](image.webp)\n\n**最初の文章**です。\n次の行です。\n\nhttps://example.com\n\n\`\`\`js\nconst secret = 1;\n\`\`\``;
  assert.equal(postExcerpt(body), '最初の文章です。 次の行です。');
});

test('archive excerpt falls back to description when there is no prose', () => {
  assert.equal(postExcerpt('![photo](image.webp)', '記事の概要'), '記事の概要');
});

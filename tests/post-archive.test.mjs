import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPostsByMonth, postsPageUrl, postsPerPage } from '../src/lib/post-archive.mjs';

test('groups a chronological page by month and keeps undated drafts separate', () => {
  const entries = ['2026-09-21', '2026-09-01', '2026-08-30', undefined]
    .map(date => ({ data: { date } }));
  const groups = groupPostsByMonth(entries);
  assert.deepEqual(groups.map(({ label, entries }) => [label, entries.length]), [
    ['2026年9月', 2], ['2026年8月', 1], ['下書き', 1],
  ]);
});

test('pagination keeps the first page at the existing Posts URL', () => {
  assert.equal(postsPerPage, 20);
  assert.equal(postsPageUrl(1), '/posts/');
  assert.equal(postsPageUrl(2), '/posts/page/2/');
  assert.equal(postsPageUrl(1, '/tech/'), '/tech/');
  assert.equal(postsPageUrl(2, '/tech/'), '/tech/page/2/');
});

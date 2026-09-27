import test from 'node:test';
import assert from 'node:assert/strict';
import { tagGroups, tagPath } from '../src/lib/tags.ts';
import { relatedPosts } from '../src/lib/related-posts.mjs';

const entry = (id, category, tags, date) => ({ id, data: { category, tags, date } });

test('tag URLs are readable and tag index counts unique articles', () => {
  const groups = tagGroups([
    entry('one', 'tech', ['C#', 'C#'], '2026-01-01'),
    entry('two', 'tech', ['c#', 'Unity'], '2026-01-02'),
  ]);
  assert.equal(tagPath('C#'), '/tags/csharp/');
  assert.equal(groups.find(group => group.slug === 'csharp').entries.length, 2);
  assert.equal(groups.find(group => group.slug === 'unity').entries.length, 1);
});

test('related articles prefer shared tags, then the same category', () => {
  const current = entry('current', 'tech', ['Unity'], '2026-01-01');
  const sameTag = entry('shared', 'diary', ['unity'], '2025-01-01');
  const sameCategory = entry('category', 'tech', ['C#'], '2026-02-01');
  const unrelated = entry('unrelated', 'diary', ['essay'], '2026-03-01');
  assert.deepEqual(relatedPosts(current, [current, unrelated, sameCategory, sameTag]).map(item => item.id), ['shared', 'category']);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import matter from 'gray-matter';
import { importVault } from '../scripts/import-obsidian.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'buun-import-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const vault = path.join(root, 'vault');
  const project = path.join(root, 'project');
  await mkdir(path.join(vault, 'notes'), { recursive: true });
  await mkdir(path.join(vault, 'assets'), { recursive: true });
  await sharp({ create: { width: 1800, height: 1000, channels: 3, background: '#123456' } }).jpeg().withMetadata().toFile(path.join(vault, 'assets/photo.jpg'));
  await writeFile(path.join(vault, 'notes/記事.md'), '#essay\n\n本文です。\n\n![[photo.jpg]]');
  await writeFile(path.join(vault, 'notes/秘密.md'), 'This must never be imported');
  return { vault, project, config: { vault, articles: [{ file: 'notes/記事.md', slug: 'one' }] } };
}
test('imports only selected content, defaults to draft, resizes images and removes metadata', async t => {
  const { project, config } = await fixture(t);
  assert.deepEqual(await importVault(config, project), [{ slug: 'one', images: 1 }]);
  const folder = path.join(project, 'src/content/posts/imported');
  assert.deepEqual(await readdir(folder), ['one.md']);
  const { data, content } = matter(await readFile(path.join(folder, 'one.md'), 'utf8'));
  assert.equal(data.draft, true); assert.equal(data.category, 'diary'); assert.deepEqual(data.tags, ['essay']); assert.equal(data.title, '記事');
  assert.match(content, /!\[\]\(\.\.\/\.\.\/\.\.\/assets\/imported\/one\//);
  const images = path.join(project, 'src/assets/imported/one');
  const metadata = await sharp(path.join(images, (await readdir(images))[0])).metadata();
  assert.equal(metadata.width, 1600); assert.equal(metadata.exif, undefined);
});
test('imports a selected thumbnail even when it is not in the article body', async t => {
  const { vault, project, config } = await fixture(t);
  await writeFile(path.join(vault, 'notes/記事.md'), '本文です。');
  config.articles[0].thumbnail = 'photo.jpg';
  config.articles[0].thumbnailAlt = '記事の写真';
  assert.deepEqual(await importVault(config, project), [{ slug: 'one', images: 1 }]);
  const { data, content } = matter(await readFile(path.join(project, 'src/content/posts/imported/one.md'), 'utf8'));
  assert.match(data.thumbnail, /^\.\.\/\.\.\/\.\.\/assets\/imported\/one\/.*\.webp$/);
  assert.equal(data.thumbnailAlt, '記事の写真');
  assert.equal(content.trim(), '本文です。');
});
test('assigns technical articles to Tech and rejects unknown categories', async t => {
  const { project, config } = await fixture(t);
  config.articles[0].category = 'tech';
  await importVault(config, project);
  const { data } = matter(await readFile(path.join(project, 'src/content/posts/imported/one.md'), 'utf8'));
  assert.equal(data.category, 'tech');
  config.articles[0].category = 'movies';
  await assert.rejects(importVault(config, project), /Invalid category/);
});
test('rejects ambiguous images without replacing the last successful import', async t => {
  const { vault, project, config } = await fixture(t);
  await importVault(config, project);
  const output = path.join(project, 'src/content/posts/imported/one.md');
  const previous = await readFile(output, 'utf8');
  await mkdir(path.join(vault, 'other')); await writeFile(path.join(vault, 'other/photo.jpg'), 'duplicate');
  await assert.rejects(importVault(config, project), /ambiguous/);
  assert.equal(await readFile(output, 'utf8'), previous);
});
test('rejects outside-vault articles, invalid dates and duplicate slugs', async t => {
  const { vault, project, config } = await fixture(t);
  await writeFile(path.join(vault, '../outside.md'), 'private');
  await assert.rejects(importVault({ vault, articles: [{ file: '../outside.md', slug: 'outside' }] }, project), /inside the vault/);
  await assert.rejects(importVault({ ...config, articles: [{ ...config.articles[0], publish: true }] }, project), /require a date/);
  await assert.rejects(importVault({ ...config, articles: [{ ...config.articles[0], date: '2026-02-30' }] }, project), /Invalid date/);
  await assert.rejects(importVault({ ...config, articles: [config.articles[0], config.articles[0]] }, project), /duplicate slug/);
});
test('does not publish private comments or follow unselected internal links', async t => {
  const { vault, project, config } = await fixture(t);
  await writeFile(path.join(vault, 'notes/記事.md'), '本文\n%% private %%');
  await assert.rejects(importVault(config, project), /private comments/);
  await writeFile(path.join(vault, 'notes/記事.md'), '[[秘密]]');
  await assert.rejects(importVault(config, project), /Unresolved internal link/);
});
test('removing an article from the selection removes generated content and images', async t => {
  const { project, config } = await fixture(t);
  await importVault(config, project);
  await importVault({ ...config, articles: [] }, project);
  assert.deepEqual(await readdir(path.join(project, 'src/content/posts/imported')), []);
  assert.deepEqual(await readdir(path.join(project, 'src/assets/imported')), []);
});

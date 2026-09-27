import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
export async function contentPatterns(preview) {
  if (preview) return '**/*.md';
  const base = new URL('../src/content/posts/', import.meta.url);
  async function walk(relative = '') {
    const entries = await readdir(new URL(relative || './', base), { withFileTypes: true });
    const result = [];
    for (const entry of entries) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) result.push(...await walk(name + '/'));
      else if (name.endsWith('.md')) {
        const { data } = matter(await readFile(new URL(name, base), 'utf8'));
        if (data.draft === false) result.push(name);
      }
    }
    return result;
  }
  const patterns = await walk();
  return patterns.length ? patterns : '__no_published_articles__.md';
}

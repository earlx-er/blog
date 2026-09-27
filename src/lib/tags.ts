import type { CollectionEntry } from 'astro:content';

export type TagGroup = { name: string; slug: string; entries: CollectionEntry<'posts'>[] };

export function tagSlug(tag: string) {
  return tag.trim().toLowerCase().replaceAll('#', 'sharp').replaceAll('+', 'plus')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

export const tagPath = (tag: string) => `/tags/${encodeURIComponent(tagSlug(tag))}/`;

export function tagGroups(entries: CollectionEntry<'posts'>[]): TagGroup[] {
  const bySlug = new Map<string, TagGroup>();
  for (const entry of entries) {
    for (const name of entry.data.tags) {
      const slug = tagSlug(name);
      if (!slug) continue;
      const group = bySlug.get(slug);
      if (group) {
        if (group.name.toLowerCase() !== name.trim().toLowerCase()) {
          throw new Error(`Tags "${group.name}" and "${name}" produce the same URL`);
        }
        if (!group.entries.includes(entry)) group.entries.push(entry);
      } else {
        bySlug.set(slug, { name: name.trim(), slug, entries: [entry] });
      }
    }
  }
  return [...bySlug.values()].sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name, 'ja'));
}

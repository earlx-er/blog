import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
export const previewMode = import.meta.env.DEV || import.meta.env.SITE_PREVIEW === '1';
export async function posts() {
  return (await getCollection('posts', ({ data }) => previewMode || !data.draft))
    .sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));
}
export const categoryName = (category: 'diary' | 'tech') => category === 'tech' ? 'Tech' : 'Diary';
export const categoryPath = (category: 'diary' | 'tech') => category === 'tech' ? '/tech/' : '/posts/';
export const postUrl = (post: CollectionEntry<'posts'>) => `${categoryPath(post.data.category)}${post.data.slug}/`;
export function dateLabel(date?: string) {
  return date ? date.replaceAll('-', '.') : '下書き';
}

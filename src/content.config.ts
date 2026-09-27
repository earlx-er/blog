import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { contentPatterns } from '../scripts/content-patterns.mjs';

const posts = defineCollection({
  loader: glob({ pattern: await contentPatterns(import.meta.env.DEV || import.meta.env.SITE_PREVIEW === '1'), base: './src/content/posts' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    slug: z.string(),
    category: z.enum(['diary', 'tech']).default('diary'),
    description: z.string().default(''),
    date: z.string().optional(),
    updated: z.string().optional(),
    tags: z.array(z.string()).default([]),
    thumbnail: image().optional(),
    thumbnailAlt: z.string().default(''),
    draft: z.boolean().default(true),
    source: z.url().optional(),
  }),
});
export const collections = { posts };

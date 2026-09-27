import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { externalEmbeds } from './scripts/remark-embeds.mjs';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  markdown: { processor: unified({ remarkPlugins: [externalEmbeds] }) },
});

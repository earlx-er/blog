import rss from '@astrojs/rss';
import { posts, postUrl } from '../lib/posts';
import { site } from '../config';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  const entries = (await posts()).filter(post => !post.data.draft);
  return rss({ title: site.name, description: site.description, site: context.site!, items: entries.map(post => ({ title: post.data.title, description: post.data.description, pubDate: new Date(post.data.date!), link: postUrl(post) })) });
}

import type { APIRoute, GetStaticPaths } from 'astro';
import { posts } from '../../lib/posts';
import { renderOgImage } from '../../lib/og-image';

export const getStaticPaths = (async () =>
  (await posts()).filter(post => !post.data.thumbnail).map(post => ({ params: { slug: post.data.slug }, props: { title: post.data.title, category: post.data.category } }))
) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props.title, props.category);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};

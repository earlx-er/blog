import type { APIRoute, GetStaticPaths } from 'astro';
import { renderPageOgImage } from '../../../lib/og-image';

const pages = {
  home: { title: 'blog.earlx.dev', home: true },
  diary: { title: 'Diary' },
  tech: { title: 'Tech', tech: true },
  tags: { title: 'Tags' },
  about: { title: 'About' },
  search: { title: 'Search' },
  'not-found': { title: 'Page Not Found' },
};

export const getStaticPaths = (() => Object.entries(pages).map(([name, props]) => ({ params: { name }, props }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderPageOgImage(props.title, props.home, props.tech);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

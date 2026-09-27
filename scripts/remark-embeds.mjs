import { visit } from 'unist-util-visit';

export function externalEmbeds() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || node.children.length !== 1) return;
      const child = node.children[0];
      const raw = child.type === 'link' ? child.url : child.type === 'text' ? child.value : '';
      let url;
      try { url = new URL(raw.trim()); } catch { return; }
      if (!['http:', 'https:'].includes(url.protocol)) return;

      const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) :
        ['www.youtube.com', 'youtube.com'].includes(url.hostname) && url.pathname === '/watch' ? url.searchParams.get('v') : null;
      if (id && /^[\w-]{11}$/.test(id)) {
        parent.children[index] = { type: 'html', value: `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube動画" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` };
        return;
      }

      if (url.hostname === 'anond.hatelabo.jp' && /^\/\d{14}\/?$/.test(url.pathname)) {
        const href = `https://anond.hatelabo.jp${url.pathname}`;
        parent.children[index] = { type: 'html', value: `<a class="external-card" href="${href}"><span class="external-card-site">はてな匿名ダイアリー</span><span class="external-card-title">記事を読む <span aria-hidden="true">↗</span></span><span class="external-card-url">${href}</span></a>` };
      }
    });
  };
}

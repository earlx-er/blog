import { readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist-preview');
const output = path.join(dist, 'design-proposals');
const designs = [
  { id: 'paper', name: 'A · 紙面', description: '暖かい色と明朝体で、文章をゆっくり読む案。', theme: 'light' },
  { id: 'column', name: 'B · 日付列', description: '日付を左に置き、記事の増加にも対応しやすい案。', theme: 'light' },
  { id: 'night', name: 'C · 暗色', description: '暗い背景とコンパクトな一覧を使う案。', theme: 'dark' },
];

async function htmlFiles(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'design-proposals' || entry.name === 'pagefind') continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(path.join(dir, entry.name), relative));
    else if (entry.isFile() && entry.name === 'index.html') result.push(relative);
  }
  return result;
}

const pages = await htmlFiles(dist);
const route = (file) => '/' + file.replaceAll(path.sep, '/').replace(/index\.html$/, '');
const routes = new Set(pages.map(route));
const article = [...routes].find(url => /^\/posts\/(?!page\/)[^/]+\/$/.test(url));
await rm(output, { recursive: true, force: true });

for (const design of designs) {
  const css = await readFile(path.join(root, 'design-proposals', `${design.id}.css`), 'utf8');
  for (const file of pages) {
    let html = await readFile(path.join(dist, file), 'utf8');
    html = html.replace(/<a\b([^>]*?)\bhref="(\/[^\"]*)"/g, (match, before, href) =>
      routes.has(href) ? `<a${before}href="/design-proposals/${design.id}${href}"` : match);
    html = html.replace('</head>', `<meta name="robots" content="noindex, nofollow"><style>${css}</style><script>document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') || '${design.theme}';</script></head>`);
    const target = path.join(output, design.id, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
  }
}

const sections = designs.map(({ id, name, description }) => `<section>
  <h2>${name}</h2><p>${description}</p>
  <iframe title="${name} のトップページ" src="/design-proposals/${id}/" loading="lazy"></iframe>
  <nav><a href="/design-proposals/${id}/">トップ</a><a href="/design-proposals/${id}/posts/">記事一覧</a>${article ? `<a href="/design-proposals/${id}${article}">記事本文</a>` : ''}<a href="/design-proposals/${id}/about/">About</a></nav>
</section>`).join('');

await writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>デザイン比較 · blog.earlx.dev</title><style>
*{box-sizing:border-box}body{margin:0;padding:35px 24px 60px;background:#ececea;color:#242424;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN',sans-serif;line-height:1.6}main{max-width:1500px;margin:auto}h1{font-size:27px;margin:0 0 8px}main>p{margin:0 0 30px;color:#555}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}section{min-width:0;padding:15px;background:#fff;border:1px solid #d4d4d0}h2{font-size:20px;margin:0 0 5px}section p{font-size:13px;color:#555;min-height:42px;margin:0 0 14px}iframe{display:block;width:100%;height:480px;border:1px solid #ddd}nav{display:flex;flex-wrap:wrap;gap:8px 16px;padding-top:14px;font-size:14px}a{color:#31596d;text-underline-offset:3px}@media(max-width:1050px){.grid{grid-template-columns:1fr}section p{min-height:0}iframe{height:420px}}
</style></head><body><main><h1>デザイン比較</h1><p>実際の記事とプロフィールを使った3案です。各案のリンクから全画面で確認できます。<a href="/og-proposals/">OGP画像の比較を見る →</a></p><div class="grid">${sections}</div></main></body></html>`);

console.log(`Created ${designs.length} design proposals from ${pages.length} preview pages.`);

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(import.meta.dirname, '../dist-preview/og-references');
const examples = [
  {
    name: '余白LAB',
    note: '紙白の背景と細い枠。小さな線画で記事ごとの差を出している。B4に近い。',
    article: 'https://yohakulab.com/articles/ogp-image-generation/',
    image: 'https://yohakulab.com/ogp/ogp-image-generation.png',
  },
  {
    name: 'ota2000',
    note: '暗い単色背景に大きなタイトル。装飾を絞り、アイコンだけで個人の識別を加えている。',
    article: 'https://ota2000.com/blog/astro-ogp-image/',
    image: 'https://ota2000.com/blog/astro-ogp-image/og.png',
  },
  {
    name: 'kawarimidoll.com',
    note: '記事ごとの絵文字、中央の短い見出し、淡いグラデーション。以前参考にしたブログの実例。',
    article: 'https://kawarimidoll.com/posts/202603261/',
    image: 'https://kawarimidoll.com/posts/202603261/og.png',
  },
  {
    name: 'makenowjust-labs/blog',
    note: '写真を薄く敷き、タイトルと日付を重ねる。写真が記事ごとの表情になる。',
    article: 'https://makenowjust-labs.github.io/blog/post/2022-04-25-og-image/',
    image: 'https://makenowjust-labs.github.io/blog/post/2022-04-25-og-image.png',
  },
  {
    name: 'Coded Chords',
    note: '白地に青い上下の帯。タイトル、タグ、著者名、ロゴでブログの記号を揃える。',
    article: 'https://codedchords.dev/blog/2026/02/ogp-image-generation/',
    image: 'https://codedchords.dev/blog/2026/02/ogp-image-generation/ogp.webp?h=2e5d8be6e579b4fb59f0',
  },
];

const techExamples = [
  {
    name: 'Anthony Fu',
    note: 'ほぼ黒の背景に繊細な線画。署名は小さく、記事タイトルを静かに見せる。',
    article: 'https://antfu.me/posts/async-sync-in-between',
    image: 'https://antfu.me/og/async-sync-in-between.png',
  },
  {
    name: 'Overreacted — Dan Abramov',
    note: '濃いグレーの背景と大きなタイトル。ピンクのサイト名と著者写真が識別点。',
    article: 'https://overreacted.io/impossible-components/',
    image: 'https://overreacted.io/impossible-components/opengraph-image?5b0b970dfd19bb8c',
  },
  {
    name: 'Josh W. Comeau',
    note: '記事専用のイラストを主役にした構成。見分けやすい一方、記事ごとの制作負荷は高い。',
    article: 'https://www.joshwcomeau.com/blog/the-post-developer-era/',
    image: 'https://www.joshwcomeau.com/images/og-the-post-developer-era.jpg',
  },
  {
    name: 'Kent C. Dodds',
    note: 'タイトル、記事写真、著者の顔と名前を明確に分けたカード。写真を選ぶ運用が前提。',
    article: 'https://kentcdodds.com/blog/2025-in-review',
    image: 'https://kentcdodds.com/resources/og-image?tpl=social-preview&params=eyJ0aXRsZSI6IjIwMjUgaW4gUmV2aWV3IiwicHJlVGl0bGUiOiJDaGVjayBvdXQgdGhpcyBhcnRpY2xlIiwidXJsIjoia2VudGNkb2Rkcy5jb20vYmxvZy8yMDI1LWluLXJldmlldyIsImZlYXR1cmVkSW1hZ2UiOiJ1bnNwbGFzaC9waG90by0xNzE3MTg2MTU4NDYzLWE3NTUwZGQxMDUzNCIsImZlYXR1cmVkSW1hZ2VTdHlsZSI6InBvcnRyYWl0In0&v=1&sig=846e9b073b31798430eb34eeb21f197cd1d43602a0bd1caa10430056b1ff2b02',
  },
  {
    name: 'Jxck',
    note: '記事共通の黒い正方形ロゴ。記事単位の識別よりサイトの認知を優先した例。',
    article: 'https://blog.jxck.io/entries/2025-09-20/mitigate-risk-of-oss-dependencies.html',
    image: 'https://blog.jxck.io/assets/img/jxck.600x600.png',
  },
];

const cards = (items) => items.map(({ name, note, article, image }) => `<article>
  <h2>${name}</h2><p>${note}</p>
  <a href="${article}" target="_blank" rel="noopener noreferrer"><img src="${image}" width="1200" height="630" loading="lazy" referrerpolicy="no-referrer" alt="${name}の記事に設定されたOGP画像"></a>
  <nav><a href="${article}" target="_blank" rel="noopener noreferrer">元記事 ↗</a><a href="${image}" target="_blank" rel="noopener noreferrer">画像を原寸で見る ↗</a></nav>
</article>`).join('');

const style = `*{box-sizing:border-box}body{margin:0;padding:38px 24px 70px;background:#eae9e5;color:#252525;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;line-height:1.6}main{max-width:1500px;margin:auto}h1{font-size:28px;margin:0 0 8px}main>p{margin:0 0 28px;color:#555}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{min-width:0;background:white;padding:16px;border:1px solid #d5d4d0}h2{font-size:19px;margin:0 0 3px}article p{font-size:14px;color:#555;margin:0 0 15px}img{display:block;width:100%;height:auto;border:1px solid #e2e2e2}nav{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;font-size:14px}a{color:#31596d;text-underline-offset:3px}@media(max-width:850px){.grid{grid-template-columns:1fr}}`;

const page = ({ title, introduction, back, backLabel, items }) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title} · blog.earlx.dev</title><style>${style}</style></head><body><main><h1>${title}</h1><p>${introduction} <a href="${back}">${backLabel}</a></p><div class="grid">${cards(items)}</div></main></body></html>`;

await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'index.html'), page({ title: '実在ブログのOGP画像', introduction: '各記事の og:image で指定されている画像をそのまま表示しています。', back: '/og-references/tech/', backLabel: '著名な技術ブログを比較する →', items: examples }));
await mkdir(path.join(output, 'tech'), { recursive: true });
await writeFile(path.join(output, 'tech/index.html'), page({ title: '著名な技術ブログのOGP画像', introduction: '各記事の og:image を比較します。画像は元サイトから直接表示しています。', back: '/og-references/', backLabel: '最初の比較ページへ戻る →', items: techExamples }));
console.log(`Created ${examples.length + techExamples.length} real-blog OGP references.`);

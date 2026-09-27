import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';
import { renderOgSvg } from '../src/lib/og-image.ts';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist-preview', 'og-proposals');
const contentRoot = path.join(root, 'src/content/posts');
const esc = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

async function markdownFiles(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await markdownFiles(file));
    else if (entry.isFile() && entry.name.endsWith('.md')) result.push(file);
  }
  return result;
}

function width(char) {
  return /[\x21-\x7e]/u.test(char) ? 0.55 : /\s/u.test(char) ? 0.35 : 1;
}

function wrap(title, limit, maxLines) {
  const lines = [];
  let line = '';
  let units = 0;
  for (const { segment } of new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(title)) {
    if (line && units + width(segment) > limit) {
      lines.push(line.trim());
      line = '';
      units = 0;
    }
    line += segment;
    units += width(segment);
  }
  if (line) lines.push(line.trim());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
  }
  return lines;
}

function textLines(title, { x, y, size, lineHeight, limit, maxLines, className = 'title' }) {
  return wrap(title, limit, maxLines).map((line, index) =>
    `<text class="${className}" x="${x}" y="${y + index * lineHeight}" font-size="${size}">${esc(line)}</text>`
  ).join('');
}

function svg(body, styles) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><style>${styles}</style>${body}</svg>`;
}

const files = await markdownFiles(contentRoot);
const articleFile = files.find(file => file.includes(`${path.sep}imported${path.sep}`)) || files[0];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

if (!articleFile) {
  await writeFile(path.join(output, 'index.html'), '<!doctype html><html lang="ja"><meta charset="utf-8"><title>OGP画像の比較</title><p>比較に使える記事がありません。</p></html>');
  process.exit(0);
}

const markdown = await readFile(articleFile, 'utf8');
const { data, content } = matter(markdown);
const title = String(data.title);
const slug = String(data.slug);
const category = String(data.tags?.[0] || 'POST');
const hasCustomThumbnail = Boolean(data.thumbnail);
const articleSection = data.category === 'tech' ? 'tech' : 'posts';
const articleHtml = await readFile(path.join(root, 'dist-preview', articleSection, slug, 'index.html'), 'utf8');
const imageMeta = articleHtml.match(/<meta property="og:image" content="([^"]+)"/);
const currentImage = imageMeta ? new URL(imageMeta[1].replaceAll('&amp;', '&')).pathname : `/og/${slug}.png`;
const imagePaths = [...content.matchAll(/!\[[^\]]*\]\(([^)]+\.(?:webp|png|jpe?g))\)/gi)]
  .map(match => path.resolve(path.dirname(articleFile), match[1]));
const photo = imagePaths[1] || imagePaths[0];

const designs = [
  { id: 'current', name: hasCustomThumbnail ? '現行 · 指定サムネイル' : '現行 · クリーム＋新ロゴ', note: hasCustomThumbnail ? 'この記事で指定した画像を共有用に変換しています。' : '選んだ1案。新しいe.ロゴをサイト名に添えたOGP画像です。', file: currentImage },
  { id: 'editorial', name: 'B · 元の紙面', note: '調整前のB案。見出しや装飾の強さを比較できます。' },
  { id: 'dark', name: 'C · 暗色', note: '暗い背景と明るい文字で、タイムライン上で目立つ案。' },
  { id: 'poster', name: 'D · ポスター', note: '白黒と朱色、余白を減らして見出しを強く見せる案。' },
  ...(photo ? [{ id: 'photo', name: 'E · 記事写真', note: '記事の写真を使い、共有時に内容の雰囲気を伝える案。' }] : []),
];

const editorial = svg(`
  <rect width="1200" height="630" fill="#f2f0e9"/>
  <path d="M74 70H1126M74 550H1126" stroke="#877c6d" stroke-width="1.5"/>
  <text x="75" y="114" class="brand">blog.earlx.dev</text>
  <text x="1125" y="114" text-anchor="end" class="small">POSTS</text>
  ${textLines(title, { x: 76, y: 275, size: 64, lineHeight: 98, limit: 13.5, maxLines: 3 })}
  <text x="75" y="590" class="small">EARLX</text>
  <circle cx="1116" cy="578" r="7" fill="#ad745d"/>
`, `.brand{font:500 28px 'Hiragino Sans',sans-serif;fill:#594c42}.small{font:500 17px 'Hiragino Sans',sans-serif;letter-spacing:.14em;fill:#766b60}.title{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;font-weight:600;fill:#27231f}`);

const editorialVariants = [
  { id: 'refined', name: 'B調整版 · クリーム＋新ロゴ', note: hasCustomThumbnail ? 'サムネイルを指定しない記事で使う自動生成の案です。' : '新しいe.ロゴをサイト名に添えた1案。現在のOGP画像です。', image: renderOgSvg(title, 'cream-logo', category) },
  { id: 'base', name: 'B1 · 元の紙面', note: '左右の罫線と明朝見出し。最初に提案した形。', image: editorial },
  { id: 'title-page', name: 'B2 · 書籍の扉', note: '中央揃えと広い余白。静かで端正な印象。', image: svg(`
    <rect width="1200" height="630" fill="#f4f1e9"/>
    <text x="600" y="94" text-anchor="middle" class="brand">blog.earlx.dev</text>
    <path d="M540 135H660" stroke="#a77b65" stroke-width="2"/>
    ${textLines(title, { x: 600, y: 276, size: 68, lineHeight: 101, limit: 13.5, maxLines: 3 })}
    <path d="M540 514H660" stroke="#a77b65" stroke-width="2"/>
    <text x="600" y="565" text-anchor="middle" class="small">EARLX</text>
  `, `.brand{font:500 27px 'Hiragino Sans',sans-serif;fill:#62594f}.small{font:500 18px 'Hiragino Sans',sans-serif;letter-spacing:.2em;fill:#766c62}.title{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;font-weight:600;text-anchor:middle;fill:#24221f}`) },
  { id: 'accent', name: 'B3 · 朱の見出し', note: '細い朱色の縦線で視線を見出しへ誘導。', image: svg(`
    <rect width="1200" height="630" fill="#f5f2eb"/>
    <path d="M75 72H1125M75 550H1125" stroke="#9f9386" stroke-width="1.3"/>
    <text x="76" y="116" class="brand">blog.earlx.dev</text>
    <text x="1125" y="116" text-anchor="end" class="small">POSTS</text>
    <rect x="76" y="204" width="5" height="238" fill="#aa674c"/>
    ${textLines(title, { x: 112, y: 282, size: 68, lineHeight: 103, limit: 13.8, maxLines: 3 })}
    <text x="76" y="590" class="small">EARLX</text>
  `, `.brand{font:500 27px 'Hiragino Sans',sans-serif;fill:#554a40}.small{font:500 17px 'Hiragino Sans',sans-serif;letter-spacing:.14em;fill:#74685c}.title{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;font-weight:600;fill:#25211d}`) },
  { id: 'frame', name: 'B4 · 版面', note: '薄い枠で一枚の印刷物のようにまとめた案。', image: svg(`
    <rect width="1200" height="630" fill="#eae5d9"/>
    <rect x="44" y="44" width="1112" height="542" fill="#f8f6f0" stroke="#b8ab9a" stroke-width="1.4"/>
    <text x="89" y="105" class="brand">blog.earlx.dev</text>
    <path d="M89 139H1111" stroke="#c9bfb1"/>
    ${textLines(title, { x: 89, y: 275, size: 67, lineHeight: 103, limit: 13.5, maxLines: 3 })}
    <path d="M89 520H1111" stroke="#c9bfb1"/>
    <text x="89" y="557" class="small">EARLX</text>
    <text x="1110" y="557" text-anchor="end" class="small">POSTS</text>
  `, `.brand{font:500 28px 'Hiragino Sans',sans-serif;fill:#554c43}.small{font:400 16px 'Hiragino Sans',sans-serif;letter-spacing:.16em;fill:#7b7065}.title{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;font-weight:600;fill:#2b2520}`) },
  { id: 'sepia', name: 'B5 · 濃い紙', note: '明朝と罫線を残し、暗いセピア色へ反転。', image: svg(`
    <rect width="1200" height="630" fill="#38332f"/>
    <path d="M75 71H1125M75 549H1125" stroke="#aa9a85" stroke-width="1.3"/>
    <text x="76" y="113" class="brand">blog.earlx.dev</text>
    <text x="1125" y="113" text-anchor="end" class="small">POSTS</text>
    ${textLines(title, { x: 76, y: 275, size: 66, lineHeight: 100, limit: 13.5, maxLines: 3 })}
    <text x="76" y="589" class="small">EARLX</text>
    <circle cx="1115" cy="577" r="7" fill="#c68b6a"/>
  `, `.brand{font:500 28px 'Hiragino Sans',sans-serif;fill:#dbc9b2}.small{font:500 17px 'Hiragino Sans',sans-serif;letter-spacing:.14em;fill:#b9aa96}.title{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;font-weight:600;fill:#fbf5e8}`) },
];

await mkdir(path.join(output, 'editorial'), { recursive: true });
for (const variant of editorialVariants) {
  await sharp(new TextEncoder().encode(variant.image)).png().toFile(path.join(output, 'editorial', `${variant.id}.png`));
}
const editorialSections = editorialVariants.map(({ id, name, note }) => {
  const url = `/og-proposals/editorial/${id}.png`;
  return `<article><h2>${name}</h2><p>${note}</p><a href="${url}" target="_blank"><img src="${url}" width="1200" height="630" alt="${name}のOGP画像"></a><a class="full" href="${url}" target="_blank">原寸で見る ↗</a></article>`;
}).join('');
await writeFile(path.join(output, 'editorial', 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>紙面案の展開 · blog.earlx.dev</title><style>
*{box-sizing:border-box}body{margin:0;padding:38px 24px 70px;background:#eae9e5;color:#252525;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;line-height:1.6}main{max-width:1500px;margin:auto}h1{font-size:28px;margin:0 0 8px}main>p{margin:0 0 28px;color:#555}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{min-width:0;background:white;padding:16px;border:1px solid #d5d4d0}h2{font-size:19px;margin:0 0 3px}article p{font-size:14px;color:#555;margin:0 0 15px}img{display:block;width:100%;height:auto;border:1px solid #e2e2e2}a.full{display:inline-block;margin-top:10px;color:#31596d;font-size:14px;text-underline-offset:3px}@media(max-width:850px){.grid{grid-template-columns:1fr}}
</style></head><body><main><h1>B · 紙面案の展開</h1><p>記事「${esc(title)}」で文字組みを比較します。<a href="/og-proposals/cream-details/">クリーム案の4案を見る</a> · <a href="/og-references/tech/">参考にした技術ブログを見る</a></p><div class="grid">${editorialSections}</div></main></body></html>`);

const cleanVariants = [
  { id: 'cream', name: '1 · クリーム', note: '温かい余白と深緑の見出し。装飾を加える前の案。' },
  { id: 'dark', name: '2 · ダーク', note: '濃い背景でタイトルのコントラストを強めた案。' },
  { id: 'coral', name: '3 · コーラル', note: '淡い桃色の背景。サイト名を下に置いて少し軽やかに。' },
  { id: 'centered', name: '4 · 中央組み', note: '淡いミント色。文字を中央に集めた案。' },
];
await mkdir(path.join(output, 'clean'), { recursive: true });
for (const variant of cleanVariants) {
  await sharp(new TextEncoder().encode(renderOgSvg(title, variant.id))).png().toFile(path.join(output, 'clean', `${variant.id}.png`));
}
const cleanSections = cleanVariants.map(({ id, name, note }) => {
  const url = `/og-proposals/clean/${id}.png`;
  return `<article><h2>${name}</h2><p>${note}</p><a href="${url}" target="_blank"><img src="${url}" width="1200" height="630" alt="${name}のOGP画像"></a><a class="full" href="${url}" target="_blank">原寸で見る ↗</a></article>`;
}).join('');
await writeFile(path.join(output, 'clean', 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>装飾なしのOGP画像4案 · blog.earlx.dev</title><style>
*{box-sizing:border-box}body{margin:0;padding:38px 24px 70px;background:#eae9e5;color:#252525;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;line-height:1.6}main{max-width:1500px;margin:auto}h1{font-size:28px;margin:0 0 8px}main>p{margin:0 0 28px;color:#555}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{min-width:0;background:white;padding:16px;border:1px solid #d5d4d0}h2{font-size:19px;margin:0 0 3px}article p{font-size:14px;color:#555;margin:0 0 15px}img{display:block;width:100%;height:auto;border:1px solid #e2e2e2}a.full{display:inline-block;margin-top:10px;color:#31596d;font-size:14px;text-underline-offset:3px}@media(max-width:850px){.grid{grid-template-columns:1fr}}
</style></head><body><main><h1>装飾なしのOGP画像 · 4案</h1><p>文字の組み方と配色だけで比較します。記事「${esc(title)}」を使用。<a href="/og-proposals/cream-details/">クリーム案に要素を加えた4案へ</a></p><div class="grid">${cleanSections}</div></main></body></html>`);

const creamDetails = [
  { id: 'cream', name: '比較用 · 装飾なし', note: '前回のクリーム案。文字と余白だけ。' },
  { id: 'cream-logo', name: '1 · 新しいe.ロゴ', note: hasCustomThumbnail ? 'サムネイル未指定の記事で使う自動生成の案。' : '選んだ案。新しいロゴをサイト名に添える。現在のOGP画像。' },
  { id: 'cream-tag', name: '2 · ロゴ＋記事タグ', note: '新しいロゴに加え、記事に設定されたタグを下部に表示。' },
  { id: 'cream-rule', name: '3 · 見出しと記事情報', note: '罫線でサイト名・タイトル・記事タグを区切る。' },
];
await mkdir(path.join(output, 'cream-details'), { recursive: true });
for (const variant of creamDetails) {
  await sharp(new TextEncoder().encode(renderOgSvg(title, variant.id, category))).png().toFile(path.join(output, 'cream-details', `${variant.id}.png`));
}
const creamSections = creamDetails.map(({ id, name, note }) => {
  const url = `/og-proposals/cream-details/${id}.png`;
  return `<article><h2>${name}</h2><p>${note}</p><a href="${url}" target="_blank"><img src="${url}" width="1200" height="630" alt="${name}のOGP画像"></a><a class="full" href="${url}" target="_blank">原寸で見る ↗</a></article>`;
}).join('');
await writeFile(path.join(output, 'cream-details', 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>クリーム案に要素を加えたOGP画像 · blog.earlx.dev</title><style>
*{box-sizing:border-box}body{margin:0;padding:38px 24px 70px;background:#eae9e5;color:#252525;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;line-height:1.6}main{max-width:1500px;margin:auto}h1{font-size:28px;margin:0 0 8px}main>p{margin:0 0 28px;color:#555}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{min-width:0;background:white;padding:16px;border:1px solid #d5d4d0}h2{font-size:19px;margin:0 0 3px}article p{font-size:14px;color:#555;margin:0 0 15px}img{display:block;width:100%;height:auto;border:1px solid #e2e2e2}a.full{display:inline-block;margin-top:10px;color:#31596d;font-size:14px;text-underline-offset:3px}@media(max-width:850px){.grid{grid-template-columns:1fr}}
</style></head><body><main><h1>クリーム案に要素を加える</h1><p>記事「${esc(title)}」のロゴとタグ「${esc(category)}」を使った比較です。<a href="/og-proposals/clean/">装飾なしの案へ戻る</a></p><div class="grid">${creamSections}</div></main></body></html>`);

const dark = svg(`
  <rect width="1200" height="630" fill="#202a31"/>
  <rect x="0" y="0" width="18" height="630" fill="#d9ac79"/>
  <text x="82" y="100" class="brand">blog.earlx.dev</text>
  ${textLines(title, { x: 80, y: 265, size: 69, lineHeight: 106, limit: 13.3, maxLines: 3 })}
  <path d="M82 539H1118" stroke="#83939a" opacity=".55"/>
  <text x="82" y="583" class="small">EARLX</text>
  <text x="1118" y="583" text-anchor="end" class="small">POSTS</text>
`, `.brand{font:500 28px 'Hiragino Sans',sans-serif;fill:#d9ac79}.small{font:400 20px 'Hiragino Sans',sans-serif;letter-spacing:.12em;fill:#d1d4d1}.title{font-family:'Hiragino Sans',sans-serif;font-weight:700;fill:#f4f1e9}`);

const poster = svg(`
  <rect width="1200" height="630" fill="#f7f7f3"/>
  <rect x="0" y="0" width="1200" height="22" fill="#bb422e"/>
  <text x="75" y="100" class="brand">blog.earlx.dev</text>
  <rect x="76" y="165" width="90" height="9" fill="#bb422e"/>
  ${textLines(title, { x: 75, y: 275, size: 80, lineHeight: 112, limit: 11.8, maxLines: 3 })}
  <text x="75" y="576" class="small">EARLX / POSTS</text>
  <circle cx="1100" cy="554" r="19" fill="#bb422e"/>
`, `.brand{font:700 30px 'Hiragino Sans',sans-serif;fill:#252525}.small{font:600 18px 'Hiragino Sans',sans-serif;letter-spacing:.14em;fill:#bb422e}.title{font-family:'Hiragino Sans',sans-serif;font-weight:800;fill:#151515}`);

for (const [name, image] of [['editorial', editorial], ['dark', dark], ['poster', poster]]) {
  await sharp(new TextEncoder().encode(image)).png().toFile(path.join(output, `${name}.png`));
}

if (photo) {
  const background = await sharp(photo).resize(480, 630, { fit: 'cover' }).png().toBuffer();
  const overlay = svg(`
    <rect x="0" y="0" width="755" height="630" fill="#252622"/>
    <rect x="755" y="0" width="445" height="630" fill="none" stroke="#fff" stroke-width="0"/>
    <text x="66" y="104" class="brand">blog.earlx.dev</text>
    <path d="M66 145H690" stroke="#c3b9a9" opacity=".5"/>
    ${textLines(title, { x: 66, y: 250, size: 59, lineHeight: 85, limit: 10.2, maxLines: 4 })}
    <text x="66" y="569" class="small">EARLX / POSTS</text>
  `, `.brand{font:600 27px 'Hiragino Sans',sans-serif;fill:#e9e2d5}.small{font:400 19px 'Hiragino Sans',sans-serif;letter-spacing:.12em;fill:#c8bcae}.title{font-family:'Hiragino Sans',sans-serif;font-weight:700;fill:#fffaf0}`);
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#252622' } })
    .composite([{ input: background, left: 720, top: 0 }, { input: new TextEncoder().encode(overlay), left: 0, top: 0 }])
    .png().toFile(path.join(output, 'photo.png'));
}

const sections = designs.map(({ id, name, note, file }) => {
  const url = file || `/og-proposals/${id}.png`;
  return `<article><h2>${name}</h2><p>${note}</p><a href="${url}" target="_blank"><img src="${url}" width="1200" height="630" alt="${name}のOGP画像"></a><a class="full" href="${url}" target="_blank">原寸で見る ↗</a>${id === 'editorial' ? '<br><a class="full" href="/og-proposals/editorial/">Bの展開を見る →</a>' : ''}${id === 'current' ? '<br><a class="full" href="/og-proposals/cream-details/">クリーム案の4案を見る →</a>' : ''}</article>`;
}).join('');
await writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>OGP画像の比較 · blog.earlx.dev</title><style>
*{box-sizing:border-box}body{margin:0;padding:38px 24px 70px;background:#eae9e5;color:#252525;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;line-height:1.6}main{max-width:1500px;margin:auto}h1{font-size:28px;margin:0 0 8px}main>p{margin:0 0 28px;color:#555}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{min-width:0;background:white;padding:16px;border:1px solid #d5d4d0}h2{font-size:19px;margin:0 0 3px}article p{font-size:14px;color:#555;margin:0 0 15px}img{display:block;width:100%;height:auto;border:1px solid #e2e2e2}a.full{display:inline-block;margin-top:10px;color:#31596d;font-size:14px;text-underline-offset:3px}@media(max-width:850px){.grid{grid-template-columns:1fr}}
</style></head><body><main><h1>OGP画像の比較</h1><p>記事「${esc(title)}」を使った案です。現行のOGP画像とほかの案を比較します。</p><div class="grid">${sections}</div></main></body></html>`);

console.log(`Created ${designs.length} OGP proposals for ${slug}.`);

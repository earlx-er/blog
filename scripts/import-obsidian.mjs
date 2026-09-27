import { readFile, writeFile, readdir, mkdir, rm, rename, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';

const imageExtensions = /\.(png|jpe?g|webp|avif|gif)$/i;
const inside = (root, file) => file.startsWith(root + path.sep);
async function filesIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.filter(e => !e.name.startsWith('.')).map(e =>
    e.isDirectory() ? filesIn(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []))).flat();
}
export async function importVault(config, projectRoot) {
  const vault = await realpath(config.vault);
  if (!Array.isArray(config.articles)) throw new Error('articles must be an array');
  const allFiles = await filesIn(vault);
  const seen = new Set();
  const prepared = [];
  for (const article of config.articles) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '') || seen.has(article.slug)) {
      throw new Error(`Invalid or duplicate slug: ${article.slug}`);
    }
    seen.add(article.slug);
    if (article.category !== undefined && !['diary', 'tech'].includes(article.category)) {
      throw new Error(`Invalid category: ${article.category}`);
    }
    for (const key of ['date', 'updated']) {
      if (article[key] !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(article[key]) ||
        Number.isNaN(Date.parse(article[key])) || new Date(article[key]).toISOString().slice(0, 10) !== article[key])) {
        throw new Error(`Invalid ${key}: ${article[key]}`);
      }
    }
    if (article.publish === true && !article.date) throw new Error('Published articles require a date');
    const sourcePath = await realpath(path.resolve(vault, article.file));
    if (!inside(vault, sourcePath) || !sourcePath.endsWith('.md')) throw new Error('Article must be a Markdown file inside the vault');
    const { content } = matter(await readFile(sourcePath, 'utf8'));
    const tags = new Set(article.tags || []);
    const images = new Map();
    const resolveImage = async (reference) => {
      if (!imageExtensions.test(reference)) throw new Error(`Unsupported embed: ${reference}`);
      const relative = path.resolve(path.dirname(sourcePath), reference);
      const rooted = path.resolve(vault, reference);
      let matches = allFiles.filter(f => f === relative);
      if (!matches.length) matches = allFiles.filter(f => f === rooted);
      if (!matches.length && !reference.includes('/')) matches = allFiles.filter(f => path.basename(f) === reference);
      if (matches.length !== 1) throw new Error(`Image missing or ambiguous: ${reference}`);
      const actual = await realpath(matches[0]);
      if (!inside(vault, actual)) throw new Error('Image must be inside the vault');
      const bytes = await readFile(actual);
      const name = createHash('sha256').update(bytes).digest('hex').slice(0, 20) + '.webp';
      if (!images.has(name)) images.set(name, await sharp(bytes).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer());
      return `../../../assets/imported/${article.slug}/${name}`;
    };
    const thumbnail = article.thumbnail ? await resolveImage(article.thumbnail) : undefined;
    // Code fences are preserved; ordinary prose is transformed separately.
    let fence = null;
    const lines = [];
    for (let line of content.split('\n')) {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
        lines.push(line); continue;
      }
      if (fence) { lines.push(line); continue; }
      if (/^\s*(?:#[\p{L}\p{N}_/-]+\s*)+$/u.test(line)) {
        for (const tag of line.matchAll(/#([\p{L}\p{N}_/-]+)/gu)) tags.add(tag[1]);
        continue;
      }
      for (const match of [...line.matchAll(/!\[\[([^\]]+)\]\]/g)]) {
        const [reference, label] = match[1].split('|');
        const url = await resolveImage(reference);
        const alt = label && !/^\d+(?:x\d+)?$/.test(label) ? label.replace(/[\[\]\\]/g, '') : '';
        line = line.replace(match[0], `![${alt}](${url})`);
      }
      // Standard Markdown images can use vault-relative or note-relative paths too.
      for (const match of [...line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)]) {
        const ref = match[2];
        if (ref.startsWith('../../../assets/imported/')) continue;
        if (/^https?:\/\//.test(ref)) continue;
        const url = await resolveImage(decodeURIComponent(ref.replace(/^<|>$/g, '')));
        line = line.replace(match[0], `![${match[1]}](${url})`);
      }
      if (/\[\[.*?\]\]/.test(line)) throw new Error(`Unresolved internal link in ${article.file}: ${line}`);
      if (/%%/.test(line)) throw new Error(`Remove Obsidian private comments before importing: ${article.file}`);
      lines.push(line);
    }
    const body = lines.join('\n').trim();
    const data = {
      title: article.title || path.basename(sourcePath, '.md'),
      slug: article.slug,
      category: article.category || 'diary',
      description: article.description || '',
      tags: [...tags],
      ...(thumbnail ? { thumbnail } : {}),
      ...(article.thumbnailAlt ? { thumbnailAlt: article.thumbnailAlt } : {}),
      draft: article.publish !== true,
      ...(article.date ? { date: article.date } : {}),
      ...(article.updated ? { updated: article.updated } : {}),
      ...(article.source ? { source: article.source } : {}),
    };
    if (data.source && !/^https:\/\/note\.com\//.test(data.source)) throw new Error('Source must be an HTTPS note URL');
    prepared.push({ slug: article.slug, text: matter.stringify(body, data), images });
  }
  // Validate and process every selected article before replacing generated output.
  const contentDir = path.join(projectRoot, 'src/content/posts/imported');
  const assetsDir = path.join(projectRoot, 'src/assets/imported');
  const stage = path.join(projectRoot, `.obsidian-import-${process.pid}`);
  await mkdir(path.join(stage, 'content'), { recursive: true });
  await mkdir(path.join(stage, 'assets'), { recursive: true });
  try {
    for (const item of prepared) {
      await writeFile(path.join(stage, 'content', `${item.slug}.md`), item.text);
      await mkdir(path.join(stage, 'assets', item.slug), { recursive: true });
      for (const [name, bytes] of item.images) await writeFile(path.join(stage, 'assets', item.slug, name), bytes);
    }
    await mkdir(path.dirname(contentDir), { recursive: true });
    await mkdir(path.dirname(assetsDir), { recursive: true });
    await rm(contentDir, { recursive: true, force: true });
    await rm(assetsDir, { recursive: true, force: true });
    await rename(path.join(stage, 'content'), contentDir);
    await rename(path.join(stage, 'assets'), assetsDir);
  } finally { await rm(stage, { recursive: true, force: true }); }
  return prepared.map(({ slug, images }) => ({ slug, images: images.size }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = JSON.parse(await readFile(process.argv[2] || 'obsidian.local.json', 'utf8'));
  console.log(JSON.stringify(await importVault(config, process.cwd()), null, 2));
}

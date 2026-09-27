import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const directory = process.argv[2];
if (!directory || !['dist', 'dist-preview'].includes(directory)) throw new Error('Expected a build output directory');
const sections = await Promise.all(['posts', 'tech'].map(section => readdir(path.join(directory, section), { recursive: true })));
if (sections.some(files => files.some(file => file.endsWith('/index.html')))) {
  execFileSync(path.resolve('node_modules/.bin/pagefind'), ['--site', directory, '--root-selector', '[data-pagefind-body]'], { stdio: 'inherit' });
} else {
  console.log('No published articles: search index is not needed.');
}

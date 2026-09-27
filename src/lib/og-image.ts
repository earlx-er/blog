import sharp from 'sharp';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]!);

function weight(char: string) {
  if (/\s/u.test(char)) return 0.35;
  if (/[\x21-\x7e]/u.test(char)) return 0.56;
  if (/[、。，．・：；！？「」『』（）]/u.test(char)) return 0.55;
  return 1;
}

function linesFor(title: string, limit: number) {
  const sizeOf = (value: string) => [...value].reduce((sum, char) => sum + weight(char), 0);
  const tokens = [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(title.trim())]
    .flatMap(({ segment }) => {
      if (sizeOf(segment) <= limit) return [segment];
      const parts: string[] = [];
      let part = '';
      for (const { segment: grapheme } of new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(segment)) {
        if (part && sizeOf(part + grapheme) > limit) {
          parts.push(part);
          part = '';
        }
        part += grapheme;
      }
      if (part) parts.push(part);
      return parts;
    });
  type Choice = { lines: string[]; cost: number };
  const choices: Choice[] = Array(tokens.length + 1);
  choices[tokens.length] = { lines: [], cost: 0 };
  for (let start = tokens.length - 1; start >= 0; start--) {
    if (/^\s+$/u.test(tokens[start])) {
      choices[start] = choices[start + 1];
      continue;
    }
    let value = '';
    let width = 0;
    let best: Choice | undefined;
    for (let end = start; end < tokens.length; end++) {
      const nextWidth = width + sizeOf(tokens[end]);
      if (nextWidth > limit) break;
      width = nextWidth;
      value += tokens[end];
      if (/^\s+$/u.test(tokens[end])) continue;
      const rest = choices[end + 1];
      const candidate = { lines: [value.trim(), ...rest.lines], cost: (limit - width) ** 2 + rest.cost };
      if (!best || candidate.lines.length < best.lines.length ||
        (candidate.lines.length === best.lines.length && candidate.cost < best.cost)) best = candidate;
    }
    choices[start] = best!;
  }
  return choices[0]?.lines || [];
}

function balancedLinesFor(title: string, limit: number) {
  return linesFor(title, limit);
}

export type OgVariant = 'cream' | 'dark' | 'coral' | 'centered' | 'cream-logo' | 'cream-tag' | 'cream-rule';

const palettes = {
  cream: { background: '#fff9ee', title: '#263b3a', brand: '#52635f' },
  dark: { background: '#203637', title: '#fffaf1', brand: '#f3ad91' },
  coral: { background: '#fbe7dc', title: '#58383c', brand: '#89545a' },
  centered: { background: '#eef3ef', title: '#26424a', brand: '#657b7d' },
  'cream-logo': { background: '#fff9ee', title: '#263b3a', brand: '#52635f' },
  'cream-tag': { background: '#fff9ee', title: '#263b3a', brand: '#52635f' },
  'cream-rule': { background: '#fff9ee', title: '#263b3a', brand: '#52635f' },
} as const;

function logoMark(x: number, y: number, size: number, background = '#263b3a', foreground = '#fff9ee', accent = '#efad84') {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect x="2" y="2" width="60" height="60" rx="12" fill="${background}"/>
    <path d="M44.5 33.5C44.5 24.5 38.4 18 29.1 18 19.7 18 13.5 24.6 13.5 34.5S20 51 30.2 51c5.9 0 10.4-1.9 14-5.6" fill="none" stroke="${foreground}" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m17 34.5 26.5-4" fill="none" stroke="${foreground}" stroke-width="7.2" stroke-linecap="round"/>
    <rect x="49" y="45" width="6" height="6" rx="2" fill="${accent}"/>
  </svg>`;
}

function titleLayout(title: string, initialSize = 86) {
  let fontSize = initialSize;
  let lines = balancedLinesFor(title, 11);
  if (lines.length > 3) {
    fontSize = 72;
    lines = balancedLinesFor(title, 13.5);
  }
  if (lines.length > 3) {
    fontSize = 60;
    lines = balancedLinesFor(title, 16);
  }
  if (lines.length > 4) {
    lines = lines.slice(0, 4);
    lines[3] = `${lines[3].slice(0, -1)}…`;
  }
  return { fontSize, lines };
}

export function renderOgSvg(title: string, variant: OgVariant = 'cream-logo', category = 'POST') {
  const centered = variant === 'centered';
  const palette = palettes[variant];
  const { fontSize, lines } = titleLayout(title, centered ? 82 : 86);
  const lineHeight = fontSize * 1.34;
  const firstBaseline = 356 - ((lines.length - 1) * lineHeight) / 2;
  const titleX = centered ? 600 : 76;
  const titleLines = lines.map((line, index) =>
    `<text x="${titleX}" y="${firstBaseline + index * lineHeight}" class="title">${escapeXml(line)}</text>`
  ).join('');
  const hasLogo = variant === 'cream-logo' || variant === 'cream-tag';
  const categoryLabel = [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(category.trim() || 'POST')]
    .slice(0, 16).map(({ segment }) => segment).join('').toUpperCase();
  const categoryWidth = Math.min(320, Math.max(128, 44 + [...categoryLabel].reduce((sum, char) => sum + (/[\x21-\x7e]/.test(char) ? 15 : 23), 0)));
  const brand = centered
    ? '<text x="600" y="565" class="brand">blog.earlx.dev</text>'
    : variant === 'coral'
      ? '<text x="76" y="565" class="brand">blog.earlx.dev</text>'
      : hasLogo
        ? `${logoMark(76, 72, 54)}<text x="148" y="108" class="brand">blog.earlx.dev</text>`
        : '<text x="76" y="108" class="brand">blog.earlx.dev</text>';
  const metadata = variant === 'cream-tag'
    ? `<rect x="76" y="526" width="${categoryWidth}" height="45" fill="#f2d5c4"/><text x="96" y="556" class="category">${escapeXml(categoryLabel)}</text>`
    : variant === 'cream-rule'
      ? `<path d="M76 139H1124M76 521H1124" stroke="#bdc8bf" stroke-width="1.5"/><text x="76" y="563" class="category">${escapeXml(categoryLabel)}</text>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
    <style>
      .brand { font: 600 23px 'Hiragino Sans', sans-serif; letter-spacing: 0.01em; fill: ${palette.brand}; ${centered ? 'text-anchor: middle;' : ''} }
      .title { font: 700 ${fontSize}px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; fill: ${palette.title}; ${centered ? 'text-anchor: middle;' : ''} }
      .category { font: 700 21px 'Hiragino Sans', sans-serif; letter-spacing: 0.08em; fill: #405550; }
    </style>
    <rect width="1200" height="630" fill="${palette.background}"/>
    ${brand}
    ${titleLines}
    ${metadata}
  </svg>`;
}

export function renderTechOgSvg(title: string, archive = false) {
  const { fontSize, lines } = titleLayout(title);
  const lineHeight = fontSize * 1.34;
  const firstBaseline = 365 - ((lines.length - 1) * lineHeight) / 2;
  const titleLines = lines.map((line, index) =>
    `<text x="76" y="${firstBaseline + index * lineHeight}" class="title">${escapeXml(line)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
    <style>
      .brand { font: 600 23px 'Hiragino Sans', sans-serif; fill: #d3e0ff; }
      .label { font: 700 28px 'Hiragino Sans', sans-serif; letter-spacing: 0.1em; text-anchor: end; fill: #b7f2dd; }
      .title { font: 700 ${fontSize}px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; fill: #f8f8f3; }
    </style>
    <rect width="1200" height="630" fill="#1a37a6"/>
    <rect width="17" height="630" fill="#b7f2dd"/>
    ${logoMark(76, 72, 54, '#f8f8f3', '#1a37a6', '#1a37a6')}
    <text x="148" y="108" class="brand">blog.earlx.dev</text>
    <text x="1124" y="108" class="label">${archive ? 'TECH / ARCHIVE' : 'TECH'}</text>
    <path d="M76 152H1124" stroke="#9db7ef" stroke-width="2"/>
    ${titleLines}
  </svg>`;
}

export async function renderOgImage(title: string, category: 'diary' | 'tech' = 'diary') {
  const svg = category === 'tech' ? renderTechOgSvg(title) : renderOgSvg(title, 'cream-logo');
  return sharp(new TextEncoder().encode(svg)).png().toBuffer();
}

export function renderPageOgSvg(title: string, home = false) {
  const fontSize = title.length > 15 ? 94 : 112;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
    <style>
      .brand { font: 600 26px 'Hiragino Sans', sans-serif; fill: #52635f; }
      .title { font: 700 ${fontSize}px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; fill: #263b3a; }
      .section { font: 600 28px 'Hiragino Sans', sans-serif; letter-spacing: 0.05em; fill: #52635f; }
    </style>
    <rect width="1200" height="630" fill="#fff9ee"/>
    ${logoMark(76, 73, 68)}
    ${home ? '' : '<text x="162" y="119" class="brand">blog.earlx.dev</text>'}
    <text x="76" y="369" class="title">${escapeXml(title)}</text>
    ${home ? '<text x="78" y="445" class="section">Diary / Tech</text>' : ''}
  </svg>`;
}

export async function renderPageOgImage(title: string, home = false, tech = false) {
  const svg = tech ? renderTechOgSvg(title, true) : renderPageOgSvg(title, home);
  return sharp(new TextEncoder().encode(svg)).png().toBuffer();
}

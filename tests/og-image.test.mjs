import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { renderOgImage, renderOgSvg, renderTechOgSvg, renderPageOgImage, OG_WIDTH, OG_HEIGHT } from '../src/lib/og-image.ts';

test('article title produces a valid share image, including XML-sensitive characters', async () => {
  const image = await renderOgImage('記事「A & B < C」について');
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, OG_WIDTH);
  assert.equal(metadata.height, OG_HEIGHT);
});
test('Tech share images use a distinct category design', async () => {
  const title = 'Unity 6のMultiplayer Play Modeがマルチプレイゲーム開発の救世主になりそう';
  const svg = renderTechOgSvg(title);
  assert.match(svg, />TECH<\/text>/);
  assert.match(svg, /fill="#1a37a6"/);
  assert.doesNotMatch(svg, /TECHNICAL ARTICLE|>ARTICLES</);
  assert.ok(!renderOgSvg(title).includes('fill="#1a37a6"'));
  const image = await renderOgImage(title, 'tech');
  const archive = await renderPageOgImage('Tech', false, true);
  for (const png of [image, archive]) {
    const metadata = await sharp(png).metadata();
    assert.equal(metadata.width, OG_WIDTH);
    assert.equal(metadata.height, OG_HEIGHT);
  }
});
test('share image keeps English words together in a Japanese title', () => {
  const title = 'Unity 6のMultiplayer Play Modeがマルチプレイゲーム開発の救世主になりそう';
  const svg = renderOgSvg(title);
  const lines = [...svg.matchAll(/<text x="76" y="[^"]+" class="title">([^<]+)<\/text>/g)]
    .map(match => match[1]);
  assert.equal(lines.length, 3);
  assert.equal(lines.join('').replaceAll(' ', ''), title.replaceAll(' ', ''));
  assert.ok(lines.some(line => line.includes('Multiplayer')));
  assert.ok(lines.some(line => line.includes('Play')));
  assert.ok(lines.some(line => line.includes('Mode')));
  assert.ok(!lines.some(line => /Multiplayer|Play|Mode/.test(line) && /…/.test(line)));
});

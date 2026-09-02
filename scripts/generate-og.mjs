/**
 * Generates the Open Graph card for every chapter, plus the site default.
 *
 * A shared link with no image renders as a blank card, and the site declares
 * `twitter:card = summary_large_image`, which reserves the space whether or
 * not there is an image to put in it.
 *
 * The cards are committed to public/og/, so a normal build and deploy never
 * runs this. Re-run it when a chapter is added or a title changes:
 *
 *   npx playwright@1 install chromium   # once, if you have no browser
 *   node scripts/generate-og.mjs
 *
 * It renders the card as HTML in headless Chromium rather than composing an
 * image, so the type is set in the real Geist and Source Serif, with the same
 * tokens as the site. The fonts are inlined as data URIs because the page is
 * loaded from a data URL and cannot reach the filesystem.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public/og');
const chaptersDir = path.join(root, 'src/content/chapters');

/* The light palette, copied from src/styles/tokens.css. A card is a fixed
   image: it cannot follow the reader's theme, so it commits to light. */
const T = {
  bg: '#fcfcfa', ink: '#171612', ink2: '#56514a', ink3: '#6f6a5e',
  line: '#e3e0d8', line2: '#d1cdc2', accent: '#c1391c', accentBg: '#fbeae5',
};

const font = (pkg, file) => {
  const p = path.join(root, 'node_modules/@fontsource-variable', pkg, 'files', file);
  return `url(data:font/woff2;base64,${readFileSync(p).toString('base64')}) format('woff2')`;
};
const FACES = `
  @font-face { font-family: Geist; font-weight: 100 900;
    src: ${font('geist', 'geist-latin-wght-normal.woff2')}; }
  @font-face { font-family: GeistMono; font-weight: 100 900;
    src: ${font('geist-mono', 'geist-mono-latin-wght-normal.woff2')}; }
  @font-face { font-family: SourceSerif; font-weight: 200 900;
    src: ${font('source-serif-4', 'source-serif-4-latin-opsz-normal.woff2')}; }
`;

function frontmatter(file) {
  const text = readFileSync(path.join(chaptersDir, file), 'utf8');
  const block = text.split('---')[1] ?? '';
  const get = (k) => block.match(new RegExp(`^${k}: *"?(.*?)"?$`, 'm'))?.[1];
  return {
    id: file.replace(/\.mdx$/, ''),
    order: Number(get('order')),
    title: get('title'),
    summary: get('summary') ?? '',
    readingTime: get('readingTime') ?? '',
    draft: get('draft') === 'true',
  };
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** One card. `numeral` is the oversized watermark; `meta` the bottom line. */
function card({ eyebrow, title, lede, meta, numeral }) {
  // Long titles need to step down a size or they wrap to four lines.
  const size = title.length > 34 ? 68 : title.length > 22 ? 80 : 92;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FACES}
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${T.bg}; overflow: hidden;
           font-family: Geist, sans-serif; -webkit-font-smoothing: antialiased; }
    .card { position: relative; width: 100%; height: 100%; padding: 72px 80px;
            display: flex; flex-direction: column; justify-content: space-between; }
    .numeral { position: absolute; right: 40px; bottom: -70px; font-size: 380px;
               font-weight: 700; letter-spacing: -0.05em; color: ${T.accentBg};
               line-height: 1; user-select: none; }
    .row { position: relative; display: flex; align-items: center; gap: 14px; }
    .mark { width: 30px; height: 30px; border-radius: 7px; background: ${T.accent};
            color: #fff; font-size: 18px; font-weight: 700; display: flex;
            align-items: center; justify-content: center; }
    .wordmark { font-size: 19px; font-weight: 600; color: ${T.ink}; }
    .eyebrow { font-family: GeistMono, monospace; font-size: 17px; letter-spacing: 0.14em;
               text-transform: uppercase; color: ${T.accent}; }
    .body { position: relative; }
    h1 { font-size: ${size}px; font-weight: 660; letter-spacing: -0.038em;
         line-height: 1.06; color: ${T.ink}; max-width: 15ch; }
    h1 em { font-family: SourceSerif, serif; font-style: italic; font-weight: 400;
            letter-spacing: -0.02em; color: ${T.accent}; }
    .lede { margin-top: 26px; max-width: 46ch; font-family: SourceSerif, serif;
            font-size: 25px; line-height: 1.45; color: ${T.ink2}; }
    .foot { position: relative; display: flex; align-items: center; gap: 18px;
            padding-top: 26px; border-top: 1px solid ${T.line};
            font-family: GeistMono, monospace; font-size: 17px; color: ${T.ink3};
            letter-spacing: 0.06em; text-transform: uppercase; }
    .dot { flex: none; width: 4px; height: 4px; border-radius: 50%; background: ${T.line2}; }
  </style></head><body><div class="card">
    ${numeral ? `<div class="numeral">${esc(numeral)}</div>` : ''}
    <div class="row">
      <span class="mark">B</span>
      <span class="wordmark">Backend from First Principles</span>
      ${eyebrow ? `<span class="dot"></span><span class="eyebrow">${esc(eyebrow)}</span>` : ''}
    </div>
    <div class="body">
      <h1>${title}</h1>
      ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
    </div>
    <div class="foot">${meta.map(esc).map((m) => `<span>${m}</span>`).join('<span class="dot"></span>')}</div>
  </div></body></html>`;
}

const chapters = readdirSync(chaptersDir)
  .filter((f) => f.endsWith('.mdx'))
  .map(frontmatter)
  .filter((c) => !c.draft)
  .sort((a, b) => a.order - b.order);

/* The summary is a paragraph; a card has room for its opening clause. */
const opening = (s) => {
  const first = s.split(/(?<=\.)\s/)[0] ?? s;
  return first.length > 150 ? `${first.slice(0, 147).replace(/[,;\s]+\S*$/, '')}...` : first;
};

mkdirSync(outDir, { recursive: true });
// CHROMIUM_PATH points at a browser you already have (a CI image, a system
// install) instead of the one Playwright downloads for itself.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

async function shoot(html, file) {
  await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(path.join(outDir, file), await page.screenshot({ type: 'png' }));
  console.log(`  public/og/${file}`);
}

await shoot(card({
  title: 'Backend, from <em>first principles</em>.',
  lede: 'The machinery underneath the frameworks: what an HTTP request actually is, why a connection pool has the size it has, what a broker guarantees and what it does not.',
  meta: [`${chapters.length} chapters`, 'Go · Python', 'Theory + code'],
}), 'default.png');

for (const c of chapters) {
  const num = String(c.order).padStart(2, '0');
  await shoot(card({
    eyebrow: `Chapter ${num}`,
    title: esc(c.title),
    lede: opening(c.summary),
    meta: [c.readingTime, 'Go · Python'],
    numeral: num,
  }), `${c.id}.png`);
}

await browser.close();
console.log(`\n${chapters.length + 1} cards written to public/og/`);

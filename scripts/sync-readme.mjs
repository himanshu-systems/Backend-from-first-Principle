/**
 * Regenerates the README's table of contents from the chapter collection.
 *
 * The collection is the single source of truth for the series, so the README
 * should not be a second list maintained by hand: adding a chapter and
 * forgetting the README is how the two drift apart.
 *
 * Existing descriptions are preserved, keyed by chapter number, because they
 * are hand-written and better than anything derivable. A chapter with no
 * entry yet gets the first sentence of its frontmatter summary, which is a
 * reasonable placeholder to edit down.
 *
 *   node scripts/sync-readme.mjs          rewrite README.md
 *   node scripts/sync-readme.mjs --check  exit 1 if it would change anything
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'src/content/chapters');
const readmePath = path.join(root, 'README.md');

const LEAD = 'The documentation is organized into the following topics:';

/** Minimal frontmatter read: the schema is validated by Astro at build time. */
function frontmatter(file) {
  const text = readFileSync(path.join(dir, file), 'utf8');
  const block = text.split('---')[1] ?? '';
  const get = (key) => block.match(new RegExp(`^${key}: *"?(.*?)"?$`, 'm'))?.[1];
  return {
    order: Number(get('order')),
    title: get('navTitle') ?? get('title'),
    summary: get('summary') ?? '',
    draft: get('draft') === 'true',
  };
}

const chapters = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map(frontmatter)
  .filter((c) => !c.draft && Number.isFinite(c.order))
  .sort((a, b) => a.order - b.order);

const readme = readFileSync(readmePath, 'utf8');
const start = readme.indexOf(LEAD);
if (start === -1) throw new Error(`README is missing its lead line: "${LEAD}"`);
const bodyStart = start + LEAD.length;
const bodyEnd = readme.indexOf('\n## ', bodyStart);
if (bodyEnd === -1) throw new Error('README table of contents has no following heading');

// Keep whatever description a chapter already has; it is hand-written.
const existing = new Map();
for (const line of readme.slice(bodyStart, bodyEnd).split('\n')) {
  const m = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s+-\s+(.*)$/);
  if (m) existing.set(Number(m[1]), m[3]);
}

const list = chapters
  .map((c) => {
    const desc = existing.get(c.order) ?? `${c.summary.split(/(?<=\.)\s/)[0]}`;
    return `${c.order}. **${c.title}** - ${desc}`;
  })
  .join('\n');

const next = `${readme.slice(0, bodyStart)}\n\n${list}\n${readme.slice(bodyEnd)}`;

if (process.argv.includes('--check')) {
  if (next !== readme) {
    console.error('README table of contents is out of date. Run: npm run readme');
    process.exit(1);
  }
  console.log(`README table of contents matches all ${chapters.length} chapters.`);
} else {
  writeFileSync(readmePath, next);
  console.log(`README table of contents synced: ${chapters.length} chapters.`);
}

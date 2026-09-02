/**
 * Every chapter needs its Open Graph card, or its shared links render blank.
 *
 * The cards are committed under public/og rather than built, so adding a
 * chapter and forgetting to run scripts/generate-og.mjs is an easy miss.
 * This is the reminder.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const chapters = fs.readdirSync(path.join(root, 'src/content/chapters'))
  .filter((f) => f.endsWith('.mdx'));

test('every chapter has an Open Graph card', () => {
  const missing = chapters
    .map((f) => `${f.replace(/\.mdx$/, '')}.png`)
    .filter((png) => !fs.existsSync(path.join(root, 'public/og', png)));

  assert.deepEqual(missing, [], 'missing cards: run npm run og');
});

test('the site has a default card for pages that are not chapters', () => {
  assert.ok(fs.existsSync(path.join(root, 'public/og/default.png')));
});

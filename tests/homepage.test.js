/**
 * The homepage is generated now, so this guards the two things that a
 * rebuild or a new chapter can silently break.
 *
 * 1. Contributor credit. The hand-written homepage listed everyone who had
 *    contributed; the Astro rebuild dropped the list, and nobody noticed for
 *    a while. Losing it again should fail the build, not go unremarked.
 * 2. The series length. It appears in the title, the meta description and
 *    the hero. Typing it three times is how a "24-chapter reference" ends up
 *    on a site with 25 chapters, so it must stay derived.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'src/pages/index.astro'), 'utf8');

const CONTRIBUTORS = [
  'DsThakurRawat',
  'yogeshsingh63',
  'SaikrishnaReddy1919',
  'abhishek-bhatkar',
  'Prashantkmr389',
  'parthpatyl',
  'dhrumilbhut',
  'jainsparsh5',
];

test('every contributor is still credited on the homepage', () => {
  for (const handle of CONTRIBUTORS) {
    assert.ok(
      homepage.includes(`'${handle}'`),
      `${handle} is no longer listed in CONTRIBUTORS`,
    );
  }
});

test('the chapter count is derived, never typed', () => {
  const hardcoded = homepage.match(/\b\d+-chapter\b/g);
  assert.deepEqual(
    hardcoded,
    null,
    `hardcoded chapter count(s) ${hardcoded?.join(', ')}: use the derived total instead`,
  );
  assert.match(homepage, /const total = chapters\.length/);
});

test('parts are declared by start only, so appending a chapter needs no edit', () => {
  assert.match(homepage, /PART_STARTS/);
  assert.doesNotMatch(homepage, /\bto:\s*\d+/);
});

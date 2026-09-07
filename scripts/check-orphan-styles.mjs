#!/usr/bin/env node
/**
 * A `.module.css` that nothing imports.
 *
 * Found on 7 September 2026 while walking the production slots in OBS, which is
 * exactly the CEO's point about walking things: every checker was clean and the
 * browser source still went to air wrong.
 *
 * The slot renderer imports `./studio.module.css` from
 * `src/app/studio/[...parts]/`. There is ALSO a `src/app/studio/studio.module.css`
 * one directory up, which nothing imports. New CSS went into the second one, so
 * `styles.slotOverlay` resolved to `undefined`, the iframe fell back to its
 * default 300x150 white box, and an uploaded overlay in a slot rendered as a
 * small white rectangle in the corner of the frame.
 *
 * Nothing caught it:
 *
 *   - `check-css-classes` grades a missing class as SEVERE only when it is on a
 *     control somebody presses. A browser source is not a control, and it is
 *     going out on air, which is at least as severe.
 *   - `check-design` reads stylesheets and does not care who imports them.
 *   - The build is happy: an unimported CSS file is not an error.
 *
 * Two sibling files with the SAME NAME, one imported and one not, is the shape
 * that makes this near-invisible in review: the path in the import looks right
 * because it IS right, and the file you edited also looks right.
 *
 *   node scripts/check-orphan-styles.mjs
 *   node scripts/check-orphan-styles.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(HERE, 'orphan-styles-baseline.json');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

/** Every module stylesheet, and every one that is actually imported. */
export function orphans(files, read) {
  const sheets = files.filter((f) => /\.module\.css$/.test(f));
  const code = files.filter((f) => /\.(js|jsx|mjs)$/.test(f));

  const imported = new Set();
  for (const file of code) {
    const source = read(file);
    for (const m of source.matchAll(/from\s+['"]([^'"]+\.module\.css)['"]/g)) {
      const spec = m[1];
      // Resolve against the importing file, so two same-named siblings do not
      // cancel each other out. That collision is the whole fault.
      const resolved = spec.startsWith('.')
        ? path.resolve(path.dirname(file), spec)
        : path.resolve(SRC, spec.replace(/^@\//, ''));
      imported.add(resolved);
    }
  }
  return sheets.filter((s) => !imported.has(path.resolve(s)));
}

// --------------------------------------------------------------- self-test

function selfTest() {
  let failed = 0;

  const files = [
    path.join(SRC, 'app', 'studio', '[...parts]', 'page.js'),
    path.join(SRC, 'app', 'studio', '[...parts]', 'studio.module.css'),
    path.join(SRC, 'app', 'studio', 'studio.module.css'),
    path.join(SRC, 'app', 'events', 'page.js'),
    path.join(SRC, 'app', 'events', 'events.module.css'),
  ];
  const read = (f) => {
    if (f.endsWith(path.join('[...parts]', 'page.js'))) {
      return "import styles from './studio.module.css';";
    }
    if (f.endsWith(path.join('events', 'page.js'))) {
      return "import styles from './events.module.css';";
    }
    return '.a { color: red }';
  };

  const found = orphans(files, read).map((f) => path.relative(SRC, f).split(path.sep).join('/'));

  // The real fault: two siblings with the same name, only one imported.
  if (!found.includes('app/studio/studio.module.css')) {
    console.error('FAIL: did not catch the unimported sibling');
    failed++;
  }
  if (found.includes('app/studio/[...parts]/studio.module.css')) {
    console.error('FAIL: flagged the sheet that IS imported');
    failed++;
  }
  if (found.includes('app/events/events.module.css')) {
    console.error('FAIL: flagged an ordinary imported sheet');
    failed++;
  }

  if (failed) {
    console.error(`\n${failed} self-test case(s) failed.`);
    process.exit(1);
  }
  console.log('self-test passed: 3 cases, both directions.');
}

const RUN = process.argv[1] && process.argv[1].endsWith('check-orphan-styles.mjs');
if (RUN) {
  if (process.argv.includes('--self-test')) selfTest();
  else main();
}

function main() {
  const files = walk(SRC);
  const read = (f) => fs.readFileSync(f, 'utf8');
  const found = orphans(files, read)
    .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
    .sort();

  if (process.argv.includes('--baseline')) {
    fs.writeFileSync(BASELINE, JSON.stringify(found, null, 2));
    console.log(`Recorded ${found.length} orphan stylesheet(s) as the baseline.`);
    process.exit(0);
  }

  let known = new Set();
  try { known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); } catch { /* none */ }
  const fresh = found.filter((f) => !known.has(f));

  if (fresh.length) {
    console.error(`${fresh.length} stylesheet(s) nothing imports:\n`);
    for (const f of fresh) console.error(`  ${f}`);
    console.error('\nEditing one of these changes nothing on screen. Check whether');
    console.error('a sibling with the same name is the one actually imported.');
    process.exit(1);
  }

  console.log(`0 new orphan stylesheets. ${found.length} known.`);
}

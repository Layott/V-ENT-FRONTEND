#!/usr/bin/env node
// No arrow on the site is drawn as a character.
//
// CEO, 12 October 2026 (inbox 447): "The back arrow on the pages on the site
// are created like text they should be icons which are connected, not like
// text." Fourteen back links wrote "←" into their translated words, two legal
// pages wrote "&larr;", nine pagers used "‹" and "›", and two settings menus
// "›". They are BackLink, PagerArrow and an icon now.
//
// What fails, outside comments: "←", "&larr;", "&#8592;", "‹", "›",
// "&lsaquo;" or "&rsaquo;" anywhere in src (the dictionaries included, where
// a translated "← Back" puts the arrow back through the words).
//
// Forward arrows ("Next →") are a known follow-up and not counted here yet.
//
//   node scripts/check-back-arrows.mjs             # "text arrows: N problems"
//   node scripts/check-back-arrows.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');
const ARROW = /\u2190|&larr;|&#8592;|\u2039|\u203a|&lsaquo;|&rsaquo;/;

// Block comments become blank space line for line, so a line number still
// points at the right line after them.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

function problemsIn(text, file) {
  const out = [];
  stripComments(text).split(/\r?\n/).forEach((line, i) => {
    if (ARROW.test(line)) out.push(`${file}:${i + 1}: an arrow written as text; use BackLink, PagerArrow or an icon`);
  });
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return /^(generated|node_modules)$/.test(e.name) ? [] : walk(p);
    return /\.(js|jsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

function run() {
  const problems = walk(SRC).flatMap((f) => problemsIn(
    fs.readFileSync(f, 'utf8'), path.relative(ROOT, f).split(path.sep).join('/')));
  for (const p of problems.slice(0, 40)) console.log('  ' + p);
  console.log(`text arrows: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const cases = [
    ['a back link with a text arrow', `<Link href="/x">{tt('k', '\u2190 Back')}</Link>`, 1],
    ['a dictionary value with one', `    'ui.back': '\u2190 Back to events',`, 1],
    ['an html entity', `<Link href="/">&larr; {k('back')}</Link>`, 1],
    ['a pager chevron', `<button>\u2039</button>`, 1],
    ['a menu chevron', `<span className={s.chev}>\u203a</span>`, 1],
    ['BackLink passes', `<BackLink href="/x">{tt('k', 'Back')}</BackLink>`, 0],
    ['an arrow in a comment is not drawn', `// was "\u2190 Back" until inbox 447`, 0],
    ['a forward arrow is not counted yet', `{tt('k', 'Next \u2192')}`, 0],
  ];
  let failed = 0;
  for (const [label, text, want] of cases) {
    const got = problemsIn(text, 'fixture.js').length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${got})`);
  }
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest(); else run();

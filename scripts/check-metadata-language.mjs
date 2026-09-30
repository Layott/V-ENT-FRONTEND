#!/usr/bin/env node
// A page title written once, in English, for every reader.
//
// `export const metadata = { title: 'Payment' }` is evaluated once, where there
// is no request and so no language, so a French or Portuguese reader got an
// English tab title and an English link preview. Found on 52 layouts on 30
// September 2026 (inbox 375), after the same fault on the ticket page on 29
// September: twice, so a catcher.
//
// The fix is `export async function generateMetadata()` reading
// `currentLocale()`, with the words from `sectionCopy()` (public pages) or
// `privateTitle()` (signed-in pages) in `src/lib/seoCopy.js`.
//
//   node scripts/check-metadata-language.mjs
//   node scripts/check-metadata-language.mjs --self-test
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'src', 'app');

// A const metadata object that carries a quoted title or description.
const FIXED = /export\s+const\s+metadata\s*=\s*\{[\s\S]*?\b(title|description)\s*:\s*['"`]/;

// The second shape (inbox 380, 30 September): the same English written inside
// generateMetadata, where the function runs per request and the language is
// right there to ask for. "Team not found", "Short link", "${name}: run of
// show", and privateMetadata('Run of show').
const PRIVATE_LITERAL = /privateMetadata\(\s*['"`][^'"`]*\s[^'"`]*['"`]/;
const FIELD_LITERAL = /\b(title|description):\s*(?:clamp\()?\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g;

// Text that is a sentence rather than a name: two words of letters once any
// ${...} is taken out.
const isProse = (text) => /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text.replace(/\$\{[^}]*\}/g, ' '));

function generateMetadataBodies(src) {
  const out = [];
  const re = /generateMetadata\s*\([^)]*\)\s*\{/g;
  for (let m; (m = re.exec(src));) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
      i += 1;
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}

export function problems(src) {
  const found = [];
  if (FIXED.test(src)) found.push('a fixed-language title or description in `export const metadata`');
  if (PRIVATE_LITERAL.test(src)) found.push('privateMetadata given an English title instead of a PRIVATE_TITLES key');
  for (const body of generateMetadataBodies(src)) {
    for (const m of body.matchAll(FIELD_LITERAL)) {
      if (isProse(m[3])) found.push(`an English ${m[1]} inside generateMetadata: "${m[3].slice(0, 40)}"`);
    }
  }
  return found;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/^(layout|page)\.js$/.test(entry.name)) out.push(full);
  }
  return out;
}

function selfTest() {
  const cases = [
    ['a fixed title', "export const metadata = {\n  title: 'Payment',\n};", 1],
    ['a fixed description only', "export const metadata = { description: \"x\" };", 1],
    ['robots only is fine', "export const metadata = {\n  robots: { index: false },\n};", 0],
    ['generateMetadata is fine', "export async function generateMetadata() {\n  return { title: privateTitle('x', locale) };\n}", 0],
    ['an English not-found title in generateMetadata', "export async function generateMetadata() {\n  return buildMetadata({ title: 'Team not found', path: '/x' });\n}", 1],
    ['an English template description', "export async function generateMetadata(p) {\n  return buildMetadata({ description: `${name} plays on V-ENT.` });\n}", 1],
    ['privateMetadata with a literal title', "export function generateMetadata() {\n  return privateMetadata('Run of show');\n}", 1],
    ['privateMetadata with a key is fine', "export function generateMetadata() {\n  return privateMetadata('run-of-show');\n}", 0],
    ['a record name alone is fine', "export async function generateMetadata() {\n  return buildMetadata({ title: `${team.team_name}`, description: t('team.plain') });\n}", 0],
    ['a sentence outside generateMetadata is not metadata', "const x = { title: 'Hosting at scale' };", 0],
  ];
  let failed = 0;
  for (const [label, src, want] of cases) {
    const got = problems(src).length;
    if (got !== want) failed += 1;
    console.log(`${got === want ? 'ok  ' : 'FAIL'} ${label}: ${got} (want ${want})`);
  }
  console.log(failed ? `${failed} FAILED` : `${cases.length} self-test case(s) pass`);
  return failed === 0;
}

// Run only when invoked, so problems() can be imported and tried on a file.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) {
    process.exit(selfTest() ? 0 : 1);
  }

  const files = walk(APP);
  let bad = 0;
  for (const file of files) {
    for (const p of problems(fs.readFileSync(file, 'utf8'))) {
      bad += 1;
      console.log(`  ${path.relative(ROOT, file).split(path.sep).join('/')}: ${p}`);
    }
  }
  console.log(`${files.length} page(s) and layout(s) read, ${bad} with a title or description in one language only`);
  process.exit(bad ? 1 : 0);
}

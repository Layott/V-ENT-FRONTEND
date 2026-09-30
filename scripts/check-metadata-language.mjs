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

export function problems(src) {
  return FIXED.test(src) ? ['a fixed-language title or description in `export const metadata`'] : [];
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

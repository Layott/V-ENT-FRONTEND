#!/usr/bin/env node
// Text passed to tx() that no dictionary entry carries.
//
// tx("Some words") translates by looking the ENGLISH text up in a reverse
// index of the English dictionary. Text with no entry comes back as itself, so
// a French or Portuguese reader gets English, and nothing fails: check-keys
// reads tt('key', ...) and never sees these. On 28 September /tournaments/
// overlay read "Overlay de stream" over a paragraph of English, because its
// title had an entry and its blurb did not.
//
// Reads tx("...") and tx('...') calls, and the literal props the components
// that tx() their props are handed (ComingSoon: phase, title, blurb, label).
//
//   node scripts/check-tx-text.mjs
//   node scripts/check-tx-text.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'src');

const CALL = /\btx\(\s*(["'])((?:\\.|(?!\1).)*?)\1\s*\)/g;
const PROPS = /\b(phase|title|blurb|label)=(["'])((?:(?!\2).)+?)\2/g;
const TX_PROP_COMPONENTS = /<ComingSoon\b|label:\s*["']/;

export function findUntranslated(files, english) {
  const known = new Set(Object.values(english));
  const out = [];
  for (const [file, text] of files) {
    const unescape = (s) => s.replace(/\\(["'\\])/g, '$1').replace(/\\n/g, '\n');
    // Comment lines describe code; they do not render.
    const live = text.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    for (const m of live.matchAll(CALL)) {
      const s = unescape(m[2]);
      if (s.trim() && !known.has(s)) out.push({ file, text: s });
    }
    if (/<ComingSoon\b/.test(text)) {
      for (const m of text.matchAll(PROPS)) {
        if (!known.has(m[3])) out.push({ file, text: m[3] });
      }
      for (const m of text.matchAll(/label:\s*(["'])((?:(?!\1).)+?)\1/g)) {
        if (!known.has(m[2])) out.push({ file, text: m[2] });
      }
    }
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'i18n' || e.name === 'node_modules') continue;
      walk(p, acc);
    } else if (/\.jsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function selfTest() {
  const en = { a: 'Save', b: 'Stream overlay' };
  const cases = [
    [[['x.js', 'tx("Save")']], 0],
    [[['x.js', 'tx("Not in the dictionary")']], 1],
    [[['x.js', "tx('Stream overlay')"]], 0],
    [[['x.js', '<ComingSoon phase="Live now" title="Stream overlay" blurb="Words" />']], 2],
    [[['x.js', 'tx(variable)']], 0],
    [[['x.js', " *   {error || tx('Written in a comment')}"]], 0],
  ];
  let failed = 0;
  cases.forEach(([files, want], i) => {
    const got = findUntranslated(files, en).length;
    if (got !== want) failed += 1;
    console.log(`${got === want ? 'ok  ' : 'FAIL'} case ${i + 1}: expected ${want}, got ${got}`);
  });
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const { dictionaries } = await import(pathToFileURL(path.join(SRC, 'i18n', 'dictionaries.js')).href);
  const files = walk(SRC).map((f) => [path.relative(ROOT, f).replace(/\\/g, '/'), fs.readFileSync(f, 'utf8')]);
  const hits = findUntranslated(files, dictionaries.en);
  const seen = new Set();
  for (const h of hits) {
    const k = `${h.file}\u0000${h.text}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`${h.file}: "${h.text.slice(0, 90)}"`);
  }
  console.log(`${seen.size} text(s) passed to tx() with no dictionary entry`);
  process.exit(seen.size ? 1 : 0);
}

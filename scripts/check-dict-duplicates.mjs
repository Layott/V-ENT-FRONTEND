#!/usr/bin/env node
// A translation key written twice in the same language block.
//
// A JavaScript object keeps the LAST copy of a key and drops the first without
// a word. On 28 September there were 31 of them in every language, and several
// meant different things: `squad.title` was both "What a squad must satisfy"
// and "Mixed squads", so the squad rules panel showed the other panel's title;
// `admin.disqualified` was both the label "Disqualified" and the toast
// "{name} disqualified.", so the admin table printed the braces.
//
// Nothing else could see it: dict-parity, check-keys and check-accents all read
// the imported object, which has already thrown the first copy away. This one
// reads the source text.
//
//   node scripts/check-dict-duplicates.mjs
//   node scripts/check-dict-duplicates.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(HERE, '..', 'src', 'i18n', 'dictionaries.js');

const BLOCK = /^ {2}(en|fr|pt): \{\s*$/;
const KEY = /^\s*(["'])(.+?)\1\s*:/;

export function findDuplicates(text) {
  const out = [];
  let lang = null;
  let seen = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const b = line.match(BLOCK);
    if (b) {
      lang = b[1];
      seen = new Map();
      return;
    }
    if (!lang) return;
    const m = line.match(KEY);
    if (!m) return;
    const key = m[2];
    if (seen.has(key)) out.push({ lang, key, first: seen.get(key), again: i + 1 });
    else seen.set(key, i + 1);
  });
  return out;
}

function selfTest() {
  const cases = [
    ["  en: {\n    'a': 'x',\n    'b': 'y',\n  },", 0],
    ["  en: {\n    'a': 'x',\n    \"a\": 'y',\n  },", 1],
    // The same key in two languages is how it is meant to be.
    ["  en: {\n    'a': 'x',\n  },\n  fr: {\n    'a': 'x',\n  },", 0],
    ["  pt: {\r\n    'squad.title': 'x',\r\n    'squad.title': 'y',\r\n  },", 1],
  ];
  let failed = 0;
  cases.forEach(([text, expected], n) => {
    const got = findDuplicates(text).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} case ${n + 1}: expected ${expected}, got ${got}`);
  });
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const dupes = findDuplicates(fs.readFileSync(FILE, 'utf8'));
  for (const d of dupes) {
    console.log(`${d.lang} ${d.key}: line ${d.first} is dropped, line ${d.again} is what shows`);
  }
  console.log(`${dupes.length} translation key(s) written twice in one language`);
  process.exit(dupes.length ? 1 : 0);
}

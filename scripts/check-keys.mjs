/**
 * Every t()/tt() key a screen asks for must exist in English, French AND
 * Portuguese.
 *
 * dict-parity.mjs proves the three dictionaries are the same size. That is not
 * the same question: a key can be absent from all three and the parity check
 * stays green while the page falls back to the English written at the call
 * site. "Don't have an account?" sat under a fully translated French login
 * form for months for exactly this reason.
 *
 *   node scripts/check-keys.mjs [file ...]
 *
 * With no arguments it walks every .js under src/.
 */
import fs from 'node:fs';
import path from 'node:path';

import { dictionaries } from '../src/i18n/dictionaries.js';

const LANGS = ['en', 'fr', 'pt'];

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) return walk(full);
  return e.name.endsWith('.js') || e.name.endsWith('.jsx') ? [full] : [];
});

const files = process.argv.slice(2).length ? process.argv.slice(2) : walk('src');

// Both quote styles, because a key containing an apostrophe has to be written
// double-quoted, and that is precisely the one that got missed.
const CALL = /\b(?:tt|t)\(\s*(?:"([^"]+)"|'([^']+)')/g;

// A key written inside a comment is documentation, not a call. Without this
// the checker reports its own examples as missing translations, which is how a
// checker teaches people to ignore it.
const stripComments = (src) => src
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;   // a URL, not a comment
    return line.slice(0, at);
  })
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

let gaps = 0;
let checked = 0;
for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  for (const m of src.matchAll(CALL)) {
    const key = m[1] ?? m[2];
    // A key is a dotted identifier with no whitespace: `ui.x.y`, `api.CODE`,
    // `tEdit.name`. A sentence caught by the regex is some other function
    // called `t`, and every sentence has a space in it.
    //
    // This was a prefix allowlist, which is why it reported 0 missing while
    // skipping every namespace nobody had thought to add: tEdit, club,
    // eventEdit, org, safety, req, needsAccount. An allowlist of prefixes
    // silently stops covering the code the moment somebody names a new one,
    // and the check that says "0 missing" is the one nobody re-reads.
    if (!/^[A-Za-z][\w-]*(\.[\w-]+)+$/.test(key)) continue;
    checked += 1;
    const missing = LANGS.filter(l => !dictionaries[l][key]);
    if (missing.length) {
      gaps += 1;
      console.log(`MISSING ${missing.join(',')}  ${key}   (${file})`);
    }
  }
}

console.log(`${checked} keys checked, ${gaps} missing`);
process.exit(gaps ? 1 : 0);

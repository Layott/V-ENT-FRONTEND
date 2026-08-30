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

let gaps = 0;
let checked = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(CALL)) {
    const key = m[1] ?? m[2];
    // Keys look like `ui.x.y`, `msg.x` or `api.CODE`. A sentence caught by the
    // regex is some other function called `t`, not a translation.
    if (!/^(ui|msg|api|scrim|settings|admin|event|team|tournament|wallet|community|partner)\./.test(key)) continue;
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

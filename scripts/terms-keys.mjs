#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Every string on the terms page, keyed the way the page asks for it.
 *
 * The privacy policy has all 90 of its strings in English, French and
 * Portuguese. The terms were a PDF until today, so they have none, and a legal
 * document that only some readers can read is the reason the rule exists.
 *
 * Usage:
 *   node scripts/terms-keys.mjs            print key/English pairs as JSON
 *   node scripts/terms-keys.mjs --check    assert every key is in en, fr and pt
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COPY = path.join(HERE, '..', 'src', 'app', 'terms', 'termsCopy.js');
const DICT = path.join(HERE, '..', 'src', 'i18n', 'dictionaries.js');

/** Pull the quoted strings out of a `field: '...' + '...'` or an array. */
function strings(source) {
  return [...source.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
    .map((m) => m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}

export function termsStrings() {
  const src = fs.readFileSync(COPY, 'utf8');
  const pairs = [];

  // TERMS_KEYS: name: ['key', 'English'] - possibly across lines.
  const keysBlock = src.slice(src.indexOf('export const TERMS_KEYS = {'),
    src.indexOf('export const SECTIONS'));
  for (const m of keysBlock.matchAll(/^ {2}(\w+): \[([\s\S]*?)\],$/gm)) {
    const parts = strings(m[2]);
    if (parts.length < 2) continue;
    pairs.push([`terms.${parts[0]}`, parts.slice(1).join('')]);
  }

  // SECTIONS
  const body = src.slice(src.indexOf('export const SECTIONS'));
  const starts = [...body.matchAll(/^ {2}\{\n {4}id: '([^']+)',$/gm)];
  for (let i = 0; i < starts.length; i += 1) {
    const id = starts[i][1];
    const from = starts[i].index;
    const to = i + 1 < starts.length ? starts[i + 1].index : body.length;
    const chunk = body.slice(from, to);

    const heading = chunk.match(/^ {4}heading: '((?:[^'\\]|\\.)*)',$/m);
    if (heading) pairs.push([`terms.${id}.heading`, heading[1].replace(/\\'/g, "'")]);

    for (const field of [['paragraphs', 'p'], ['items', 'i'], ['after', 'a']]) {
      const block = chunk.match(new RegExp(`^ {4}${field[0]}: \\[([\\s\\S]*?)^ {4}\\],$`, 'm'));
      if (!block) continue;
      // Entries are separated at the top level of the array by `',\n      '`
      // or by a closing quote followed by a comma at that indentation.
      const entries = block[1]
        .split(/,\n(?= {6}')/)
        .map((e) => strings(e).join(''))
        .filter(Boolean);
      entries.forEach((text, n) => pairs.push([`terms.${id}.${field[1]}${n}`, text]));
    }
  }

  pairs.push(['terms.readPrivacy', 'Read the privacy policy']);
  return pairs;
}

if (process.argv[1] && process.argv[1].endsWith('terms-keys.mjs')) {
  const pairs = termsStrings();
  if (process.argv.includes('--check')) {
    const dict = fs.readFileSync(DICT, 'utf8');
    const bad = [];
    for (const [key] of pairs) {
      const n = (dict.match(new RegExp(`^ {4}'${key.replace(/\./g, '\\.')}':`, 'gm')) || []).length;
      if (n !== 3) bad.push(`${key} appears ${n} times`);
    }
    console.log(`terms strings: ${pairs.length}`);
    if (bad.length) {
      console.log(`\nNOT IN ALL THREE (${bad.length}):`);
      for (const b of bad.slice(0, 30)) console.log(`  ${b}`);
      process.exit(1);
    }
    console.log('every terms string exists in en, fr and pt');
  } else {
    console.log(JSON.stringify(Object.fromEntries(pairs), null, 1));
  }
}

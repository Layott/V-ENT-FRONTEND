#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Pull every string out of the page-guide registry, keyed by route.
 *
 * The guides are content, written in English in `pageGuides.js`. That file is
 * the English source of truth, but French and Portuguese readers need the same
 * sentences, and the hard rule is that a user-facing string goes through `t()`
 * with a key that exists in all three dictionaries.
 *
 * The key is built from the route, not from the English words: `guide.wallets.
 * title`, not `guide.Wallet`. Keying off the copy means editing a sentence
 * silently orphans its translations, which is exactly the failure that is
 * invisible until somebody reads the page in French.
 *
 * Usage:
 *   node scripts/guide-keys.mjs            print the key/English pairs as JSON
 *   node scripts/guide-keys.mjs --check    assert every key exists in en, fr, pt
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUIDES = path.join(HERE, '..', 'src', 'components', 'page-help', 'pageGuides.js');
const DICT = path.join(HERE, '..', 'src', 'i18n', 'dictionaries.js');

/** `/community/club` -> `community.club`; `/tournaments/:slug` -> `tournaments.slug`. */
export function routeKey(pattern) {
  const parts = pattern.split('/').filter(Boolean).map((s) => (s.startsWith(':') ? s.slice(1) : s));
  return parts.length ? parts.join('.') : 'root';
}

/** Parse the registry without importing it - it lives in a Next app. */
export function readGuides() {
  const src = fs.readFileSync(GUIDES, 'utf8');
  const body = src.slice(src.indexOf('export const GUIDES = {'));
  const out = [];

  // Each entry starts at two-space indentation and runs to the next one.
  const starts = [...body.matchAll(/^ {2}'(\/[^']*)': \{$/gm)];
  for (let i = 0; i < starts.length; i += 1) {
    const from = starts[i].index + starts[i][0].length;
    const to = i + 1 < starts.length ? starts[i + 1].index : body.length;
    const chunk = body.slice(from, to);
    const entry = { pattern: starts[i][1], key: routeKey(starts[i][1]) };

    const one = (field) => {
      const m = chunk.match(new RegExp(`^ {4}${field}: '((?:[^'\\\\]|\\\\.)*)',`, 'm'));
      return m ? m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\') : null;
    };
    entry.title = one('title');
    entry.what = one('what');
    entry.note = one('note');

    const does = chunk.match(/^ {4}does: (\[[\s\S]*?\]),$/m);
    entry.does = does
      ? [...does[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) =>
        m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
      : [];
    out.push(entry);
  }
  return out;
}

/** Every translation key the help panel can ask for, with its English text. */
export function guideStrings() {
  const pairs = [];
  const seen = new Set();
  for (const g of readGuides()) {
    if (seen.has(g.key)) throw new Error(`two guides share the key ${g.key}`);
    seen.add(g.key);
    if (g.title) pairs.push([`guide.${g.key}.title`, g.title]);
    if (g.what) pairs.push([`guide.${g.key}.what`, g.what]);
    g.does.forEach((line, i) => pairs.push([`guide.${g.key}.does.${i}`, line]));
    if (g.note) pairs.push([`guide.${g.key}.note`, g.note]);
  }
  return pairs;
}

if (process.argv[1] && process.argv[1].endsWith('guide-keys.mjs')) {
  const pairs = guideStrings();

  if (process.argv.includes('--check')) {
    const dict = fs.readFileSync(DICT, 'utf8');
    const missing = [];
    for (const [key] of pairs) {
      const n = (dict.match(new RegExp(`^ {4}'${key.replace(/\./g, '\\.')}':`, 'gm')) || []).length;
      if (n !== 3) missing.push(`${key} appears ${n} times, wanted 3`);
    }
    console.log(`guide strings: ${pairs.length}`);
    if (missing.length) {
      console.log(`\nNOT IN ALL THREE (${missing.length}):`);
      for (const m of missing.slice(0, 40)) console.log(`  ${m}`);
      process.exit(1);
    }
    console.log('every guide string exists in en, fr and pt');
  } else {
    console.log(JSON.stringify(Object.fromEntries(pairs), null, 2));
  }
}

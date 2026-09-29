#!/usr/bin/env node
// How full a tournament is, said one way.
//
// A tournament with no cap read "8/-" on its own page, "8/0" on the listing
// and "8/undefined" in search and on an event's line-up, with "teams" and
// "players" left in English beside it (walk, 28 September 2026). Before that
// the same number shipped as "0/32 slots" and "0/64" from a flat cap. Seven
// screens each wrote `current/max` by hand, and each got the empty case wrong
// its own way.
//
// What to write instead: `slotsText(tt, current, max, unit)` from
// src/lib/slots.js, which says "no limit" in words and pluralises the unit.
//
// This refuses any `max_participants` read in src/ outside the modules allowed
// below, because a screen that reads the cap is a screen about to print it.
//
//   node scripts/check-slots.mjs
//   node scripts/check-slots.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');

// Modules that read the cap for something other than printing it, each with
// the reason. The dictionaries only hold words.
const ALLOWED = {
  'src/lib/slots.js': 'the one place the sentence is built',
  'src/lib/formatCatalogue.js': 'a format\'s entrant limit, checked against the field, never printed as a count',
  'src/lib/seo.js': 'a description for crawlers that already says "{n} of {max} places taken" and omits it when there is no cap',
  'src/i18n/dictionaries.js': 'words only',
};

const READ = /\bmax_participants\b/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next'].includes(entry.name) || entry.name.startsWith('.next-dev')) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

export function findSlots(files, root = FRONTEND) {
  const hits = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (ALLOWED[rel]) continue;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      if (!READ.test(line)) return;
      // Handed straight to the helper on the same line is the right shape.
      if (/slotsText\(/.test(line)) return;
      hits.push(`${rel}:${i + 1}: ${t.slice(0, 110)}`);
    });
  }
  return hits;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(FRONTEND, '.slots-selftest-'));
  fs.mkdirSync(path.join(tmp, 'src', 'lib'), { recursive: true });
  const cases = [
    ['src/a.js', "<span>{t.current_participants}/{t.max_participants}</span>", 1],
    ['src/b.js', "<p>{tournament.current_participants ?? 0}/{tournament.max_participants ?? '-'}</p>", 1],
    ['src/c.js', "  const max = t?.max_participants ?? 0;", 1],
    ['src/d.js', "<span>{slotsText(tt, t.current_participants, t.max_participants)}</span>", 0],
    ['src/e.js', "// never write {t.max_participants} by hand", 0],
    ['src/lib/slots.js', "const cap = Number(max_participants) || 0;", 0],
    ['src/f.js', "<span>{t.current_participants} entered</span>", 0],
  ];
  let failed = 0;
  for (const [name, body, expected] of cases) {
    const file = path.join(tmp, ...name.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body + '\n');
    const got = findSlots([file], tmp).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: expected ${expected}, got ${got}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const files = walk(path.join(FRONTEND, 'src'));
  const hits = findSlots(files);
  for (const h of hits) console.log(h);
  console.log(`${hits.length} hand-written slot count${hits.length === 1 ? '' : 's'} in ${files.length} files`);
  process.exit(hits.length ? 1 : 0);
}

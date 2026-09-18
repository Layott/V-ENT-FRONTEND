#!/usr/bin/env node
// No "(s)" in a sentence a person reads.
//
// "Paid 4 VC across 3 line(s)." reached the organiser's Money tab on
// 18 September 2026, was fixed, and the sweep that followed said there were no
// more. There were thirty: a notification title, the guest checkout's six
// refusals, the holds panel, the admin console's bulk actions, and eight
// dictionary keys whose French and Portuguese carried "(s)" even where the
// English did not. A "(s)" is a sentence nobody finished writing, and it reads
// worse in a language where the adjective agrees.
//
// What to write instead: `plural(tt, n, oneKey, one, manyKey, many)` from
// src/lib/plural.js on the frontend, `vent_auth.text.count(n, 'ticket')` or a
// sentence with no noun after the number on the server.
//
// Scans the dictionaries and every component string on the frontend, and every
// Python module in the backend apps. Skips tests, migrations, management
// commands (console output), comment lines and logger calls, because those are
// not screens.
//
//   node scripts/check-plurals.mjs
//   node scripts/check-plurals.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const BACKEND = path.resolve(FRONTEND, '..', 'V-ENT-BACKEND');

// "(s)" and its agreement cousins, INSIDE a string literal: `str(e)` and
// `_row(s)` are code, `'reader(s)'` is a sentence.
const PATTERN = /[\p{L}]\((?:s|es|ões|eis|ies|s\))\)/u;
const LITERALS = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

function literalsOf(line) {
  // A template literal's ${...} is code, not prose: `${formatDate(s)}`.
  return (line.match(LITERALS) || []).map((lit) => lit.replace(/\$\{[^}]*\}/g, ''));
}

function walk(dir, keep, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'migrations', 'venv', '__pycache__'].includes(entry.name)) continue;
      if (entry.name === 'commands' && full.includes('management')) continue;
      walk(full, keep, out);
    } else if (keep(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isSkippable(line, lang) {
  const t = line.trim();
  if (lang === 'py') {
    if (t.startsWith('#')) return true;
    if (/^logger\.|logging\.|\.debug\(|\.info\(|\.warning\(/.test(t)) return true;
    if (/^"""|^'''/.test(t)) return true;
  } else {
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return true;
  }
  return false;
}

export function findPlurals(files) {
  const hits = [];
  for (const file of files) {
    const lang = file.endsWith('.py') ? 'py' : 'js';
    const base = path.basename(file);
    if (lang === 'py' && /^tests?_|_tests?\.py$|^test_/.test(base)) continue;
    if (lang === 'js' && /\.test\.|\.spec\./.test(base)) continue;
    const text = fs.readFileSync(file, 'utf8');
    text.split(/\r?\n/).forEach((line, i) => {
      if (isSkippable(line, lang)) return;
      if (literalsOf(line).some((lit) => PATTERN.test(lit))) hits.push(`${path.relative(FRONTEND, file)}:${i + 1}: ${line.trim().slice(0, 110)}`);
    });
  }
  return hits;
}

function realFiles() {
  const js = walk(path.join(FRONTEND, 'src'), (n) => n.endsWith('.js'));
  const py = [];
  for (const app of ['vent_auth', 'vent_event', 'vent_tournament', 'vent_team', 'vent_cards', 'vent_billing', 'vent_marketplace', 'vent_anime']) {
    walk(path.join(BACKEND, app), (n) => n.endsWith('.py'), py);
  }
  return [...js, ...py];
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(FRONTEND, '.plurals-selftest-'));
  const cases = [
    ['bad.js', "const a = tt('x', '{n} ticket(s) left');", 1],
    ['bad_fr.js', "  'stall.sold': '{n} vendu(s)',", 1],
    ['bad_pt.js', "  'k': '{n} alteração(ões)',", 1],
    ['bad.py', "    message = 'Only %s ticket(s) left.' % n", 1],
    ['bad_match.js', "tt('k', '{n} match(es) will be forfeited')", 1],
    ['good.js', "plural(tt, n, 'k.one', '{n} ticket', 'k', '{n} tickets')", 0],
    ['good.py', "    return 'Held %s.' % _count(n, 'ticket')", 0],
    ['comment.js', "// the old '{n} ticket(s)' form is refused", 0],
    ['comment.py', "# 'ticket(s)' was a sentence nobody finished", 0],
    ['log.py', "    logger.info('attached %s guest ticket(s) to %s', n, who)", 0],
    ['tests_x.py', "        self.assertIn('ticket(s)', body)", 0],
    ['regex.js', "const re = /\\d+(s)?/;", 0],
  ];
  let failed = 0;
  for (const [name, body, expected] of cases) {
    const file = path.join(tmp, name);
    fs.writeFileSync(file, body + '\n');
    const got = findPlurals([file]).length;
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
  if (process.argv.includes('--self-test')) {
    process.exit(selfTest() ? 0 : 1);
  }
  const files = realFiles();
  const hits = findPlurals(files);
  for (const h of hits) console.log(h);
  console.log(`${hits.length} unfinished plural${hits.length === 1 ? '' : 's'} in ${files.length} files`);
  process.exit(hits.length ? 1 : 0);
}

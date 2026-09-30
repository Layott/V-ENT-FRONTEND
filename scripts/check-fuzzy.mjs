// The forgiving matcher, held to the cases it shares with the backend (inbox 383).
//
// src/lib/fuzzy.js and vent_auth/fuzzy.py are one algorithm written twice.
// Both are tested against the same fixture file, a copy of which lives in each
// repo; this fails when the frontend's matcher misses a case or when the two
// copies differ, because a name found on one screen must be found on every
// screen.
//
//   node scripts/check-fuzzy.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIN_SCORE, fuzzyFilter, score } from '../src/lib/fuzzy.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(HERE, '..', 'src', 'lib', 'fuzzy.fixtures.json');
const BACKENDS = ['V-ENT-BACKEND-flw', 'V-ENT-BACKEND']
  .map((dir) => path.join(HERE, '..', '..', dir, 'vent_auth', 'fuzzy_fixtures.json'));

const cases = JSON.parse(fs.readFileSync(FRONT, 'utf8'));
const faults = [];
for (const [q, t] of cases.match) {
  if (score(q, t) < MIN_SCORE) faults.push(`"${q}" should find "${t}" (scored ${score(q, t)})`);
}
for (const [q, t] of cases.none) {
  if (score(q, t) !== 0) faults.push(`"${q}" should not find "${t}" (scored ${score(q, t)})`);
}
for (const [q, expected] of cases.order) {
  const got = fuzzyFilter([...expected].reverse().concat(['Nothing Alike']).map((name) => ({ name })), q, ['name'])
    .map((row) => row.name);
  if (JSON.stringify(got) !== JSON.stringify(expected)) faults.push(`"${q}" ranked ${JSON.stringify(got)}`);
}
const backend = BACKENDS.find((p) => fs.existsSync(p));
if (backend) {
  const norm = (p) => JSON.stringify(JSON.parse(fs.readFileSync(p, 'utf8')));
  if (norm(backend) !== norm(FRONT)) faults.push(`fixtures differ from ${path.relative(path.join(HERE, '..', '..'), backend)}`);
}
for (const f of faults) console.log(`  ${f}`);
const total = cases.match.length + cases.none.length + cases.order.length;
console.log(`${total} shared case(s), ${faults.length} the browser matcher gets wrong${backend ? '' : ' (backend copy not found, parity not checked)'}`);
process.exit(faults.length ? 1 : 0);

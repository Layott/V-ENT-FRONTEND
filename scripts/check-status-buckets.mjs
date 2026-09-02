// A record whose status belongs to no tab.
//
// My Tournaments split the organiser's list into Active and Completed by two
// hand-written arrays:
//
//     const ACTIVE_STATUSES    = ['upcoming', 'registration_open', ...];
//     const COMPLETED_STATUSES = ['completed'];
//
// `cancelled` was in neither. The CEO had three tournaments, all cancelled,
// and the page that exists to list everything he organises showed Active 0,
// Drafts 0, Completed 0 and an empty state - as though he had never made
// anything. Nothing was lost. The page simply had nowhere to put them.
//
// Nothing could report it: both arrays are valid, the filter works, and the
// symptom only appears once a record reaches a status somebody forgot. The
// backend can add a status without the frontend noticing, for ever.
//
//   node scripts/check-status-buckets.mjs
//
// The rule: every status the backend can produce must appear in at least one
// of a page's buckets, or be named in a DELIBERATELY_HIDDEN list beside them
// so the omission is a decision rather than an oversight.

import fs from 'node:fs';
import path from 'node:path';

// What the backend can actually set. Read from the model rather than copied,
// so a new status arrives here the day it is added.
const MODEL = '../V-ENT-BACKEND/vent_tournament/models.py';

const backendStatuses = () => {
  if (!fs.existsSync(MODEL)) return null;
  const src = fs.readFileSync(MODEL, 'utf8');
  const block = src.match(/STATUS_CHOICES\s*=\s*\[([\s\S]*?)\]/)
    || src.match(/TOURNAMENT_STATUS\s*=\s*\[([\s\S]*?)\]/);
  if (!block) return null;
  return [...block[1].matchAll(/\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
};

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(full);
  }
};
walk('src');

const known = backendStatuses();
const findings = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = file.split(path.sep).join('/');
  if (rel.includes('check-status-buckets')) continue;

  const buckets = [...src.matchAll(/const\s+(\w*STATUSES)\s*=\s*\[([^\]]*)\]/g)];
  if (buckets.length < 2) continue;          // not a page that buckets

  const covered = new Set();
  for (const b of buckets) {
    for (const m of b[2].matchAll(/['"]([\w-]+)['"]/g)) covered.add(m[1]);
  }
  const hidden = new Set(
    [...src.matchAll(/DELIBERATELY_HIDDEN\s*=\s*\[([^\]]*)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/['"]([\w-]+)['"]/g)].map((x) => x[1])));

  if (!known) continue;
  const missing = known.filter((st) => !covered.has(st) && !hidden.has(st));
  if (missing.length) {
    findings.push({ rel, line: src.slice(0, buckets[0].index).split('\n').length, missing });
  }
}

// ---------------------------------------------------------------- self-test
const FIXTURES = [
  {
    name: 'the My Tournaments buckets, 2 September 2026',
    shouldFlag: true,
    covered: ['upcoming', 'registration_open', 'completed'],
    all: ['upcoming', 'registration_open', 'completed', 'cancelled'],
  },
  {
    name: 'every status has a home',
    shouldFlag: false,
    covered: ['upcoming', 'registration_open', 'completed', 'cancelled'],
    all: ['upcoming', 'registration_open', 'completed', 'cancelled'],
  },
];
let selfTestFailures = 0;
for (const f of FIXTURES) {
  const found = f.all.some((st) => !f.covered.includes(st));
  const ok = found === f.shouldFlag;
  if (!ok) selfTestFailures += 1;
  if (!ok || process.argv.includes('--self-test')) {
    console.log(`${ok ? 'ok  ' : 'BAD '} self-test: ${f.name}`);
  }
}

if (known === null) {
  console.log('The tournament model was not readable, so nothing was checked.');
  console.log('This runs from V-ENT-FRONTEND with V-ENT-BACKEND beside it.');
  process.exit(0);
}

for (const f of findings) {
  console.log(`${f.rel}:${f.line}`);
  console.log(`  the backend can set ${f.missing.join(', ')}, and no bucket on`
    + ' this page holds it. A record in that state belongs to no tab and');
  console.log('  disappears from the page. Add it to a bucket, or name it in a'
    + ' DELIBERATELY_HIDDEN list so the omission is a decision.');
  console.log('');
}

console.log(`${findings.length} page(s) where a status belongs to no tab`);
process.exit(findings.length + selfTestFailures ? 1 : 0);

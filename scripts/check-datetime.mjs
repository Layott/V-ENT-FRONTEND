// One timing model, actually checked.
//
// CEO, 6 September 2026: "remember the timing model should be across the entire
// site, people in ghana, should be seeing all set timings in their own times.
// everything that has to do with dates and timing shiuld pickk it from that
// timing model. add this as a rule and build a checker for it for the entire
// website so it runs it properly anywhere dates and timing are inputted."
//
//   node scripts/check-datetime.mjs
//   node scripts/check-datetime.mjs --self-test
//   node scripts/check-datetime.mjs --baseline
//
// ## What it is looking for
//
// Two faults, and the first is the one that survives longest because it looks
// fine:
//
//   new Date(iso).toLocaleDateString()        <- the BROWSER's language
//
// Passing no locale does not mean "the default". It means whatever language the
// device is set to, so a reader who chose Portuguese on the site gets English
// dates on an English phone, and the page looks correct to whoever built it.
// That is `feedback_undefined_locale_is_a_locale`, and grep never found it
// because there is nothing to grep for: the bug is an ARGUMENT THAT IS NOT
// THERE.
//
//   new Date(iso).toLocaleDateString('en-GB') <- somebody else's language
//
// The loud one. A hardcoded locale was in 28 files before `appLocale` existed.
//
// ## Calibration, which is most of the work
//
// `toLocaleString` is also how you format a NUMBER, and `total.toLocaleString()`
// is roughly half of all the call sites on this site. Counting those as timing
// faults would put the number over two hundred, and a checker reporting two
// hundred things is a checker nobody runs - which is the lesson
// `feedback_checker_calibration` records after two checkers reported 63 and 50
// when the real answers were 9 and 10.
//
// So this grades. A call is a DATE fault only when the receiver is date-shaped:
// a `new Date(...)`, or an identifier whose name says it is a time. Everything
// else is reported as a number-formatting note and does not fail the build.
//
// Both halves of that judgement are in the self-test, so the calibration cannot
// quietly drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(HERE, 'datetime-baseline.json');

// The module that IS the timing model. It is allowed to call toLocale*,
// because something has to.
const THE_MODEL = ['src/lib/datetime.js', 'src\\lib\\datetime.js'];

// A receiver whose name says it holds a moment. Deliberately generous on the
// left (any of these words anywhere in the identifier) and anchored on the
// right, so `created_at`, `startDate`, `t.checked_in_at` and `purchasedAt` all
// count while `total`, `count` and `price` do not.
const DATEY = new RegExp(
  '(' +
  '_at|At|_date|Date|_time|Time|_on|deadline|Deadline|' +
  'timestamp|Timestamp|expires|Expires|since|Since' +
  ')$'
);

/** Is the thing being formatted a date, a number, or unknown? */
function receiverKind(before) {
  // `new Date(...)` immediately to the left, however long the argument was.
  if (/new\s+Date\s*\([^;]*\)\s*$/.test(before)) return 'date';

  // The last identifier or property access before the dot.
  const m = before.match(/([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\s*$/);
  if (!m) return 'unknown';
  const tail = m[1].split(/\??\./).pop();
  if (DATEY.test(tail)) return 'date';
  if (/^(total|count|n|num|amount|price|balance|coins|qty|quantity|sold|size|len|length)$/i
      .test(tail)) return 'number';
  return 'unknown';
}

const RULES = [
  {
    id: 'date-no-locale',
    severity: 'severe',
    why: 'a date formatted with no locale takes the BROWSER language, not the one the reader chose',
    fix: "import { formatDateTime } from '@/lib/datetime'",
  },
  {
    id: 'date-hardcoded-locale',
    severity: 'severe',
    why: 'a hardcoded locale shows one language to every reader',
    fix: "import { formatDateTime } from '@/lib/datetime'",
  },
  {
    id: 'number-no-locale',
    severity: 'note',
    why: 'a number formatted with no locale uses the browser language for separators',
    fix: "import { formatNumber } from '@/lib/datetime'",
  },
];

const CALL = /\.toLocale(String|DateString|TimeString)\s*\(([^)]*)\)/g;

export function findingsIn(source, file) {
  if (THE_MODEL.some((p) => file.endsWith(p))) return [];

  const out = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((text, i) => {
    // A comment explaining the rule is not a breach of it.
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
    // An explicit, justified exception, same shape check-design.mjs uses.
    if (i > 0 && /datetime-allow/.test(lines[i - 1])) return;

    CALL.lastIndex = 0;
    let m;
    while ((m = CALL.exec(text)) !== null) {
      const args = m[2].trim();
      const before = text.slice(0, m.index);
      const kind = m[1] === 'String' ? receiverKind(before) : 'date';

      let id = null;
      if (kind === 'date') {
        // `toLocaleDateString()` and `toLocaleTimeString()` are always dates
        // whatever the receiver looks like.
        if (args === '') id = 'date-no-locale';
        else if (/^['"`]/.test(args)) id = 'date-hardcoded-locale';
        // appLocale() or a variable: already going through the model's idea of
        // the language. Not a finding.
      } else if (kind === 'number') {
        if (args === '') id = 'number-no-locale';
      }
      // 'unknown' receivers are left alone deliberately. Guessing produces
      // exactly the false positives that make a checker ignorable.

      if (id) {
        out.push({
          file, line: i + 1, id,
          severity: RULES.find((r) => r.id === id).severity,
          text: text.trim().slice(0, 120),
        });
      }
    }
  });

  return out;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, acc);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// --------------------------------------------------------------- self-test
//
// A checker that reports 0 has two meanings - clean, or broken - and nothing
// tells them apart. This is what tells them apart. Every case is a real shape
// from this codebase.

const CASES = [
  // The fault the CEO is asking about, in its quiet form.
  ['severe', 'date-no-locale',
   'const when = new Date(t.checked_in_at).toLocaleString();'],
  ['severe', 'date-no-locale',
   '{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}'],
  ['severe', 'date-no-locale',
   '{e.start_date ? new Date(e.start_date).toLocaleDateString() : "-"}'],
  ['severe', 'date-no-locale',
   'row.purchasedAt.toLocaleTimeString()'],
  // The loud form.
  ['severe', 'date-hardcoded-locale',
   "new Date(iso).toLocaleDateString('en-GB')"],
  ['severe', 'date-hardcoded-locale',
   'new Date(iso).toLocaleString("en-US", { hour: "2-digit" })'],

  // CALIBRATION, the half that keeps this usable. None of these is a finding.
  ['clean', null, 'new Date(iso).toLocaleDateString(appLocale())'],
  ['clean', null, 'new Date(iso).toLocaleString(appLocale(), { day: "numeric" })'],
  ['clean', null, 'new Date(iso).toLocaleDateString(locale)'],
  ['clean', null, 'formatDateTime(t.checked_in_at)'],
  ['clean', null, '// new Date(x).toLocaleDateString() in a comment is not a breach'],
  ['clean', null, 'const n = someUnknownThing.toLocaleString();'],

  // A number is a note, never a failure. `total.toLocaleString()` appears all
  // over the admin console and is not what was asked about.
  ['note', 'number-no-locale', '{total.toLocaleString()} entries'],
  ['note', 'number-no-locale', '{count.toLocaleString()}'],
];

function selfTest() {
  let failed = 0;

  CASES.forEach(([expected, id, line], n) => {
    const found = findingsIn(line, 'src/app/probe/page.js');
    if (expected === 'clean') {
      if (found.length !== 0) {
        console.error(`FAIL case ${n}: expected clean, got ${found[0].id}`);
        console.error(`      ${line}`);
        failed++;
      }
      return;
    }
    const hit = found.find((f) => f.id === id);
    if (!hit) {
      console.error(`FAIL case ${n}: expected ${id}, got ${found.map(f => f.id).join(',') || 'nothing'}`);
      console.error(`      ${line}`);
      failed++;
    } else if (hit.severity !== expected) {
      console.error(`FAIL case ${n}: ${id} graded ${hit.severity}, expected ${expected}`);
      failed++;
    }
  });

  // The model itself must be exempt, or it can never be written at all.
  if (findingsIn('x.toLocaleString();', 'src/lib/datetime.js').length !== 0) {
    console.error('FAIL: the timing model itself must be exempt');
    failed++;
  }

  // And an explicit exception must work, or there is no escape hatch and
  // somebody will delete the checker instead of using it.
  const allowed = findingsIn(
    '// datetime-allow: OBS reads this in the venue clock\nnew Date(x).toLocaleString()',
    'src/app/probe/page.js');
  if (allowed.length !== 0) {
    console.error('FAIL: a datetime-allow comment must grant an exception');
    failed++;
  }

  if (failed) {
    console.error(`\n${failed} self-test case(s) failed.`);
    process.exit(1);
  }
  console.log(`self-test passed: ${CASES.length} cases, both directions.`);
}

// -------------------------------------------------------------------- main

const RUN_DIRECTLY = process.argv[1] && process.argv[1].endsWith('check-datetime.mjs');

if (RUN_DIRECTLY) {
  if (process.argv.includes('--self-test')) {
    selfTest();
  } else {
    main();
  }
}

function main() {
  const findings = [];
  for (const file of walk(SRC)) {
    findings.push(...findingsIn(fs.readFileSync(file, 'utf8'),
                                path.relative(ROOT, file)));
  }

  const key = (f) => `${f.file}:${f.id}:${f.line}`;
  const severe = findings.filter((f) => f.severity === 'severe');
  const notes = findings.filter((f) => f.severity === 'note');

  if (process.argv.includes('--baseline')) {
    fs.writeFileSync(BASELINE,
                     JSON.stringify([...new Set(severe.map(key))].sort(), null, 2));
    console.log(`Recorded ${severe.length} existing timing breaches as the baseline.`);
    console.log('New ones fail from here. The list itself is work to do.');
    process.exit(0);
  }

  let known = new Set();
  try { known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); } catch { /* none yet */ }

  const fresh = severe.filter((f) => !known.has(key(f)));

  if (fresh.length) {
    console.error(`${fresh.length} NEW timing breach(es):\n`);
    for (const f of fresh.slice(0, 40)) {
      const rule = RULES.find((r) => r.id === f.id);
      console.error(`  ${f.file}:${f.line}  [${f.id}] ${rule.why}`);
      console.error(`      ${f.text}`);
      console.error(`      -> ${rule.fix}`);
    }
    console.error('\nEvery date and time on this site renders through');
    console.error('src/lib/datetime.js, so a reader in Accra sees their own clock');
    console.error('in the language they chose. See the timing model rule in');
    console.error('CLAUDE.md. A genuine exception takes a');
    console.error('/* datetime-allow: why */ comment on the line above.');
    process.exit(1);
  }

  console.log(`0 new timing breaches. ${severe.length} known severe, being worked down.`);
  if (process.argv.includes('--notes')) {
    for (const n of notes) console.log(`${n.file}:${n.line}  ${n.id}`);
  }
  console.log(`${notes.length} number-formatting notes, which do not fail the build.`);
}

#!/usr/bin/env node
// One naira sign across the site.
//
// CEO, 12 November 2026 (inbox 594-30), on the Apple review note P162-2 that
// "N" and the naira sign both appeared: "Use the main naira sign". An amount
// is written with the naira sign in front of it: the sign, then the number.
// A currency CODE in a currency picker ("NGN - Nigerian Naira", a select
// value of 'NGN') is a code, not an amount, and is left alone; so is the word
// "naira" in a sentence.
//
// What fails, in any .js under src (the French and Portuguese blocks of the
// dictionary are skipped while their pass is owed, English first):
//   - an amount followed by NGN:  `${formatNumber(x)} NGN`, {total} NGN</span>,
//     formatNumber(x) + ' NGN', "1,000 NGN", "{ngn} NGN"
//   - a bare N in front of an amount: "N5,000", 'N' + amount, `N${amount}`
// A line can opt out with a trailing `// naira-ok: <reason>`.
//
//   node scripts/check-naira.mjs              # "naira sign: N problems"
//   node scripts/check-naira.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');

const RULES = [
  [/\}\s?NGN\b(?![_A-Za-z])/, 'an amount followed by NGN'],
  [/\+\s*['"`]\s?NGN['"`]/, 'NGN added after an amount'],
  [/[0-9]\s?NGN\b/, 'a number followed by NGN'],
  [/\{(ngn|amount|n|total|price|fee)\}\s?NGN\b/, 'a placeholder followed by NGN'],
  [/['"`>(\s]N[0-9]{1,3}(,[0-9]{3})+\b/, 'a bare N in front of an amount'],
  [/['"`>(\s]N[0-9]+[kK]\b/, 'a bare N in front of an amount'],
  [/['"]N['"]\s*\+/, 'a bare N joined to an amount'],
  [/`N\$\{/, 'a bare N in front of an amount'],
];

function problemsIn(text, file = 'fixture.js') {
  const out = [];
  const lines = text.split(/\r?\n/);
  let inOtherLanguage = false;
  lines.forEach((line, i) => {
    // The dictionary: English is checked, French and Portuguese wait for their pass.
    if (/^ {2}(fr|pt): \{/.test(line)) inOtherLanguage = true;
    if (/^ {2}en: \{/.test(line)) inOtherLanguage = false;
    if (inOtherLanguage) return;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/\/\/\s*naira-ok:/.test(line)) return;
    const code = line.replace(/\/\/.*$/, '');
    for (const [rx, what] of RULES) {
      if (rx.test(code)) {
        out.push(`${file}:${i + 1}: ${what}: ${trimmed.slice(0, 110)}`);
        break;
      }
    }
  });
  return out;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === 'node_modules') continue;
      yield* walk(full);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
      yield full;
    }
  }
}

function run() {
  const problems = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    problems.push(...problemsIn(fs.readFileSync(file, 'utf8'), rel));
  }
  for (const p of problems) console.log('  ' + p);
  console.log(`naira sign: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const N = '₦';
  const cases = [
    // What shipped before 594-30, each must be caught.
    ['template amount then NGN', 'const m = `${formatNumber(ngn)} NGN (${vc} VC)`;', 1],
    ['JSX amount then NGN', '<span>{formatNumber(fee)} NGN</span>', 1],
    ['NGN added on', "x.replace('{ngn}', formatNumber(open) + ' NGN')", 1],
    ['a sentence with a number then NGN', "tt('k', '1,000 NGN = 1 VC.')", 1],
    ['a placeholder then NGN', "'which is {ngn} NGN.'", 1],
    ['a bare N amount', 'prize: "N1,000,000",', 1],
    ['a bare N in thousands', "label: 'From N50k'", 1],
    ['N joined on', "const s = 'N' + formatNumber(x);", 1],
    ['N template', 'const s = `N${formatNumber(x)}`;', 1],
    // What is allowed.
    ['the naira sign in front', `const s = \`${N}\${formatNumber(x)}\`;`, 0],
    ['a currency code in a picker', "<option value=\"NGN\">{tt('k', 'NGN - Nigerian Naira')}</option>", 0],
    ['a code compared', "if (row.code !== 'NGN') return;", 0],
    ['the word naira', "tt('k', '{n} naira owed to you')", 0],
    ['a comment', '// Conversion rate - 1000 NGN = 1 VENT COIN.', 0],
    ['an opt-out with a reason', "const s = `${n} NGN`; // naira-ok: an export header the bank reads", 0],
    ['a key name with ngn', "const total = priced.total_ngn;", 0],
    ['French block skipped', "  fr: {\n    'k': '{ngn} NGN.',", 0],
    ['English block after French is checked again', "  fr: {\n    'a': '{ngn} NGN.',\n  en: {\n    'b': '{ngn} NGN.',", 1],
  ];
  let failed = 0;
  for (const [label, text, want] of cases) {
    const got = problemsIn(text).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} (want ${want}, got ${got})`);
  }
  console.log(failed ? `naira sign self-test: ${failed} FAILED` : `naira sign self-test: ${cases.length} cases OK`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else run();

#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * A route is compared without its language.
 *
 * French and Portuguese addresses carry a prefix (/fr/home) that middleware
 * rewrites away, so usePathname() answers "/fr/home" on a page that is /home.
 * Compared with "/home" that is false, and it has shipped three times:
 *
 *   - SessionExpiryGuard read "/fr/admin", found it did not start with
 *     "/admin", and signed an admin out of the whole site;
 *   - four files then stripped the prefix by hand, each with its own pattern;
 *   - 12 October 2026 (inbox 433): no menu marked the page you were on in French
 *     or Portuguese, and the console's page guard matched no section at
 *     /fr/admin/admins, so a moderator reading in French got the screen.
 *
 * So two things fail here:
 *
 *   1. usePathname() outside src/lib/routePath.js (useRoutePath, the route with
 *      the language taken off) and the files named in VISIBLE_ADDRESS, which
 *      need the address as the reader sees it, each with the reason.
 *   2. A hand-rolled language pattern, /^\/(fr|pt).../ or /^\/(en|fr|pt).../,
 *      anywhere but src/lib/locale.js, where splitLocale lives.
 *
 * Comments are not code: a sentence about usePathname() is not a call to it.
 *
 * Usage: node scripts/check-route-path.mjs [--self-test]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'src');

const HOOK = 'src/lib/routePath.js';
const LOCALE = 'src/lib/locale.js';

// Files that need the address as the reader sees it, language included.
const VISIBLE_ADDRESS = {
  'src/i18n/LanguageProvider.js': 'reads the language out of the address',
  'src/app/events/scan/page.js': 'router.replace rewrites the query and must keep the address, language and all',
  'src/components/community/SignInToEngage.js': 'next= sends the reader back to the address they were on, in their language',
  'src/components/view-tournament/tournament-register/payment/Payment.js': 'router.replace back to the address the payment left from',
};

const CALL = /\busePathname\s*\(/;
const HAND_ROLLED = /\^\\\/\((?:en\|)?fr\|pt\)/;

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Problems in one file, given its path relative to the repo root. */
export function scan(rel, source) {
  const code = withoutComments(source);
  const problems = [];
  if (rel !== HOOK && !(rel in VISIBLE_ADDRESS) && CALL.test(code)) {
    problems.push(`${rel}: usePathname() compares the address, language and all; use useRoutePath() from @/lib/routePath, or name the file in VISIBLE_ADDRESS with the reason it needs the address`);
  }
  if (rel !== LOCALE && HAND_ROLLED.test(code)) {
    problems.push(`${rel}: a hand-rolled language pattern; use splitLocale() from @/lib/locale`);
  }
  return problems;
}

function jsFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'generated' || e.name === 'node_modules') continue;
      jsFiles(full, out);
    } else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

function selfTest() {
  const cases = [
    ['caught: a raw call in a menu', 'src/components/x/Menu.js',
      "const pathname = usePathname();\nconst on = pathname.startsWith('/home');", 1],
    ['caught: the (fr|pt) strip', 'src/components/x/Tour.js',
      "const here = p.replace(/^\\/(fr|pt)(?=\\/|$)/, '') || '/';", 1],
    ['caught: the (en|fr|pt) strip', 'src/components/x/Help.js',
      "const path = String(p).replace(/^\\/(en|fr|pt)(?=\\/|$)/, '');", 1],
    ['caught: both in one file', 'src/components/x/Both.js',
      "const a = usePathname();\nconst b = a.replace(/^\\/(fr|pt)(?=\\/|$)/, '');", 2],
    ['left alone: the hook', HOOK, 'return splitLocale(usePathname() || "/").path;', 0],
    ['left alone: a named visible-address file', 'src/components/community/SignInToEngage.js',
      "const pathname = usePathname() || '/community';", 0],
    ['left alone: locale.js owns the pattern', LOCALE, "x.replace(/^\\/(fr|pt)(?=\\/|$)/, '')", 0],
    ['left alone: useRoutePath', 'src/components/x/Menu.js', 'const pathname = useRoutePath();', 0],
    ['left alone: a comment about usePathname()', 'src/components/x/Note.js',
      '// usePathname() is for the visible address only\n/* or usePathname() here */\nconst a = 1;', 0],
  ];
  let failed = 0;
  for (const [name, rel, source, expected] of cases) {
    const got = scan(rel, source).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${got} of ${expected})`);
  }
  // The named files must still exist and still need it, or the list is stale.
  for (const rel of Object.keys(VISIBLE_ADDRESS)) {
    const full = path.join(ROOT, rel);
    const live = fs.existsSync(full) && CALL.test(withoutComments(fs.readFileSync(full, 'utf8')));
    if (!live) { failed += 1; console.log(`FAIL stale VISIBLE_ADDRESS entry: ${rel}`); }
  }
  console.log(failed ? `self-test: ${failed} failed` : 'self-test: all cases pass');
  if (failed) process.exit(1);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const problems = jsFiles(SRC).flatMap((full) =>
    scan(path.relative(ROOT, full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8')));
  console.log(`route path: ${problems.length} problems`);
  if (problems.length) {
    for (const p of problems) console.log(`  ${p}`);
    process.exit(1);
  }
}

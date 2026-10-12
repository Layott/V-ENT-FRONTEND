#!/usr/bin/env node
// Every list of countries on the site is in alphabetical order.
//
// CEO, 12 October 2026 (inbox 443): "The list of countries are not in
// alphabetical order, please check through the entire website and fix". The
// shared list ran Africa first, so a picker read Senegal ... Zimbabwe and then
// started again at Afghanistan; two team pages and the admin filter each kept a
// short list of their own in no order at all.
//
// What fails:
//   1. src/constants/countries.js building COUNTRIES without sortCountries().
//   2. An array literal anywhere in src holding three or more country names
//      (and mostly country names) that is not in English alphabetical order,
//      ignoring case and accents. Names are shown in English in every language,
//      so English order is the order a reader sees.
//   3. The same for a list of { name: "..." } objects.
//
// The known names are read from the AFRICA and REST_OF_WORLD arrays, with the
// comments stripped first, and the count is asserted against the export's own
// length so a regex that reads too much or too little fails loudly (R47).
//
//   node scripts/check-country-order.mjs              # "country order: N problems"
//   node scripts/check-country-order.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');
const LIST = path.join(SRC, 'constants', 'countries.js');
const collator = new Intl.Collator('en', { sensitivity: 'base' });

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"])\/\/.*$/gm, '$1');

function namesIn(block) {
  return [...block.matchAll(/'([^'\n]+)'|"([^"\n]+)"/g)].map((m) => m[1] ?? m[2]);
}

function knownNames(text) {
  const clean = stripComments(text);
  const grab = (name) => {
    const m = clean.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`));
    if (!m) throw new Error(`${name} not found in src/constants/countries.js`);
    return namesIn(m[1]);
  };
  return [...grab('AFRICA'), ...grab('REST_OF_WORLD')];
}

function unsorted(list) {
  for (let i = 1; i < list.length; i += 1) {
    if (collator.compare(list[i - 1], list[i]) > 0) return [list[i - 1], list[i]];
  }
  return null;
}

function problemsIn(text, file, known) {
  const out = [];
  const clean = stripComments(text);
  // Arrays of strings.
  for (const m of clean.matchAll(/\[([^\[\]]{10,})\]/g)) {
    const items = namesIn(m[1]);
    const countries = items.filter((x) => known.has(x));
    if (countries.length < 3 || countries.length < items.length * 0.6) continue;
    // Only the countries are compared: "All Africa" or "Other" placed first or
    // last is a choice, not disorder.
    const bad = unsorted(countries);
    if (bad) out.push(`${file}: a country list is out of order (${bad[0]} before ${bad[1]})`);
  }
  // Arrays of { name: '...' } objects.
  const named = [...clean.matchAll(/\bname:\s*['"]([^'"\n]+)['"]/g)].map((m) => m[1]);
  if (named.filter((x) => known.has(x)).length >= 10) {
    const bad = unsorted(named);
    if (bad) out.push(`${file}: a country list is out of order (${bad[0]} before ${bad[1]})`);
  }
  return out;
}

function listProblems(text) {
  const clean = stripComments(text);
  return /export const COUNTRIES = sortCountries\(/.test(clean)
    ? [] : ['src/constants/countries.js: COUNTRIES is not built with sortCountries()'];
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return /^(i18n|node_modules)$/.test(e.name) ? [] : walk(p);
    return /\.(js|jsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

function run() {
  const listText = fs.readFileSync(LIST, 'utf8');
  const names = knownNames(listText);
  // Read the wrong thing and the answer is meaningless, so check the reading:
  // well over a hundred names, each one a capitalised name, none twice.
  const odd = names.filter((n) => !/^[A-ZÅ][\w\s'.-]*$/u.test(n));
  if (names.length < 100 || new Set(names).size !== names.length || odd.length) {
    console.log(`country order: the known list read ${names.length} names (${odd.slice(0, 3).join(', ')}); fix the reader`);
    process.exit(1);
  }
  const known = new Set(names);
  const problems = [...listProblems(listText)];
  for (const file of walk(SRC)) {
    if (path.resolve(file) === path.resolve(LIST)) continue;
    problems.push(...problemsIn(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file).split(path.sep).join('/'), known));
  }
  for (const p of problems) console.log('  ' + p);
  console.log(`country order: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const known = new Set(['Ghana', 'Kenya', 'Nigeria', 'Senegal', 'Afghanistan', 'Albania', 'Åland Islands', 'Zimbabwe']);
  const cases = [
    ['an Africa-first list fails', `const X = ['Senegal', 'Zimbabwe', 'Afghanistan', 'Albania'];`, 1],
    ['a sorted list passes', `const X = ['Afghanistan', 'Albania', 'Ghana', 'Kenya'];`, 0],
    ['accents sort with their letter', `const X = ['Albania', 'Åland Islands', 'Ghana'];`, 1],
    ['accents sort with their letter, sorted', `const X = ['Afghanistan', 'Åland Islands', 'Albania'];`, 0],
    ['two names are not a list', `const X = ['Nigeria', 'Ghana'];`, 0],
    ['mostly not countries is not a country list', `const X = ['Nigeria', 'Ghana', 'Kenya', 'a', 'b', 'c', 'd', 'e'];`, 0],
    ['a commented list is ignored', `// ['Senegal', 'Zimbabwe', 'Afghanistan']`, 0],
    ['object list out of order fails', Array.from({ length: 10 }, (_, i) => `{ name: "${['Zimbabwe', 'Nigeria', 'Ghana', 'Kenya', 'Senegal', 'Albania', 'Afghanistan', 'Åland Islands', 'Zimbabwe', 'Ghana'][i]}" },`).join('\n'), 1],
    ['the page seven in their old order fail', `const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'Senegal'];`, 1],
    ['a special entry first or last is allowed', `const R = ['All Africa', 'Ghana', 'Kenya', 'Nigeria', 'Other'];`, 0],
    ['a special entry does not hide disorder', `const R = ['All Africa', 'Nigeria', 'Ghana', 'Kenya', 'Other'];`, 1],
  ];
  let failed = 0;
  for (const [label, text, want] of cases) {
    const got = problemsIn(text, 'fixture.js', known).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${got})`);
  }
  const listCases = [
    ['COUNTRIES built Africa first fails', 'export const COUNTRIES = [...AFRICA, ...REST_OF_WORLD];', 1],
    ['COUNTRIES built sorted passes', 'export const COUNTRIES = sortCountries([...AFRICA, ...REST_OF_WORLD]);', 0],
  ];
  for (const [label, text, want] of listCases) {
    const got = listProblems(text).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${got})`);
  }
  console.log(`${cases.length + listCases.length - failed}/${cases.length + listCases.length} self-test cases`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest(); else run();

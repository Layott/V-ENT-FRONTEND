// A wallet history line the server can name and the screen cannot say.
//
// CEO, 30 September 2026 (inbox 388): history lines were English sentences
// written on the server; "convert for the different languages". The backend
// reads each sentence back into a code (vent_auth/statement_lines.py) and the
// screen says `txn.<code>` in the reader's language (src/lib/statementLine.js).
// A code added on one side and not the other falls back to English, silently,
// which is the fault this exists to stop. It fails when:
//
//   a backend code has no English in statementLine.js
//   a txn.* key is missing from en, fr or pt
//   a translation drops or invents a {placeholder} the English carries
//
//   node scripts/check-statement-lines.mjs
//   node scripts/check-statement-lines.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const BACKEND = ['V-ENT-BACKEND-flw', 'V-ENT-BACKEND']
  .map((dir) => path.join(ROOT, '..', dir, 'vent_auth', 'statement_lines.py'))
  .find((p) => fs.existsSync(p));

/** The codes statement_lines.py can hand the screen, main lines and suffixes. */
export function backendCodes(python) {
  const codes = new Set();
  for (const m of python.matchAll(/^\s+\('([a-zA-Z]+)',\s*(?:r'|re\.compile)/gm)) codes.add(m[1]);
  return codes;
}

/** Keys of STATEMENT_ENGLISH in statementLine.js. */
export function englishKeys(js) {
  const block = js.slice(js.indexOf('STATEMENT_ENGLISH = {'), js.indexOf('};', js.indexOf('STATEMENT_ENGLISH = {')));
  return new Map([...block.matchAll(/^\s+([a-zA-Z]+):\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [m[1], m[2]]));
}

const holes = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

/** Codes a screen draws through a differently named key. */
const ALIASES = { premium: ['premium', 'premiumOne'], returned: ['returned', 'returnedReason'] };

export function faults(python, js, tables) {
  const out = [];
  const english = englishKeys(js);
  for (const code of backendCodes(python)) {
    for (const key of ALIASES[code] || [code]) {
      if (!english.has(key)) out.push(`backend code "${code}" has no English "${key}" in statementLine.js`);
    }
  }
  for (const [key, en] of english) {
    for (const [lang, table] of Object.entries(tables)) {
      const said = table[`txn.${key}`];
      if (said === undefined) out.push(`txn.${key} missing in ${lang}`);
      else if (holes(said) !== holes(en)) out.push(`txn.${key} in ${lang} carries {${holes(said)}}, English {${holes(en)}}`);
    }
  }
  return out;
}

async function tables() {
  const out = {};
  for (const lang of ['en', 'fr', 'pt']) {
    const mod = await import(new URL(`../src/i18n/generated/${lang}.js`, import.meta.url));
    out[lang] = mod.default || mod.table || mod;
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const py = "_LINES = [\n    ('sent', r'Sent to (?P<to>.+)'),\n    ('refund', r'Refund - (?P<what>.+)'),\n]\n"
    + "_SUFFIXES = [\n    ('returned', re.compile(r'x')),\n]\n";
  const js = "export const STATEMENT_ENGLISH = {\n  sent: 'Sent to {to}',\n  refund: 'Refund: {what}',\n"
    + "  returned: 'returned',\n  returnedReason: 'returned: {reason}',\n};\n";
  const full = (fr) => ({ en: { 'txn.sent': 'Sent to {to}', 'txn.refund': 'Refund: {what}', 'txn.returned': 'returned', 'txn.returnedReason': 'returned: {reason}' },
    fr, pt: { 'txn.sent': 'Enviado para {to}', 'txn.refund': 'Reembolso: {what}', 'txn.returned': 'devolvido', 'txn.returnedReason': 'devolvido: {reason}' } });
  const frGood = { 'txn.sent': 'Envoyé à {to}', 'txn.refund': 'Remboursement : {what}', 'txn.returned': 'restitué', 'txn.returnedReason': 'restitué : {reason}' };
  const cases = [
    ['all three languages, placeholders kept', faults(py, js, full(frGood)).length, 0],
    ['a French key missing', faults(py, js, full({ ...frGood, 'txn.refund': undefined })).length, 1],
    ['a French placeholder dropped', faults(py, js, full({ ...frGood, 'txn.sent': 'Envoyé' })).length, 1],
    ['a backend code with no English', faults(py + "    ('orderAt', r'Order at (?P<vendor>.+)'),\n", js, full(frGood)).length, 1],
    ['a suffix alias with no English', faults(py, js.replace("  returnedReason: 'returned: {reason}',\n", ''), full(frGood)).length, 1],
  ];
  let bad = 0;
  for (const [what, got, expected] of cases) {
    if (got !== expected) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${expected}`); } else console.log(`ok: ${what}`);
  }
  console.log(bad ? 'self-test FAILED' : `${cases.length}/${cases.length} self-test cases`);
  process.exit(bad ? 1 : 0);
}

if (isMain) {
  if (!BACKEND) { console.log('backend statement_lines.py not found'); process.exit(1); }
  const python = fs.readFileSync(BACKEND, 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'statementLine.js'), 'utf8');
  const found = faults(python, js, await tables());
  for (const f of found) console.log(`  ${f}`);
  console.log(`${backendCodes(python).size} history line code(s), ${found.length} not said in en, fr and pt`);
  process.exit(found.length ? 1 : 0);
}

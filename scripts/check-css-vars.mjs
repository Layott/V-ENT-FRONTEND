#!/usr/bin/env node
/**
 * A CSS variable that does not exist, and the one that means the opposite of
 * what its name suggests.
 *
 * CEO, 7 September 2026: "There is also a lot of white background that looks
 * off o both the pricing and feedback pages."
 *
 *   node scripts/check-css-vars.mjs
 *   node scripts/check-css-vars.mjs --self-test
 *
 * ## Two faults, both silent, both shipped on the same page
 *
 * **1. `--primary-bg` is WHITE, and it is not a background.**
 *
 *     --primary-bg: #FFFFFF;
 *
 * On a dark site. It is used throughout globals.css as a TEXT colour on dark
 * surfaces (`color: var(--primary-bg)` appears dozens of times), and the actual
 * page ground is the literal `#131316`. So a page written the obvious way -
 * `background-color: var(--primary-bg)` - comes out white, and the CEO saw
 * exactly that on two new pages.
 *
 * The name is the trap. Nothing about `--primary-bg` suggests "the colour of
 * text on a panel", and every new page is written by somebody reading the name.
 *
 * **2. A variable that was never defined resolves to nothing.**
 *
 * `--v-ent-grn` is named in three CLAUDE.md files as the primary green. It has
 * never existed in globals.css; the real token is `--v-ent-success`. Five rules
 * referenced it, so five colours were silently unset: a green chip with no
 * fill, a headline with no colour. CSS does not warn, it just drops the
 * declaration, which is the same class of quiet failure as an undefined class
 * name resolving to `undefined`. See [[feedback_missing_css_class_looks_like_missing_data]].
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'src');
const GLOBALS = path.join(SRC, 'app', 'globals.css');
const BASELINE = path.join(HERE, 'css-vars-baseline.json');

/** Every custom property globals.css actually defines. */
export function definedVars(css) {
  const out = new Set();
  for (const m of css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) out.add(m[1]);
  return out;
}

/** A background painted with a variable whose name says "text colour here". */
const BG_WITH_TEXT_VAR =
  /(?:background|background-color)\s*:\s*[^;]*var\(\s*(--primary-bg|--primary-text|--white|--black)\b/;

export function findingsIn(css, file, defined) {
  const out = [];
  css.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(\/\*|\*)/.test(line)) return;
    if (/css-vars-allow/.test(line)) return;

    // 1. Undefined variable, with no fallback to save it.
    for (const m of line.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
      if (!defined.has(m[1])) {
        out.push({
          file, line: i + 1, id: 'undefined-css-var',
          why: `${m[1]} is not defined in globals.css, so this declaration is dropped`,
          text: line.trim().slice(0, 110),
        });
      }
    }

    // 2. `--primary-bg` used as a background on a dark site.
    if (BG_WITH_TEXT_VAR.test(line)) {
      out.push({
        file, line: i + 1, id: 'text-var-as-background',
        why: '--primary-bg is #FFFFFF and is used as a TEXT colour here. '
           + 'The page ground is #131316',
        text: line.trim().slice(0, 110),
      });
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
    } else if (/\.css$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const FIXTURE_DEFINED = new Set(['--primary-bg', '--overlay-gray', '--v-ent-success', '--white']);

const CASES = [
  ['bad', '  color: var(--v-ent-grn);', 'a token that was never defined'],
  ['bad', '  background-color: var(--primary-bg);', 'white, on a dark site'],
  ['bad', '.pageContainer { background: var(--primary-bg); }', 'the same, shorthand'],
  ['clean', '  color: var(--primary-bg);', 'text colour, which is what it is for'],
  ['clean', '  background-color: var(--overlay-gray);', 'a real surface token'],
  ['clean', '  color: var(--v-ent-success);', 'the real green'],
  ['clean', '  background-color: #131316;', 'the literal page ground'],
  ['clean', '  color: var(--v-ent-gold, #d4af37);', 'undefined but with a fallback'],
  ['clean', '/* background: var(--primary-bg); in a comment */', 'a comment is not code'],
];

function selfTest() {
  let failed = 0;
  CASES.forEach(([expect, line, label], n) => {
    const found = findingsIn(line, 'src/app/probe/probe.module.css', FIXTURE_DEFINED);
    if ((expect === 'bad') !== (found.length > 0)) {
      console.error(`FAIL case ${n} (${label}): expected ${expect}`);
      console.error(`      ${line}`);
      failed++;
    }
  });
  if (failed) {
    console.error(`\n${failed} self-test case(s) failed.`);
    process.exit(1);
  }
  console.log(`self-test passed: ${CASES.length} cases, both directions.`);
}

const RUN = process.argv[1] && process.argv[1].endsWith('check-css-vars.mjs');
if (RUN) {
  if (process.argv.includes('--self-test')) selfTest();
  else main();
}

function main() {
  const defined = definedVars(fs.readFileSync(GLOBALS, 'utf8'));
  const findings = [];
  for (const file of walk(SRC)) {
    if (file === GLOBALS) continue;
    findings.push(...findingsIn(fs.readFileSync(file, 'utf8'),
                                path.relative(ROOT, file), defined));
  }
  const key = (f) => `${f.file}:${f.id}:${f.line}`;

  if (process.argv.includes('--baseline')) {
    fs.writeFileSync(BASELINE,
                     JSON.stringify([...new Set(findings.map(key))].sort(), null, 2));
    console.log(`Recorded ${findings.length} as the baseline.`);
    process.exit(0);
  }

  let known = new Set();
  try { known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); } catch { /* none */ }
  const fresh = findings.filter((f) => !known.has(key(f)));

  if (fresh.length) {
    console.error(`${fresh.length} NEW colour variable fault(s):\n`);
    for (const f of fresh.slice(0, 40)) {
      console.error(`  ${f.file}:${f.line}  [${f.id}]`);
      console.error(`      ${f.why}`);
      console.error(`      ${f.text}`);
    }
    process.exit(1);
  }

  const byId = {};
  for (const f of findings) byId[f.id] = (byId[f.id] || 0) + 1;
  console.log(`0 new colour variable faults. ${findings.length} known: `
    + Object.entries(byId).map(([k, n]) => `${n} ${k}`).join(', ') || '0 known');
}

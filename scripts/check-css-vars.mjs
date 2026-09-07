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

/** Whether a rule is painting a PAGE, rather than a small deliberate white bit.
 *
 * `--primary-bg` on a 14px toggle knob or a carousel dot is correct: a white
 * circle on a coloured track is exactly what was wanted. On a `.pageContainer`
 * with `min-height: 100vh` it is a white page on a dark site.
 *
 * Six of the ten hits were knobs and dots. Reporting those as faults would have
 * had somebody "fix" working controls, which is worse than not checking.
 */
function pageLevel(css, index) {
  const open = css.lastIndexOf('{', index);
  const selector = css.slice(Math.max(0, css.lastIndexOf('}', open) + 1), open);
  const block = css.slice(open, css.indexOf('}', index) + 1);
  if (/min-height\s*:\s*\d+vh/.test(block)) return true;
  return /(page|container|wrapper|shell|screen|layout|main|body)/i.test(selector);
}

export function findingsIn(css, file, defined) {
  // A variable is also "defined" if THIS file sets it, anywhere. The studio
  // and the Rivalry pack set their own palette on a wrapper - `--panel`,
  // `--ink`, `--bc` - and a graphic reads it below. That is a local design
  // token doing exactly what custom properties are for, and calling it
  // undefined was the checker being wrong, not the code.
  //
  // Reported 152 before this. The honest number is far smaller, and a checker
  // that cries about 152 things is one people stop reading. See
  // [[feedback_checker_calibration]].
  const local = new Set([...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
  const out = [];
  css.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(\/\*|\*)/.test(line)) return;
    if (/css-vars-allow/.test(line)) return;

    // 1. Undefined variable, with no fallback to save it.
    for (const m of line.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
      if (!defined.has(m[1]) && !local.has(m[1])) {
        out.push({
          file, line: i + 1, id: 'undefined-css-var',
          why: `${m[1]} is not defined in globals.css, so this declaration is dropped`,
          text: line.trim().slice(0, 110),
        });
      }
    }

    // 2. `--primary-bg` used as a PAGE background on a dark site.
    if (BG_WITH_TEXT_VAR.test(line) && pageLevel(css, css.indexOf(line))) {
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

/** Every JS file, for custom properties set from the browser rather than CSS. */
function walkCode(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walkCode(full, acc);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
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
  ['bad', '.pageContainer { min-height: 100vh; background-color: var(--primary-bg); }',
   'a white PAGE on a dark site'],
  ['bad', '.pageContainer { background: var(--primary-bg); }', 'the same, shorthand'],
  ['clean', '  color: var(--primary-bg);', 'text colour, which is what it is for'],
  ['clean', '  background-color: var(--overlay-gray);', 'a real surface token'],
  ['clean', '.toggleKnob { width: 14px; background-color: var(--primary-bg); }',
   'a white knob on a toggle, which is deliberate'],
  ['clean', '.cardImageDotActive { background: var(--primary-bg); }',
   'a white carousel dot, also deliberate'],
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
  // Definitions from EVERY stylesheet, not just globals.
  //
  // Custom properties inherit, so a token set on a wrapper in one file is
  // legitimately readable from a child's own stylesheet. The Rivalry pack does
  // exactly that: `rivalry.module.css` sets `--bc`, `--monu` and `--astro` on
  // its wrapper and eight graphics read them. Reading only globals called all
  // of that undefined and put the count at 152 when the real answer is far
  // smaller.
  //
  // What survives is the fault worth catching: a name defined NOWHERE, like
  // `--v-ent-grn`, which silently drops the declaration that uses it.
  const files = walk(SRC);
  const defined = new Set();
  for (const file of files) {
    for (const v of definedVars(fs.readFileSync(file, 'utf8'))) defined.add(v);
  }

  // And the ones set from JAVASCRIPT, which no amount of reading CSS can see.
  // Two real shapes here:
  //
  //   style={{ '--round-idx': rIdx }}   a bracket telling its own CSS which
  //                                     round this is, so the indent can be
  //                                     computed. Per element, so it cannot
  //                                     live in a stylesheet at all.
  //   Fraunces({ variable: '--font-fraunces' })   next/font, which mints the
  //                                     name at build time.
  //
  // Both are correct. Calling them undefined would have somebody delete a
  // working bracket layout to satisfy a checker.
  for (const file of walkCode(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/['"](--[A-Za-z0-9_-]+)['"]\s*:/g)) defined.add(m[1]);
    for (const m of src.matchAll(/variable\s*:\s*['"](--[A-Za-z0-9_-]+)['"]/g)) defined.add(m[1]);
  }
  const findings = [];
  for (const file of files) {
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

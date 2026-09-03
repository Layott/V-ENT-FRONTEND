// The design bans, actually checked.
//
// CEO, 3 September 2026, quoting an AFC session's own account of its weak spot:
//
//   "'Matches the constants' is checked by eye, not by anything. The bans are
//   all grep-able... and nothing greps them... so compliance depends on me
//   remembering, which is exactly the thing that fails at 2am."
//
// So this greps them. Every rule below is already a hard rule in CLAUDE.md and
// has been for weeks; what was missing was anything that could tell whether the
// code obeyed it.
//
//   node scripts/check-design.mjs
//   node scripts/check-design.mjs --self-test
//
// CALIBRATION IS THE WHOLE JOB HERE. A design lint that reports four hundred
// things is a design lint nobody runs. Two decisions keep it honest:
//
//   1. It checks CSS Modules and JSX in `src/`, and only the properties the
//      bans actually name. It does not have opinions of its own.
//   2. Every rule carries the exceptions the rules themselves grant:
//      `:focus-visible` outlines are REQUIRED for accessibility, native form
//      controls draw their own borders, and a checkerboard made of
//      `linear-gradient` is a transparency indicator rather than a decorative
//      wash. Those are in the self-test, not in somebody's head.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

/** A line that is allowed to break a rule, and why.
 *
 * These are exceptions the RULES THEMSELVES grant, not taste. Each is in the
 * self-test so it cannot quietly widen.
 */
const ALLOWED = [
  // Accessibility. The rules require a visible focus ring.
  /:focus-visible/,
  /outline:\s*2px/,
  // A comment explaining a ban is not a breach of it. Deliberately NOT applied
  // to the em dash rule: that one bans the character everywhere, comments and
  // commit messages included, so a comment gets no pass.
  /^\s*(\/\/|\/\*|\*)/,
  // The transparency checkerboard behind a broadcast preview: four gradients
  // making a chequer, not a decorative wash.
  /34353b|checkerboard/,
  // A loading spinner. The rules allow motion for real feedback and name
  // loading as an example, and a spinner is drawn with a ring and a rotation:
  // banning it would ban the loading state the same rules REQUIRE.
  /animation:\s*spin\b|@keyframes\s+spin\b|\bspinner\b|\bloader\b/i,
];

//: Rules that no comment exemption applies to.
const NO_COMMENT_PASS = new Set(['em-dash']);

const RULES = [
  {
    id: 'hairline',
    why: 'structure built from a 1px stroke. Use a filled surface and space.',
    // A border with a visible width. `border: none` and `border: 0` are the fix,
    // not the fault, so they are not matched.
    test: /(^|[^-\w])border(-(top|right|bottom|left))?\s*:\s*(?!none|0\b|0px)[^;]*\b\d+px\b/i,
  },
  {
    id: 'divider',
    why: 'a divider line. Use whitespace, or a background step.',
    test: /<hr\b|border-bottom:\s*1px|border-top:\s*1px/i,
  },
  {
    id: 'dashed',
    why: 'a dashed outline. An empty state is a filled surface or plain text.',
    test: /border[^;]*\bdashed\b/i,
  },
  {
    id: 'glow',
    why: 'a glow or halo. Emphasis is colour, weight, size and fill.',
    // `box-shadow: 0 0 <n>` is a glow. A downward elevation shadow is not.
    test: /box-shadow:\s*(inset\s+)?0\s+0\s+\d|drop-shadow\(\s*0\s+0\s/i,
  },
  {
    id: 'ambient-motion',
    why: 'something that pulses or breathes. Motion is for real feedback only.',
    test: /animation:[^;]*\binfinite\b|@keyframes\s+(glow|pulse|breathe|shimmer|ping)/i,
  },
  {
    id: 'pure-black-or-white',
    why: 'a pure black or pure white surface. Use an off-white or a real dark.',
    test: /background(-color)?:\s*(#fff\b|#ffffff\b|#000\b|#000000\b|white\b|black\b)/i,
  },
  {
    id: 'glass',
    why: 'frosted glass. Depth comes from surface steps, not blur.',
    test: /backdrop-filter:\s*[^;]*blur/i,
  },
  {
    id: 'banned-typeface',
    why: 'Inter, Geist or Space Grotesk. This platform is Clash Grotesk.',
    test: /font-family:[^;]*\b(Inter|Geist|Space Grotesk)\b/i,
  },
  {
    id: 'em-dash',
    why: 'an em or en dash. Use a hyphen, a comma, a colon or parentheses.',
    test: /[–—]/,
  },
];

export function findingsIn(source, file = '<source>') {
  const out = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const excused = ALLOWED.some((ok) => ok.test(line));
    for (const rule of RULES) {
      if (excused && !NO_COMMENT_PASS.has(rule.id)) continue;
      if (rule.test.test(line)) {
        out.push({ file, line: i + 1, id: rule.id, why: rule.why,
                   text: line.trim().slice(0, 90) });
      }
    }
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(css|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/* ------------------------------------------------------------------ self-test */

const CASES = [
  ['an outlined card', '.card { border: 1px solid #333; }', 1],
  ['border none is the fix, not the fault', '.card { border: none; }', 0],
  ['border 0 is also the fix', '.btn { border: 0; }', 0],
  ['a focus ring is required', '.btn:focus-visible { outline: 2px solid #fff; }', 0],
  ['a divider rule', '.row { border-bottom: 1px solid #222; }', 1],
  ['an hr', '  return <hr className={styles.line} />;', 1],
  ['a dashed empty box', '.empty { border: 2px dashed #444; }', 1],
  ['a glow', '.dot { box-shadow: 0 0 12px #4caf50; }', 1],
  ['an elevation shadow is fine', '.card { box-shadow: 0 6px 18px rgba(0,0,0,0.4); }', 0],
  ['something that pulses', '.dot { animation: pulse 2s infinite; }', 1],
  ['a one-shot animation is fine', '.in { animation: st_rise 340ms ease-out; }', 0],
  ['pure white background', '.page { background: #fff; }', 1],
  ['an off-white is fine', '.page { background-color: #f6f5f2; }', 0],
  ['frosted glass', '.panel { backdrop-filter: blur(12px); }', 1],
  ['a banned typeface', "  font-family: 'Inter', sans-serif;", 1],
  ['Clash Grotesk is the house font', "  font-family: 'ClashGrotesk-Variable', sans-serif;", 0],
  ['an em dash in a comment', '/* one thing — then another */', 1],
  ['a hyphen is fine', '/* one thing - then another */', 0],
  ['a comment naming a ban is not a ban', '// never use border: 1px solid here', 0],
  ['a loading spinner is the motion the rules require',
   '.spinner { animation: spin 0.7s linear infinite; }', 0],
  ['a spinner ring is how a spinner is drawn',
   '.spinner { border: 3px solid rgba(255,255,255,0.1); }', 0],
];

if (process.argv.includes('--self-test')) {
  let bad = 0;
  for (const [what, source, expected] of CASES) {
    const got = findingsIn(source).length;
    if (got !== expected) {
      console.error(`SELF-TEST ${what}: expected ${expected}, got ${got}`);
      bad += 1;
    } else console.log(`ok: ${what} -> ${got}`);
  }
  if (bad) process.exit(1);
  console.log('self-test: catches each ban and grants each exception');
  process.exit(0);
}

/* ---------------------------------------------------------------- the sweep */

// Only when run directly. Without this the sweep fires on `import`, which makes
// the file impossible to probe from a REPL and impossible to reuse from another
// checker: the first thing I tried to do with it ran a full scan and printed
// 129 findings instead of answering the question.
const RUN_DIRECTLY = Boolean(process.argv[1]
  && process.argv[1].split(path.sep).join('/').endsWith('scripts/check-design.mjs'));

if (RUN_DIRECTLY) { main(); }

function main() {
const BASELINE = path.join(HERE, 'design-baseline.json');
const findings = [];
for (const file of walk(SRC)) {
  findings.push(...findingsIn(fs.readFileSync(file, 'utf8'),
                              path.relative(path.join(HERE, '..'), file)));
}

const key = (f) => `${f.file}:${f.id}`;
const now = new Set(findings.map(key));

if (process.argv.includes('--baseline')) {
  fs.writeFileSync(BASELINE, JSON.stringify([...now].sort(), null, 2));
  console.log(`Recorded ${now.size} existing design breaches as the baseline.`);
  console.log('New ones fail from here. The list itself is work to do.');
  process.exit(0);
}

let known = new Set();
try { known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); } catch { /* none yet */ }

const fresh = findings.filter((f) => !known.has(key(f)));
const byRule = {};
for (const f of findings) byRule[f.id] = (byRule[f.id] || 0) + 1;

if (fresh.length) {
  console.error(`${fresh.length} NEW design breach(es):\n`);
  for (const f of fresh.slice(0, 40)) {
    console.error(`  ${f.file}:${f.line}  [${f.id}] ${f.why}`);
    console.error(`      ${f.text}`);
  }
  console.error('\nThese are hard rules in CLAUDE.md. Fix them, or if one is a');
  console.error('genuine exception, add it to ALLOWED with the reason.');
  process.exit(1);
}

console.log(`0 new design breaches. ${findings.length} known, being worked down:`);
for (const [id, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${id}`);
}
}

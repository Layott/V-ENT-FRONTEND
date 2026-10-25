#!/usr/bin/env node
/**
 * A font-family names a face the site actually has.
 *
 * Written 25 October 2026. The home page hero asked for "ClashGrotesk-Semi-Bold"
 * while the registered face is "ClashGrotesk-Semibold". No face matched, so the
 * browser fell back to the system sans-serif and the headline words rendered in
 * the wrong typeface. Three more places asked for "Inter", which the site never
 * loads. Nothing failed: a family that matches nothing is a silent fallback, not
 * an error, so it survived until somebody measured it on the live site.
 *
 * The rule here: every family a page asks for is declared somewhere. Declared
 * means a @font-face in a stylesheet, or a family loaded through next/font. Asked
 * for means the first name in a font-family declaration or a fontFamily value.
 * Only the first name is checked, because it is the one meant to render; the
 * names after it are fallbacks and may be anything.
 *
 * Comments are blanked before reading, so a font named in a comment is not a
 * use. Declared limits: a JS value built from a variable or a ternary, a value
 * holding a quote of the other kind, and the `font:` shorthand are not read.
 * Every real use today is a plain font-family or fontFamily string, and the
 * self-test asserts the real tree still yields both declared families and uses,
 * so a parse that broke would fail rather than pass on nothing.
 *
 *   node scripts/check-font-families.mjs
 *   node scripts/check-font-families.mjs --self-test
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');

// Keywords and generic families. The browser supplies these itself, so they are
// never a face to look up.
const GENERIC = new Set([
  'inherit', 'initial', 'unset', 'revert', 'sans-serif', 'serif', 'monospace',
  'ui-monospace', 'system-ui', 'cursive', 'fantasy',
]);

// Faces the operating system installs on every desktop and phone the site is
// read on. The site does not declare them and does not need to.
const SYSTEM = new Set(['courier new']);

// Parse the first family out of a declared value. Returns null when there is
// nothing to look up: a keyword, a var(), or a template built at run time.
export function firstFamily(value) {
  const v = value.replace(/\s*!important\s*$/i, '').trim();
  if (!v || v.includes('${') || /^var\(/i.test(v)) return null;
  const first = v.split(',')[0].trim().replace(/^(["'])(.*)\1$/, '$2').trim();
  if (!first || GENERIC.has(first.toLowerCase())) return null;
  return first;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * Read a list of { path, text } files. Returns the declared family names
 * (lowercased, since CSS compares them case-insensitively), every family asked
 * for with its place, and the ones asked for that nothing declares.
 */
// Comments blanked to spaces of the same length, so line numbers still match.
const blankComments = (text, js) => {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  // A line comment, but not the // inside "https://".
  if (js) out = out.replace(/(^|[^:\\])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));
  return out;
};

export function scan(files) {
  const declared = new Set();
  const used = [];
  const ask = (path, text, index, value) => {
    const family = firstFamily(value);
    if (family) used.push({ path, line: lineOf(text, index), family });
  };

  for (const { path, text: raw } of files) {
    const text = blankComments(raw, !path.endsWith('.css'));
    if (path.endsWith('.css')) {
      for (const [, body] of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        const family = body.match(/font-family\s*:\s*([^;}]+)/);
        if (family) declared.add(firstFamily(family[1]).toLowerCase());
      }
      // Blank out the @font-face blocks so only real uses are read. Same length,
      // so line numbers still match the file.
      const plain = text.replace(/@font-face\s*\{[^}]*\}/g, (m) => m.replace(/[^\n]/g, ' '));
      for (const m of plain.matchAll(/font-family\s*:\s*([^;{}]+)/g)) ask(path, text, m.index, m[1]);
    } else {
      for (const [, names] of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]next\/font\/google['"]/g)) {
        for (const name of names.split(',')) {
          const imported = name.split(/\s+as\s+/)[0].trim();
          if (imported) declared.add(imported.replace(/_/g, ' ').toLowerCase());
        }
      }
      if (/from\s*['"]next\/font\/local['"]/.test(text)) {
        for (const [, family] of text.matchAll(/family\s*:\s*['"]([^'"]+)['"]/g)) declared.add(family.toLowerCase());
      }
      for (const m of text.matchAll(/fontFamily\s*[:=]\s*(["'`])([^"'`\n]*)\1/g)) ask(path, text, m.index, m[2]);
    }
  }

  const flagged = used.filter((u) => {
    const name = u.family.toLowerCase();
    return !declared.has(name) && !SYSTEM.has(name);
  });
  return { declared, used, flagged };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(css|js|jsx|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

function readTree() {
  return walk(SRC).map((path) => ({ path: relative(ROOT, path).replace(/\\/g, '/'), text: readFileSync(path, 'utf8') }));
}

// --------------------------------------------------------------- self-test
const SEMIBOLD_FACE = '@font-face { font-family: "ClashGrotesk-Semibold"; src: url(a.woff2); }';
const CASES = [
  // The real fault: the hero asks for a hyphenated name nothing declares.
  ['Semi-Bold hyphen fails', [{ path: 'a.css', text: `${SEMIBOLD_FACE}\nh1 { font-family: "ClashGrotesk-Semi-Bold", sans-serif; }` }], true],
  ['a font named in a CSS comment is not a use', [{ path: 'a.css', text: `${SEMIBOLD_FACE}
/* font-family: "Nowhere"; */
h1 { font-family: "ClashGrotesk-Semibold"; }` }], false],
  ['a font named in a JS comment is not a use', [{ path: 'a.js', text: `// fontFamily: 'Nowhere'
const x = 1;` }], false],
  ['a URL in JS is not taken for a comment', [{ path: 'a.js', text: `const u = 'https://x.co'; const s = { fontFamily: 'Nowhere' };` }], true],
  ['declared family passes', [{ path: 'a.css', text: `${SEMIBOLD_FACE}\nh1 { font-family: "ClashGrotesk-Semibold", sans-serif; }` }], false],
  // CSS compares family names without regard to case.
  ['case-only difference passes', [
    { path: 'a.css', text: '@font-face { font-family: "ClashGrotesk-Extralight"; src: url(a.woff2); }' },
    { path: 'b.css', text: 'p { font-family: "ClashGrotesk-ExtraLight", sans-serif; }' },
  ], false],
  ['generic first value passes', [{ path: 'a.css', text: 'p { font-family: sans-serif, "Nope"; }' }], false],
  ['var() first value passes', [{ path: 'a.css', text: 'p { font-family: var(--x), "Nope"; }' }], false],
  // Only the first name is the one meant to render; a fallback after it is free.
  ['fallback after a declared face passes', [{ path: 'a.css', text: `${SEMIBOLD_FACE}\np { font-family: "ClashGrotesk-Semibold", "Nope"; }` }], false],
  ['next/font family passes', [
    { path: 'src/app/layout.js', text: 'import { Fraunces } from "next/font/google";\nconst f = Fraunces({ subsets: ["latin"] });' },
    { path: 'src/x.jsx', text: "<p style={{ fontFamily: 'Fraunces, sans-serif' }} />" },
  ], false],
  ['next/font import name with underscores passes', [
    { path: 'src/app/layout.js', text: 'import { Space_Grotesk as SG } from "next/font/google";' },
    { path: 'src/x.jsx', text: "<p style={{ fontFamily: 'Space Grotesk, sans-serif' }} />" },
  ], false],
  // The second fault: an SVG attribute asking for a font the site never loads.
  ['JS fontFamily="Inter, sans-serif" fails', [{ path: 'AdminChart.js', text: '<text fontFamily="Inter, sans-serif">x</text>' }], true],
  // Courier New ships with the operating system, so it needs no @font-face.
  ['system face passes', [{ path: 'a.css', text: 'code { font-family: "Courier New", monospace; }' }], false],
  ['template value is skipped', [{ path: 'x.js', text: 'const s = { fontFamily: `${slot}, Nope` };' }], false],
];

function selfTest() {
  const lines = [];
  let bad = 0;
  for (const [name, files, expectFlag] of CASES) {
    const flagged = scan(files).flagged.length > 0;
    const ok = flagged === expectFlag;
    if (!ok) bad += 1;
    lines.push(`${ok ? 'ok    ' : 'FAILED'} ${name} (${flagged ? 'flagged' : 'clean'})`);
  }
  // A parse that finds nothing in the real tree would pass every case above, so
  // the real tree must declare a floor of families.
  const real = scan(readTree());
  const floorOk = real.declared.size >= 5;
  if (!floorOk) bad += 1;
  lines.push(`${floorOk ? 'ok    ' : 'FAILED'} real tree declares at least 5 families (${real.declared.size} found)`);
  // And the uses: 1014 on 25 October. A scan that read none would flag none.
  const usedOk = real.used.length >= 200;
  if (!usedOk) bad += 1;
  lines.push(`${usedOk ? 'ok    ' : 'FAILED'} real tree yields at least 200 font uses (${real.used.length} found)`);
  return { lines, bad, total: CASES.length + 2 };
}

if (process.argv.includes('--self-test')) {
  const { lines, bad, total } = selfTest();
  lines.forEach((l) => console.log(l));
  console.log(`${bad} of ${total} self-test case(s) failed`);
  process.exit(bad ? 1 : 0);
}

const check = selfTest();
if (check.bad) {
  check.lines.filter((l) => l.startsWith('FAILED')).forEach((l) => console.error(l));
  console.error('the matcher is wrong, so its count means nothing');
  process.exit(2);
}

const { used, flagged } = scan(readTree());
for (const f of flagged) {
  console.log(`${f.path}:${f.line}  "${f.family}" matches no @font-face or next/font family`);
}
console.log(`${used.length} font famil${used.length === 1 ? 'y' : 'ies'} checked, ${flagged.length} with no face`);
process.exit(flagged.length ? 1 : 0);

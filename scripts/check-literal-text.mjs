#!/usr/bin/env node
// English written straight into a screen, where no dictionary can reach it.
//
// Found 29 September 2026: the organiser settings passed four hints as plain
// strings (hint="You press the button. Nothing is removed automatically."), so
// a French or Portuguese organiser read English under French labels. None of
// the other catchers could see it: check-keys reads tt('key', ...), check-tx-text
// reads tx("..."), and a literal prop is neither. The same shape was on the
// landing page's email box. Twice is a class, so this is its catcher.
//
// Reads, in every file a page can reach (dead components are a different
// problem and are left out, as check-inert-controls does):
//   * a prose prop: hint, placeholder, label, title, aria-label, alt, set to a
//     literal string of two or more words;
//   * prose between tags: >Two or more words<.
// Proper nouns that are the same in every language (a game's name, V-ENT)
// are listed in ALLOWED with the reason.
//
//   node scripts/check-literal-text.mjs
//   node scripts/check-literal-text.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// The same in every language, so not a translation fault.
export const ALLOWED = new Set([
  'Free Fire',          // game title
  'Call of Duty',       // game title
  'Mobile Legends',     // game title
  'EA FC',              // game title
  'VENT COINS',         // the currency's name
]);

const PROP = /\b(hint|placeholder|label|title|aria-label|alt)=(["'])([A-Z][^"'{}<>]*\s[^"'{}<>]*)\2/g;
const TEXT = />\s*([A-Z][A-Za-z']*(?:(?:[ ,][A-Za-z'][A-Za-z'-]*)+[.!?:]?|:))\s*</g;

const blank = (t) => t.replace(/[^\n]/g, ' ');
const stripComments = (src) => src
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, blank)
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;
    return line.slice(0, at) + ' '.repeat(line.length - at);
  })
  .join('\n');

/** Every literal English phrase in one file's source. */
export function findLiterals(source) {
  const src = stripComments(source);
  const out = [];
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  for (const m of src.matchAll(PROP)) {
    // ComingSoon translates its own props; check-tx-text reads those.
    const tagStart = src.lastIndexOf('<', m.index);
    if (/^<ComingSoon\b/.test(src.slice(tagStart, tagStart + 12))) continue;
    if (ALLOWED.has(m[3].trim())) continue;
    out.push({ line: lineOf(m.index), text: m[3].trim(), kind: m[1] });
  }
  for (const m of src.matchAll(TEXT)) {
    const text = m[1].trim();
    if (ALLOWED.has(text)) continue;
    // `a < b && c > d` in code is not text between tags.
    if (/[=&|;(){}]/.test(text)) continue;
    out.push({ line: lineOf(m.index), text, kind: 'text' });
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'i18n' || e.name === 'node_modules') continue;
      walk(p, acc);
    } else if (/\.jsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const ROOTS = /(?:^|[\\/])(page|layout|error|not-found|loading|template|global-error)\.jsx?$/;

function importsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  const specs = [
    ...[...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
    ...[...src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
  ];
  for (const spec of specs) {
    let base;
    if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.join(path.dirname(file), spec);
    else continue;
    for (const cand of [base, base + '.js', base + '.jsx', path.join(base, 'index.js')]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) { out.push(cand); break; }
    }
  }
  return out;
}

export function reachableFrom(files) {
  const seen = new Set();
  const queue = files.filter((f) => ROOTS.test(f));
  while (queue.length) {
    const next = path.resolve(queue.pop());
    if (seen.has(next)) continue;
    seen.add(next);
    for (const dep of importsOf(next)) queue.push(dep);
  }
  return seen;
}

function selfTest() {
  const cases = [
    ['a literal hint', '<Toggle hint="You press the button. Nothing is removed." />', 1],
    ['a literal placeholder', '<input placeholder="Enter your email address" />', 1],
    ['a hint through tt', '<Toggle hint={tt("opts.x", "You press the button.")} />', 0],
    ['ComingSoon translates its props', '<ComingSoon title="Stream overlay" blurb="x" />', 0],
    ['prose between tags', '<p>No featured events available</p>', 1],
    ['a translated text node', '<p>{tt("a.b", "No featured events")}</p>', 0],
    ['a game name', '<option value="FF">Free Fire</option>', 0],
    ['a single word', '<span>Loading</span>', 0],
    ['a one-word label with a colon', '<span className={s.l}>Tournament:</span>', 1],
    ['code, not text', 'if (a < b && Some thing > c) {}', 0],
    ['a comment', '{/* <p>Old heading text</p> */}', 0],
  ];
  let failed = 0;
  for (const [name, src, want] of cases) {
    const got = findLiterals(src).length;
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got} (want ${want})`);
  }
  // An unreachable file is not counted: two files, one page importing one.
  const tmp = fs.mkdtempSync(path.join(ROOT, '.lit-'));
  try {
    fs.writeFileSync(path.join(tmp, 'page.js'), "import A from './A';\n");
    fs.writeFileSync(path.join(tmp, 'A.js'), '<p>Reachable words here</p>\n');
    fs.writeFileSync(path.join(tmp, 'Dead.js'), '<p>Dead words here</p>\n');
    const r = reachableFrom(walk(tmp));
    const ok = r.has(path.resolve(tmp, 'A.js')) && !r.has(path.resolve(tmp, 'Dead.js'));
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} only what a page reaches is read`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failed ? `${failed} self-test case(s) FAILED` : `${cases.length + 1} self-test case(s) pass`);
  process.exit(failed ? 1 : 0);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const files = walk(path.join(ROOT, 'src'));
  const reachable = reachableFrom(files);
  const findings = [];
  for (const file of files) {
    if (!reachable.has(path.resolve(file))) continue;
    for (const f of findLiterals(fs.readFileSync(file, 'utf8'))) {
      findings.push({ file: path.relative(ROOT, file).split(path.sep).join('/'), ...f });
    }
  }
  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.kind}  "${f.text}"`);
  console.log(`${reachable.size} reachable file(s) read, ${findings.length} literal English phrase(s)`);
  process.exit(findings.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

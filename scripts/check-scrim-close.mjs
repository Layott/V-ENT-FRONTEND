#!/usr/bin/env node
// A pop-up's backdrop closes it only when the press began on the backdrop.
//
// Apple review F6 (inbox 569, 29 October 2026): the browser sends a click to
// the nearest element that holds both ends of a press, so a press that starts
// inside the box and ends over the dark backdrop arrives as a click ON the
// backdrop. Both ways this site wrote a backdrop closed the pop-up then:
// `if (e.target === e.currentTarget) close()` (37 places) and
// `onClick={close}` on the backdrop with stopPropagation on the box (24). On
// the fixture detail at 390px a downward drag released over the scrim shut it.
// Seen in two shapes, so it has a catcher. The fix is src/lib/scrim.js:
// onPointerDown={markScrimDown} plus isScrimClick(e) in the click.
//
// What fails, in src, outside comments:
//   1. `e.target === e.currentTarget` (or ev / event): the bare test.
//   2. an element whose className names an overlay, backdrop, scrim or shade
//      and that has an onClick, without onPointerDown={markScrimDown}.
//   3. isScrimClick( on an element without onPointerDown={markScrimDown}.
// Broadcast overlays (src/components/overlays, studio elements) are graphics
// with no click and are not read.
//
//   node scripts/check-scrim-close.mjs              # "scrim close: N problems"
//   node scripts/check-scrim-close.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');
const EXEMPT = /[\\/](overlays|studio[\\/]elements)[\\/]|[\\/]lib[\\/]scrim\.js$/;

// A block comment starts after a line start, a space or a bracket, never inside
// a word: `accept="image/*"` is not a comment, and reading it as one blanked a
// page from that attribute to the next `*/` and invented four problems.
const stripComments = (s) => s
  .replace(/(^|[\s{(;,])\/\*[\s\S]*?\*\//g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const BARE = /\b(e|ev|event|evt)\.target\s*===\s*\1\.currentTarget\b|\b(e|ev|event|evt)\.currentTarget\s*===\s*\2\.target\b/;
// `scrim` counts alone or as a suffix only: scrimAcceptBtn is the old name for
// a Challenge button, not a backdrop.
const SCRIM_CLASS = /className=\{[^}]*\b[\w.]*(overlay|Overlay|backdrop|Backdrop|shade|Shade)\w*|className=\{[^}]*(\.scrim\b|Scrim\b)/;

// Opening JSX tags, with brace depth so an arrow inside an attribute does not
// end the tag at its `>`.
function openingTags(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '<' || !/[A-Za-z]/.test(text[i + 1] || '')) continue;
    let depth = 0, q = null, j = i + 1;
    for (; j < text.length; j++) {
      const c = text[j];
      if (q) { if (c === q && text[j - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { if (depth > 0 || c === '"') q = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
      else if (c === '<' && depth === 0) { j = -1; break; }
    }
    if (j > i) out.push({ start: i, tag: text.slice(i, j + 1) });
  }
  return out;
}

function problemsIn(text, file) {
  const clean = stripComments(text);
  const out = [];
  const lineOf = (i) => clean.slice(0, i).split('\n').length;
  clean.split('\n').forEach((line, i) => {
    if (BARE.test(line)) out.push(`${file}:${i + 1}: a backdrop test that closes on a press begun inside; use isScrimClick(e) with onPointerDown={markScrimDown}`);
  });
  for (const { start, tag } of openingTags(clean)) {
    const marked = /onPointerDown=\{markScrimDown\}/.test(tag);
    if (/isScrimClick\(/.test(tag) && !marked) {
      out.push(`${file}:${lineOf(start)}: isScrimClick without onPointerDown={markScrimDown} on the same element`);
    } else if (SCRIM_CLASS.test(tag) && /\bonClick=/.test(tag) && !marked) {
      out.push(`${file}:${lineOf(start)}: a backdrop that closes on click without onPointerDown={markScrimDown}`);
    }
  }
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return /^(generated|node_modules)$/.test(e.name) ? [] : walk(p);
    return /\.(js|jsx)$/.test(e.name) ? [p] : [];
  });
}

function run() {
  const problems = walk(SRC).filter((f) => !EXEMPT.test(f)).flatMap((f) => problemsIn(
    fs.readFileSync(f, 'utf8'), path.relative(ROOT, f).split(path.sep).join('/')));
  for (const p of problems.slice(0, 40)) console.log('  ' + p);
  console.log(`scrim close: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const cases = [
    ['the bare test (37 shipped)', `<div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>`, 2],
    ['the bare test with ev', `onClick={ev => ev.target === ev.currentTarget && close()}`, 1],
    ['a backdrop closing with stopPropagation on the box (24 shipped)', `{open && <div className={styles.modalOverlay} onClick={() => setOpen(false)}>`, 1],
    ['a shared backdrop class', `<div className={shared.modalBackdrop} onClick={handleClose}>`, 1],
    ['isScrimClick without the down half', `<div className={s.box} onClick={(e) => isScrimClick(e) && close()}>`, 1],
    ['the fix passes', `<div className={s.modalOverlay} onPointerDown={markScrimDown} onClick={(e) => isScrimClick(e) && (setOpen(false))}>`, 0],
    ['the fix over two lines passes', `<div\n  className={styles.backdrop}\n  onPointerDown={markScrimDown} onClick={(e) => { if (isScrimClick(e) && !busy) onCancel(); }}\n>`, 0],
    ['an overlay with no click is not a backdrop that closes', `<div className={styles.overlay} aria-hidden="true">`, 0],
    ['a button with an arrow in a handler is read whole', `<button className={s.btn} onClick={() => go(a > b)}>`, 0],
    ['a comment is not code', `// was: if (e.target === e.currentTarget) close();`, 0],
    ['image/* in an attribute is not a comment', `<input type="file" accept="image/*" />\n<div className={s.overlay} onClick={() => setOpen(false)}>`, 1],
    ['a challenge button named scrim is not a backdrop', `<button className={styles.scrimAcceptBtn} onClick={() => accept(x)}>`, 0],
    ['a JSX comment is not code', `{/* <div className={s.overlay} onClick={close}> */}`, 0],
  ];
  let failed = 0;
  for (const [label, text, want] of cases) {
    const got = problemsIn(text, 'fixture.js').length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${got}, want ${want})`);
  }
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest(); else run();

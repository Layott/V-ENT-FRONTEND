#!/usr/bin/env node
// Every button that shows only an icon has a name.
//
// Found on the Apple review walk (inbox 587, 11 November 2026): the ticket
// checkout's close button was an icon with nothing to say what it was, so a
// screen reader announced "button" and the accessibility tree had no name
// for it. Three more pop-up close buttons were the same, one of them a bare
// "×". A button made of an icon alone needs aria-label (or a title, or text
// for screen readers) to be usable by anybody who cannot see the icon.
//
// What fails, in src: a <button> or [role=button] whose content, after
// comments, is only icon components (<LuX />, <IoClose />, <FaTimes />, any
// <Xx... />) and/or the characters × ✕ ✖, with no aria-label, aria-labelledby
// or title on the button.
//
//   node scripts/check-icon-buttons.mjs              # "icon buttons: N problems"
//   node scripts/check-icon-buttons.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');

const stripComments = (s) => s
  .replace(/(^|[\s{(;,])\/\*[\s\S]*?\*\//g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

// <button ...> ... </button>, attributes read with brace depth.
function buttons(text) {
  const out = [];
  const re = /<button\b/g;
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + 7, depth = 0, q = null;
    for (; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === q) q = null; continue; }
      if (depth > 0 && (c === '"' || c === "'" || c === '`')) { q = c; continue; }
      if (depth === 0 && c === '"') { q = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    const attrs = text.slice(m.index, i + 1);
    if (attrs.endsWith('/>')) continue;
    const close = text.indexOf('</button>', i);
    if (close < 0) continue;
    out.push({ start: m.index, attrs, body: text.slice(i + 1, close) });
  }
  return out;
}

const NAMED = /\baria-label(ledby)?=|\btitle=/;
// Components that carry their own words for a screen reader.
const SELF_NAMED = /<(PagerArrow)\b/;
function iconOnly(body) {
  const rest = body
    .replace(/<([A-Z][A-Za-z0-9]*)\b[^<>]*\/>/g, '')      // <LuX className={...} />
    .replace(/\{\s*\}/g, '')
    .replace(/[×✕✖]|&times;/g, '')
    .trim();
  const hadIcon = /<[A-Z][A-Za-z0-9]*\b[^<>]*\/>|[×✕✖]|&times;/.test(body);
  return hadIcon && rest === '';
}

function problemsIn(text, file) {
  const clean = stripComments(text);
  const lineOf = (i) => clean.slice(0, i).split('\n').length;
  return buttons(clean)
    .filter((b) => !NAMED.test(b.attrs) && !SELF_NAMED.test(b.body) && iconOnly(b.body))
    .map((b) => `${file}:${lineOf(b.start)}: a button that is only an icon has no name; add aria-label`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return /^(generated|node_modules)$/.test(e.name) ? [] : walk(p);
    return /\.(js|jsx)$/.test(e.name) ? [p] : [];
  });
}

function run() {
  const problems = walk(SRC).flatMap((f) => problemsIn(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f).split(path.sep).join('/')));
  for (const p of problems.slice(0, 60)) console.log('  ' + p);
  console.log(`icon buttons: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const cases = [
    ['an icon close with no name (the checkout)', '<button className={s.modalClose} onClick={close} type="button">\n  <IoClose />\n</button>', 1],
    ['a bare times sign', '<button className={s.x} onClick={close}>×</button>', 1],
    ['named with aria-label', '<button aria-label={tt("ui.close", "Close")} onClick={close}><LuX /></button>', 0],
    ['named with title', '<button title="Close" onClick={close}><LuX /></button>', 0],
    ['an icon beside words', '<button onClick={go}><LuPlus /> {tt("k", "Add")}</button>', 0],
    ['words only', '<button onClick={go}>{tt("k", "Save")}</button>', 0],
    ['an arrow inside a handler is read whole', '<button onClick={() => a > b && go()}><LuX /></button>', 1],
    ['a comment is not a button', '// <button><LuX /></button>', 0],
    ['PagerArrow names itself', '<button onClick={prev}><PagerArrow dir="prev" /></button>', 0],
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

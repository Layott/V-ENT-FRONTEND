#!/usr/bin/env node
// No button shows the browser's light button face.
//
// Apple review F1 and F2 (inbox 568): the comic "Subscribe, 25 VC a month"
// and the active tab on My list were white text on near-white, because their
// classes set no background and the browser filled the button with its own
// light face. Found twice, by the runtime light-face scan
// (tasks/audit/apple-565/scripts/scan_buttonface.mjs), so it has a catcher.
//
// The fix is structural: globals.css gives `button` a transparent background,
// so a class that sets none shows the page under it. A class still wins over
// the element rule. This catcher fails when that rule is gone or no longer
// transparent, which is the one change that would bring the fault back
// everywhere at once.
//
//   node scripts/check-button-face.mjs              # "button face: N problems"
//   node scripts/check-button-face.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const GLOBALS = path.join(ROOT, 'src', 'app', 'globals.css');

function problemsIn(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Top-level rules only: a rule inside @media is not the default for every width.
  let depth = 0, top = '';
  for (const c of clean) {
    if (c === '{') depth++;
    if (depth <= 1) top += c;
    if (c === '}') depth--;
  }
  const rules = [...top.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)];
  const own = rules.filter((m) => m[1].split(',').map((x) => x.trim()).includes('button'));
  const transparent = own.some((m) => /background(-color)?\s*:\s*(transparent|none)\b/.test(m[2]));
  return transparent ? [] : ['src/app/globals.css: no `button { background-color: transparent }`; a button whose class sets no background will show the light browser face'];
}

function run() {
  const problems = problemsIn(fs.readFileSync(GLOBALS, 'utf8'));
  for (const p of problems) console.log('  ' + p);
  console.log(`button face: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const cases = [
    ['the rule present', 'button {\n  background-color: transparent;\n}', 0],
    ['the rule written as background: none', 'button { background: none; }', 0],
    ['the rule missing (the state that shipped F1 and F2)', 'button,\ninput {\n  border: 0;\n}', 1],
    ['a class is not the element rule', '.button { background-color: transparent; }', 1],
    ['a commented-out rule does not count', '/* button { background-color: transparent; } */', 1],
    ['a light colour is not transparent', 'button { background-color: #f0f0f0; }', 1],
  ];
  let failed = 0;
  for (const [label, css, want] of cases) {
    const got = problemsIn(css).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${got}, want ${want})`);
  }
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest(); else run();

// A button that does nothing at all.
//
// "Follow Organizer" sat on every tournament page, full width under the
// organiser's name, styled like every other control on the site. It had no
// onClick. Not a broken handler, not a handler that failed: no handler. It was
// inert for everybody, signed in and signed out, from the day it was written,
// and nothing anywhere could tell.
//
//     <button className={styles.outlineBtn} style={{...}}>Follow Organizer</button>
//
// The build compiles it, the linter allows it, `check-signed-out` cannot see it
// because there is no handler to trace, and a person clicking it gets exactly
// the same nothing whether they have an account or not. The only way it is ever
// found is somebody pressing it and noticing, which on this occasion took a
// walk of the live site.
//
// This is the same family as the undefined functions that shipped in a whole
// tab, and as the refs that were read but never attached: a control that looks
// finished and is not wired to anything.
//
//   node scripts/check-inert-controls.mjs
//
// What counts as wired: onClick, onSubmit, onChange, onKeyDown, type="submit",
// type="reset", disabled, or being a form's own submit. A `<button>` with none
// of those does nothing when pressed, and there is no legitimate reason to
// render one.

import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(full);
  }
};
walk('src');

const blank = (t) => t.replace(/[^\n]/g, ' ');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;   // a URL
    return line.slice(0, at) + ' '.repeat(line.length - at);
  })
  .join('\n');

// Anything that makes a press do something.
const WIRED = /\bon(?:Click|Submit|Change|KeyDown|KeyUp|MouseDown|Pointer\w+)\s*=/;
const SUBMITS = /type\s*=\s*["'{]\s*(?:submit|reset)/;


// Only what somebody can actually reach. Ten of the seventeen files this first
// reported are components no page imports any more: dead code carrying dead
// buttons, which is a different problem and not this one. Reporting them here
// would have buried the eleven a person can genuinely press.
const importsOf = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    let base;
    if (spec.startsWith('@/')) base = path.join('src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.join(path.dirname(file), spec);
    else continue;
    for (const ext of ['.js', '.jsx', '/index.js', '/index.jsx']) {
      if (fs.existsSync(base + ext)) { out.push(base + ext); break; }
      if (fs.existsSync(base) && fs.statSync(base).isFile()) { out.push(base); break; }
    }
  }
  return out;
};

const reachable = new Set();
{
  const queue = files.filter((f) => /page\.jsx?$/.test(f) || /layout\.jsx?$/.test(f));
  while (queue.length) {
    const next = queue.pop();
    const key = path.resolve(next);
    if (reachable.has(key)) continue;
    reachable.add(key);
    for (const dep of importsOf(next)) queue.push(dep);
  }
}

const findings = [];

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const rel = file.split(path.sep).join('/');
  if (rel.includes('check-inert-controls')) continue;
  if (!reachable.has(path.resolve(file))) continue;

  // Every `<button` opening tag, and the attributes up to the `>` that closes
  // it. Brace-aware, because `style={{ ... }}` and `className={`${a}`}` both
  // contain characters that a naive scan would read as the end of the tag.
  for (const m of src.matchAll(/<button\b/g)) {
    let depth = 0;
    let end = -1;
    for (let k = m.index + 7; k < src.length; k += 1) {
      const c = src[k];
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0) { end = k; break; }
    }
    if (end === -1) continue;
    const attrs = src.slice(m.index, end);

    if (WIRED.test(attrs) || SUBMITS.test(attrs)) continue;
    // A button that is spread props, or takes them from a parent, is wired by
    // whoever renders it. `{...props}` and `{...rest}` are the shapes for that.
    if (/\{\s*\.\.\./.test(attrs)) continue;
    // A disabled button is deliberately doing nothing.
    if (/\bdisabled\b/.test(attrs)) continue;
    // Wrapped in a Link or an anchor, the button is the label and the wrapper
    // does the navigating. That is the shape most of this codebase uses for
    // "a button that goes somewhere", and reporting it would have buried the
    // real findings under twenty that were fine.
    const wrap = src.slice(Math.max(0, m.index - 400), m.index);
    const linkOpen = Math.max(wrap.lastIndexOf('<Link'), wrap.lastIndexOf('<a '));
    if (linkOpen !== -1) {
      const after = wrap.slice(linkOpen);
      if (!/<\/Link>|<\/a>/.test(after)) continue;
    }

    // Inside a <form>, a bare button IS the submit button. Look back a little
    // for a form tag that has not closed.
    const before = src.slice(Math.max(0, m.index - 2500), m.index);
    const opens = (before.match(/<form\b/g) || []).length;
    const closes = (before.match(/<\/form>/g) || []).length;
    if (opens > closes) continue;

    const line = src.slice(0, m.index).split('\n').length;
    // The label, so the report says which button rather than which line.
    const label = (src.slice(end, end + 220).match(/["'>]([A-Za-z][^<>{"']{2,40})/) || [])[1];
    findings.push({ rel, line, label: (label || '').trim() });
  }
}

for (const f of findings) {
  console.log(`${f.rel}:${f.line}`);
  console.log(`  a <button>${f.label ? ` labelled "${f.label}"` : ''} with no onClick,`
    + ' no submit and no disabled: pressing it does nothing, for everybody.');
  console.log('  Wire it, make it a Link, or take it off the page.');
  console.log('');
}

console.log(`${findings.length} button(s) that do nothing when pressed`);
process.exit(findings.length ? 1 : 0);

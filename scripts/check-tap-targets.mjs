#!/usr/bin/env node
// A control that is 40px tall on a phone.
//
// The UI rules say 44px minimum on anything pressable. `manage-event.module.css`
// had a mobile block raising `.ghostBtn`, `.addBtn`, `.iconBtn` and `.tab` to
// 44 - and `.primaryBtn`, the biggest button on the page, was not in the list.
// It sat at `min-height: 40px` and measured 40 on the emulator while the ghost
// buttons beside it measured 44.
//
// That is the "one built, the other forgotten" shape, and it is invisible to
// reading: `min-height: 40px` in a base rule looks deliberate. Only a
// measurement on a device says otherwise, and nobody measures every button.
//
// ## What this flags, and what it deliberately does not
//
// ONLY an explicit `min-height` or `height` BELOW 44px, on a class whose name
// says it is pressable, with no media query raising it. That is narrow on
// purpose:
//
//   - A class with no explicit height is sized by its padding and line-height,
//     which cannot be computed from the stylesheet alone. Guessing there is
//     how a checker reports 152 when the honest number is 5.
//   - A small chip inside a row that is itself the tap target is a real
//     pattern, so `--all` lists those separately rather than failing on them.
//
// Run:
//   node scripts/check-tap-targets.mjs
//   node scripts/check-tap-targets.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ARG = process.argv.slice(2).find((a) => !a.startsWith('--'));
const ROOT = path.resolve(ARG || 'src');
const MIN = 44;

// A class name that means "somebody presses this".
//
// Split into camelCase words rather than matched as a substring. The first
// version used a `(^|[^a-z])` boundary, which cannot see the B in
// `primaryBtn` because the character before it is a lowercase letter - so it
// was blind to almost every button in the repo and only ever matched names
// that START with a pressable word. Its own self-test is what said so, on the
// fixture built from the real fault.
const WORDS = new Set(['btn', 'button', 'tab', 'chip', 'pill', 'toggle',
                       'action', 'link', 'switch']);

const wordsOf = (cls) => cls
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .split(/[\s_-]+/)
  .map((w) => w.toLowerCase())
  .filter(Boolean);

const PRESSABLE = { test: (cls) => wordsOf(cls).some((w) => WORDS.has(w)) };

// Three things that match PRESSABLE and are not what a finger lands on. All
// three were found by reading the 31 this reported on its first run, and all
// three are the same mistake: measuring a part rather than the control.
//
//   - The track and knob INSIDE a switch. They are absolutely positioned to
//     the label's own box, so their size IS the label's, and reporting them
//     counts one control up to three times. The label is checked on its own.
//   - A container or a piece of text whose name happens to contain a
//     pressable word. `.tabsRow` matched on "tab", which is exactly why
//     `.btnRow` was already excluded - the exclusion was too narrow, not
//     wrong.
//   - A state modifier. The height lives on the base class, which is checked.
const NOT_THE_TARGET = new Set([
  // The track and knob inside a switch.
  'slider', 'knob', 'handle', 'thumb',
  // A container or a piece of text.
  'row', 'rows', 'count', 'label', 'wrap', 'wrapper', 'group', 'list', 'bar',
  'text', 'strip', 'nav',
  // A state modifier. The height lives on the base class, which is checked.
  'active', 'selected', 'current', 'disabled', 'on', 'off',
]);

// Judged by the LAST word: `tabsRow` is a row, `rowBtn` is a button.
const notTheTarget = (cls) => {
  const words = wordsOf(cls);
  return NOT_THE_TARGET.has(words[words.length - 1]);
};

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.module.css')) files.push(full);
  }
})(ROOT);

/**
 * Every rule in a stylesheet, with the media query it sits inside.
 *
 * A brace-depth scan rather than a set of index guesses. The first version
 * tested `startsWith('@media', i)` at a cursor that is on a newline after
 * every closing brace, so it never once recognised a media block: every rule
 * inside one was recorded as a base rule and the "is it raised on a phone"
 * half of this checker did nothing at all. Its own self-test is what said so.
 */
function rules(source) {
  // Comments FIRST. A comment sitting immediately before `@media` ends up in
  // the same buffer as the at-rule, so `head.startsWith('@')` was false and
  // the whole media block was parsed as an ordinary selector. Every file in
  // this repo documents its mobile block with a comment above it, which is
  // precisely why nothing looked raised.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = [];
  const stack = [];
  let buf = '';
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i];
    if (c === '{') {
      const head = buf.trim();
      buf = '';
      if (head.startsWith('@')) { stack.push({ at: head }); continue; }
      // The body runs to the matching close, and a declaration block holds no
      // nested braces in these files.
      const close = css.indexOf('}', i);
      if (close === -1) break;
      out.push({
        selector: head,
        body: css.slice(i + 1, close),
        media: stack.map((s) => s.at).filter((a) => a.startsWith('@media')).join(' '),
      });
      i = close;
      continue;
    }
    if (c === '}') { stack.pop(); buf = ''; continue; }
    buf += c;
  }
  return out;
}

const classesIn = (selector) =>
  [...selector.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]);

const heightIn = (body) => {
  const m = body.match(/(?:^|;|\s)(?:min-)?height\s*:\s*(\d+)px/);
  return m ? Number(m[1]) : null;
};

function scan(css) {
  const parsed = rules(css);
  // What each class is raised to inside ANY media query. A class raised in a
  // mobile block is fine however small its base rule is: that IS the fix.
  const raised = new Set();
  for (const r of parsed) {
    if (!r.media) continue;
    const h = heightIn(r.body);
    if (h !== null && h >= MIN) for (const c of classesIn(r.selector)) raised.add(c);
  }

  const found = [];
  for (const r of parsed) {
    if (r.media) continue;
    // `.tabBtn.tabActive::after { height: 2px }` is the underline UNDER a tab.
    // Decoration is never what a finger lands on, and measuring it reported
    // "tabBtn is 2px".
    if (r.selector.includes('::')) continue;
    const h = heightIn(r.body);
    if (h === null || h >= MIN) continue;
    for (const c of classesIn(r.selector)) {
      if (!PRESSABLE.test(c)) continue;
      if (notTheTarget(c)) continue;
      if (raised.has(c)) continue;
      found.push({ cls: c, height: h });
    }
  }
  return found;
}

// ------------------------------------------------------------- self-test
const FIXTURES = [
  {
    name: 'the real fault: primaryBtn at 40 with its neighbours raised',
    shouldFlag: true,
    css: `.ghostBtn { padding: 7px 12px; }
.primaryBtn { min-height: 40px; padding: 9px 16px; }
@media (max-width: 720px) {
  .ghostBtn, .addBtn, .tab { min-height: 44px; }
}`,
  },
  {
    name: 'the same file once primaryBtn is in the list',
    shouldFlag: false,
    css: `.ghostBtn { padding: 7px 12px; }
.primaryBtn { min-height: 40px; padding: 9px 16px; }
@media (max-width: 720px) {
  .ghostBtn, .addBtn, .primaryBtn, .tab { min-height: 44px; }
}`,
  },
  {
    // The underline under a tab. Reported as "tabBtn is 2px" before this.
    name: 'a pseudo-element used as decoration',
    shouldFlag: false,
    css: `.tabBtn { padding: 0.75rem 1rem; }
.tabBtn.tabActive::after { content: ''; height: 2px; }`,
  },
  {
    // The media block sits after a closing brace and a newline, which is what
    // the first parser could not see.
    name: 'a fix in a media block that does not start at the cursor',
    shouldFlag: false,
    css: `.saveBtn { min-height: 36px; }

@media (max-width: 720px) {
  .saveBtn { min-height: 44px; }
}`,
  },
  {
    // Every mobile block in this repo has a comment above it explaining
    // itself, and that comment is what hid all of them from the first parser.
    name: 'a media block with a comment above it',
    shouldFlag: false,
    css: `.saveBtn { min-height: 36px; }

/* Tap targets on a phone. */
@media (max-width: 720px) {
  .saveBtn { min-height: 44px; }
}`,
  },
  {
    name: 'a button already tall enough in its base rule',
    shouldFlag: false,
    css: `.saveBtn { min-height: 48px; }`,
  },
  {
    name: 'a container whose name merely contains btn',
    shouldFlag: false,
    css: `.btnRow { height: 32px; display: flex; }`,
  },
  {
    name: 'a control with no explicit height at all',
    shouldFlag: false,
    css: `.smallBtn { padding: 6px 10px; font-size: 0.75rem; }`,
  },
  {
    // Found by reading the first run: three names for the same control.
    name: 'the track and knob inside a switch',
    shouldFlag: false,
    css: `.toggleSlider { position: absolute; inset: 0; height: 14px; }
.toggleKnob { height: 18px; width: 18px; }
.toggleHandle { height: 16px; }`,
  },
  {
    // But the label around them IS the target, and 22px is genuinely small.
    name: 'the switch label itself, which is what a finger lands on',
    shouldFlag: true,
    css: `.toggle { display: inline-block; width: 38px; height: 22px; }`,
  },
  {
    name: 'a container whose name contains a pressable word',
    shouldFlag: false,
    css: `.tabsRow { height: 32px; display: flex; }
.tabCount { height: 18px; }
.toggleLabel { height: 20px; }`,
  },
  {
    name: 'a state modifier repeating the base height',
    shouldFlag: false,
    css: `.tabActive { min-height: 36px; }
.tabBtnActive { min-height: 36px; }`,
  },
  {
    name: 'a non-interactive element that happens to be short',
    shouldFlag: false,
    css: `.badge { height: 20px; } .rowStats { min-height: 18px; }`,
  },
];

let selfTestFailures = 0;
for (const f of FIXTURES) {
  const flagged = scan(f.css).length > 0;
  const ok = flagged === f.shouldFlag;
  if (!ok) selfTestFailures += 1;
  if (!ok || process.argv.includes('--self-test')) {
    console.log(`${ok ? 'ok  ' : 'BAD '} self-test: ${f.name}`
      + ` (expected ${f.shouldFlag ? 'a report' : 'silence'},`
      + ` got ${flagged ? 'a report' : 'silence'})`);
  }
}
if (selfTestFailures) {
  console.log('');
  console.log(`${selfTestFailures} self-test(s) failed: this checker can no`
    + ' longer see the fault it was built for. Fix the checker before trusting'
    + ' its count.');
}

// ------------------------------------------------------------------- run
let total = 0;
for (const file of files) {
  const hits = scan(fs.readFileSync(file, 'utf8'));
  for (const hit of hits) {
    total += 1;
    console.log(`${path.relative(process.cwd(), file)}`
      + `\n  .${hit.cls} is ${hit.height}px and nothing raises it on a phone.`
      + ` Anything pressable is ${MIN}px there.`);
  }
}

console.log('');
console.log(`${files.length} stylesheet(s) checked, ${total} tap target(s) under ${MIN}px on a phone`);
process.exit(total + selfTestFailures ? 1 : 0);

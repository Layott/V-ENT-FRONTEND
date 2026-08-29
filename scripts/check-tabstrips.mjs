#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * A horizontal strip that says it scrolls has to actually scroll.
 *
 * CEO, 29 August 2026: "the top nav cant be scrolled on mobile and that was on
 * an iPhone too." The tab strip on Edit My Profile had `overflow-x: auto` and
 * still would not move, which reads as a browser bug and is not one.
 *
 * The cause is the flex default. A flex item may shrink, so four tabs that do
 * not fit are squeezed until they do, the row ends up exactly as wide as its
 * container, and `scrollWidth === clientWidth`. The browser is right that there
 * is nothing to scroll. The text is clipped anyway because it cannot wrap, so
 * it looks broken and behaves as though it is not.
 *
 * The fix is one line per strip: children of a horizontally scrolling flex row
 * do not shrink. This checks it is present, because the failure is invisible on
 * a desktop and only shows up on a phone with a long label.
 *
 * Usage: node scripts/check-tabstrips.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOTS = [path.join(HERE, '..', 'src'), path.join(HERE, '..', 'public', 'styles')];

function cssFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) cssFiles(full, out);
    else if (e.name.endsWith('.css')) out.push(full);
  }
  return out;
}

/** Every `selector { ... }` in the file, flattened out of any media query. */
function rules(source) {
  // Comments first: a rule preceded by `/* Tabs */` would otherwise carry it
  // into the selector and never match its own child rule.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    out.push({ selector, body: m[2] });
  }
  return out;
}

const has = (body, prop, value) =>
  new RegExp(`(^|;|\\n)\\s*${prop}\\s*:\\s*${value}`, 'i').test(body);

const SCROLLS = (b) => has(b, 'overflow-x', '(auto|scroll)') || has(b, 'overflow', '(auto|scroll) ');
const IS_ROW = (b) =>
  (has(b, 'display', 'flex') && !has(b, 'flex-direction', 'column'))
  || has(b, 'flex-direction', 'row');
const NO_SHRINK = (b) =>
  has(b, 'flex-shrink', '0') || has(b, 'flex', '(0 0|none)');

const offenders = [];
let strips = 0;

for (const file of ROOTS.flatMap((r) => cssFiles(r))) {
  const css = fs.readFileSync(file, 'utf8');
  const all = rules(css);

  // A strip is a selector that somewhere in the file is both a flex row and a
  // horizontal scroller. The two halves are often in different blocks: the base
  // rule makes it a flex column, the phone media query turns it into a scrolling
  // row. So gather per selector.
  const bySelector = new Map();
  for (const r of all) {
    const cur = bySelector.get(r.selector) || '';
    bySelector.set(r.selector, `${cur};${r.body}`);
  }

  for (const [selector, body] of bySelector) {
    if (!SCROLLS(body) || !IS_ROW(body)) continue;
    if (selector.includes(',')) continue;
    strips += 1;

    // The guard: `<selector> > *` somewhere in the file, saying the children
    // keep their width. Written as its own rule so it is greppable.
    const guard = all.some((r) =>
      r.selector.startsWith(`${selector} > `) && NO_SHRINK(r.body));
    if (!guard) offenders.push(`${path.relative(path.join(HERE, '..'), file)}  ${selector}`);
  }
}

console.log(`scrolling rows found: ${strips}`);
if (offenders.length) {
  console.log(`\nCHILDREN CAN SHRINK, SO IT WILL NOT SCROLL (${offenders.length}):`);
  for (const o of offenders) console.log(`  ${o}`);
  process.exit(1);
}
console.log('every tab strip scrolls');

#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Desktop vs mobile parity, route by route.
 *
 * CEO, 29 August 2026: "ensure it has 100% parity with the desktop, make sure
 * all buttons show and work same as pages and sub pages."
 *
 * `audit-walk.js` already records every visible button and link per route. This
 * reads its two reports and answers one question per route: is there anything a
 * desktop visitor can press that a phone visitor cannot see?
 *
 * Compared by LABEL, not by count. A count tells you something moved; a label
 * tells you what went missing, which is the part somebody can act on. Labels
 * are normalised - trimmed, collapsed, lowercased, digits stripped - because
 * "3 open disputes" and "1 open dispute" are the same control.
 *
 * Also reports, per view, what the walk already knows: horizontal overflow,
 * console errors, failed requests and dead links. Those are not parity faults
 * but they are what a sweep is for, and having them in one table beats reading
 * two reports side by side.
 *
 * Usage:
 *   node scripts/parity.js
 *   node scripts/parity.js --full     # every route, not only the bad ones
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'audit-out');
const FULL = process.argv.includes('--full');

function load(view) {
  const file = path.join(OUT, `${view}-user`, 'report.json');
  if (!fs.existsSync(file)) {
    console.error(`missing ${file} - run: VIEW=${view} node scripts/audit-walk.js`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Normalise a control's label so the same control matches across views. */
function key(label) {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .replace(/\d+/g, '')
    .trim()
    .toLowerCase();
}

function controls(page) {
  const out = new Set();
  for (const b of page.buttons || []) {
    const k = key(b.label || b.text || b);
    // An unlabelled icon button cannot be matched by name and would otherwise
    // report as missing on every run. Counted separately below.
    if (k) out.add(`button:${k}`);
  }
  for (const a of page.links || []) {
    const k = key(a.label || a.text || a);
    if (k) out.add(`link:${k}`);
  }
  return out;
}

function iconCount(page) {
  const unlabelled = (list) => (list || []).filter((x) => !key(x.label || x.text || x)).length;
  return unlabelled(page.buttons) + unlabelled(page.links);
}

function byRoute(report) {
  const map = new Map();
  for (const p of report.pages || report.results || []) {
    map.set(p.route || p.path || p.url, p);
  }
  return map;
}

const desktop = byRoute(load('desktop'));
const mobile = byRoute(load('mobile'));

const rows = [];
let missingTotal = 0;

for (const [route, d] of desktop) {
  const m = mobile.get(route);
  if (!m) {
    rows.push({ route, verdict: 'NOT WALKED ON MOBILE', missing: [], extra: [] });
    continue;
  }
  const dc = controls(d);
  const mc = controls(m);
  const missing = [...dc].filter((c) => !mc.has(c));
  const extra = [...mc].filter((c) => !dc.has(c));

  // An icon-only control that exists on both sides in equal number is fine; a
  // shortfall on mobile is not, and it is invisible to the label comparison.
  const iconGap = Math.max(0, iconCount(d) - iconCount(m));

  missingTotal += missing.length + iconGap;
  rows.push({
    route,
    missing,
    extra,
    iconGap,
    overflowM: !!m.overflow,
    errsM: (m.consoleErrors || []).length,
    failsM: (m.failedRequests || []).length,
    deadM: (m.deadLinks || []).length,
  });
}

const bad = rows.filter(
  (r) => r.verdict || r.missing?.length || r.iconGap || r.overflowM || r.errsM || r.failsM || r.deadM,
);

console.log(`\nRoutes walked: desktop ${desktop.size}, mobile ${mobile.size}`);
console.log(`Routes with something to answer for: ${bad.length}\n`);

for (const r of FULL ? rows : bad) {
  const flags = [];
  if (r.overflowM) flags.push('SCROLLS SIDEWAYS');
  if (r.errsM) flags.push(`${r.errsM} console error(s)`);
  if (r.failsM) flags.push(`${r.failsM} failed request(s)`);
  if (r.deadM) flags.push(`${r.deadM} dead link(s)`);
  if (r.iconGap) flags.push(`${r.iconGap} icon control(s) fewer`);

  console.log(`${r.route}`);
  if (r.verdict) console.log(`   ${r.verdict}`);
  if (flags.length) console.log(`   ${flags.join(' | ')}`);
  if (r.missing?.length) {
    console.log(`   MISSING ON MOBILE (${r.missing.length}):`);
    for (const c of r.missing.slice(0, 12)) console.log(`      - ${c}`);
    if (r.missing.length > 12) console.log(`      ... and ${r.missing.length - 12} more`);
  }
  console.log('');
}

console.log(missingTotal === 0
  ? 'PARITY: every control on desktop is present on mobile.'
  : `PARITY: ${missingTotal} control(s) missing on mobile across ${bad.length} route(s).`);

process.exit(missingTotal === 0 && bad.every((r) => !r.overflowM) ? 0 : 1);

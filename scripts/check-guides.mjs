#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Every route has a guide, and every guide describes a real route.
 *
 * The CEO asked for help on "every page and sub page". A registry keyed by
 * pattern is easy to write and easy to leave a hole in - somebody adds a route
 * and the help button silently does not appear on it, which is invisible unless
 * you happen to open that page.
 *
 * So this walks `src/app` the same way the audit walker does, and checks both
 * directions: no route without a guide, and no guide pointing at a route that
 * no longer exists.
 *
 * Usage: node scripts/check-guides.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'src', 'app');

// Route groups `(admin)` do not appear in the URL. Private folders `_x` and
// api routes are not pages.
function discover(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith('_') || name === 'api') continue;
    const full = path.join(dir, name);
    const segment = name.startsWith('(') && name.endsWith(')') ? '' : `/${name}`;
    const route = `${prefix}${segment}`;
    if (fs.existsSync(path.join(full, 'page.js')) || fs.existsSync(path.join(full, 'page.jsx'))) {
      out.push(route || '/');
    }
    out.push(...discover(full, route));
  }
  return out;
}

const routes = [...new Set(
  (fs.existsSync(path.join(APP, 'page.js')) ? ['/'] : []).concat(discover(APP)),
)].sort();

// Read the guide keys out of the source rather than importing it: the module is
// JSX-free but lives in a Next app that expects its own resolver, and a regex
// over the keys is enough to answer the question.
const src = fs.readFileSync(
  path.join(HERE, '..', 'src', 'components', 'page-help', 'pageGuides.js'), 'utf8');
const patterns = [...src.matchAll(/^\s{2}'(\/[^']*)':\s*\{/gm)].map((m) => m[1]);

/** The same matching the component does: exact, then most-literal pattern. */
function guideFor(route) {
  if (patterns.includes(route)) return route;
  const parts = route.split('/').filter(Boolean);
  let best = null;
  let bestLiterals = -1;
  for (const pattern of patterns) {
    const wanted = pattern.split('/').filter(Boolean);
    if (wanted.length !== parts.length) continue;
    if (!wanted.every((s, i) => s.startsWith(':') || s === parts[i])) continue;
    const literals = wanted.filter((s) => !s.startsWith(':')).length;
    if (literals > bestLiterals) { best = pattern; bestLiterals = literals; }
  }
  return best;
}

// Next's `[slug]` is this registry's `:slug`.
const normalise = (r) => r.replace(/\[\.{3}([^\]]+)\]/g, ':$1').replace(/\[([^\]]+)\]/g, ':$1');

const missing = [];
for (const route of routes) {
  if (!guideFor(normalise(route))) missing.push(route);
}

const used = new Set(routes.map((r) => guideFor(normalise(r))).filter(Boolean));
const orphans = patterns.filter((p) => !used.has(p));

console.log(`routes discovered: ${routes.length}`);
console.log(`guides written:    ${patterns.length}`);

if (missing.length) {
  console.log(`\nNO GUIDE (${missing.length}):`);
  for (const r of missing) console.log(`  ${r}`);
}
if (orphans.length) {
  console.log(`\nGuide for a route that does not exist (${orphans.length}):`);
  for (const p of orphans) console.log(`  ${p}`);
}

if (!missing.length) console.log('\nevery route has a guide');
process.exit(missing.length ? 1 : 0);

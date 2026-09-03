// The event console's tabs and the strip that draws them must be one list.
//
// They were two. `TABS` in src/app/events/manage/page.js decides which panel
// renders; `CONSOLE_TABS` in EventConsoleTabs.js decides which chips a person
// can press. A tab in one and not the other is invisible in both directions
// and silent in both:
//
//   only in TABS         a panel that exists and nothing can reach
//   only in CONSOLE_TABS a chip that selects a tab rendering nothing, so the
//                        console looks broken on press
//
// The second is what shipped: the strip and the page drifted, which is why
// this check exists at all.
//
//   node scripts/check-event-tabs.mjs
//   node scripts/check-event-tabs.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.join(HERE, '..', 'src', 'app', 'events', 'manage', 'page.js');
const STRIP = path.join(HERE, '..', 'src', 'components', 'event-console-tabs', 'EventConsoleTabs.js');

/** `const TABS = ['tickets', 'money', ...]`, however it is wrapped. */
export function pageTabs(source) {
  const m = /const TABS\s*=\s*\[([\s\S]*?)\]/.exec(source);
  if (!m) return [];
  return [...m[1].matchAll(/'([a-z0-9_-]+)'/g)].map((x) => x[1]);
}

/** `export const CONSOLE_TABS = [['tickets', 'key', 'Fallback'], ...]`. */
export function stripTabs(source) {
  const m = /CONSOLE_TABS\s*=\s*\[([\s\S]*?)\n\];/.exec(source);
  if (!m) return [];
  // The id is the first string of each row.
  return [...m[1].matchAll(/\[\s*'([a-z0-9_-]+)'/g)].map((x) => x[1]);
}

/** Aliases let an old link keep working and are not a drift. */
export function aliases(source) {
  const m = /TAB_ALIASES\s*=\s*\{([\s\S]*?)\}/.exec(source);
  if (!m) return {};
  const out = {};
  for (const [, from, to] of m[1].matchAll(/([a-z0-9_-]+)\s*:\s*'([a-z0-9_-]+)'/g)) out[from] = to;
  return out;
}

export function findingsIn(pageSource, stripSource) {
  const page = new Set(pageTabs(pageSource));
  const strip = new Set(stripTabs(stripSource));
  const alias = aliases(pageSource);
  const out = [];

  for (const id of strip) {
    if (page.has(id)) continue;
    if (alias[id] && page.has(alias[id])) continue;
    out.push(`the strip offers "${id}" and the page renders nothing for it`);
  }
  // A chip carrying an old name still reaches the panel it aliases to, so
  // that panel IS reachable. Reporting it would be a false positive, and a
  // checker that cries wolf is one people stop reading.
  const reachable = new Set(strip);
  for (const [from, to] of Object.entries(alias)) {
    if (strip.has(from)) reachable.add(to);
  }
  for (const id of page) {
    if (!reachable.has(id)) out.push(`the page renders "${id}" and no chip reaches it`);
  }
  return out;
}

/* ------------------------------------------------------------------ self-test */

const PAGE_OK = `
const TABS = ['tickets', 'money', 'team'];
const TAB_ALIASES = { overlays: 'production' };
`;
const STRIP_OK = `
export const CONSOLE_TABS = [
  ['tickets', 'k.tickets', 'Tickets'],
  ['money', 'k.money', 'Money'],
  ['team', 'k.team', 'Team'],
];
`;
const STRIP_EXTRA = `
export const CONSOLE_TABS = [
  ['tickets', 'k.tickets', 'Tickets'],
  ['money', 'k.money', 'Money'],
  ['team', 'k.team', 'Team'],
  ['vendors', 'k.vendors', 'Vendors'],
];
`;
const PAGE_EXTRA = `
const TABS = ['tickets', 'money', 'team', 'polls'];
const TAB_ALIASES = { overlays: 'production' };
`;
const PAGE_ALIASED = `
const TABS = ['tickets', 'money', 'team', 'production'];
const TAB_ALIASES = { overlays: 'production' };
`;
const STRIP_ALIASED = `
export const CONSOLE_TABS = [
  ['tickets', 'k.tickets', 'Tickets'],
  ['money', 'k.money', 'Money'],
  ['team', 'k.team', 'Team'],
  ['overlays', 'k.overlays', 'Overlays'],
];
`;

if (process.argv.includes('--self-test')) {
  const cases = [
    ['both lists agree', PAGE_OK, STRIP_OK, 0],
    ['a chip that renders nothing', PAGE_OK, STRIP_EXTRA, 1],
    ['a panel nothing reaches', PAGE_EXTRA, STRIP_OK, 1],
    ['an old chip name that aliases to a real panel', PAGE_ALIASED, STRIP_ALIASED, 0],
    ['a panel reachable by no chip and no alias', PAGE_EXTRA, STRIP_ALIASED, 2],
  ];
  let bad = 0;
  for (const [what, page, strip, expected] of cases) {
    const got = findingsIn(page, strip).length;
    if (got !== expected) { console.error(`SELF-TEST ${what}: expected ${expected}, got ${got}`); bad += 1; }
    else console.log(`ok: ${what} -> ${got}`);
  }
  if (bad) process.exit(1);
  console.log('self-test: catches drift in both directions');
  process.exit(0);
}

/* ---------------------------------------------------------------- the sweep */

const findings = findingsIn(fs.readFileSync(PAGE, 'utf8'), fs.readFileSync(STRIP, 'utf8'));
if (findings.length) {
  console.error(`${findings.length} disagreement(s) between the event console's tabs:\n`);
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('the event console tabs and the strip carry the same ids');

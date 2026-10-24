#!/usr/bin/env node
/**
 * A public record page serves its h1 and its words in the HTML.
 *
 * Written 24 October 2026 (inbox 517). A tournament page's served HTML had a
 * title and no h1: the page underneath is a client page that reads the address
 * in the browser, so the server sends only its Suspense fallback, and that
 * fallback was an empty dark box. The same box sat in front of events, teams,
 * organisations, memberships and listings: six routes, one fault. The CEO's
 * rule (26 August): "a content page answers 200 with its h1 and its copy in
 * the served HTML".
 *
 * The rule here: a route that describes a public record on the server (its
 * page or its layout fetches the record with fetchRecordForMetadata or
 * fetchForMetadata) must not hand its Suspense the empty fallback. Its fallback
 * is <ServedSummary>, which carries the record's name as the h1. A private
 * route (no record fetched on the server) is left alone.
 *
 *   node scripts/check-served-h1.mjs
 *   node scripts/check-served-h1.mjs --self-test
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const APP = join(ROOT, 'src', 'app');

const DESCRIBES = /\bfetch(?:Record)?ForMetadata\s*\(/;
// A Suspense fallback that draws nothing but a box, however it is styled.
const EMPTY_FALLBACK = /fallback=\{<div\s+style=\{\{[^}]*\}\}\s*\/>\}/;

/** `true` when this page serves a record page with no words, else `false`. */
export function faulty(page, layout = '') {
  const describes = DESCRIBES.test(page) || DESCRIBES.test(layout);
  return describes && EMPTY_FALLBACK.test(page);
}

function pages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) pages(path, out);
    else if (name === 'page.js') out.push(path);
  }
  return out;
}

// --------------------------------------------------------------- self-test
const FIXTURES = [
  // The real fault: the page describes its record and serves an empty box.
  [`const load = (slug) => fetchRecordForMetadata(\`/tournament/view-tournament/\${slug}/\`);
    return <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}><C /></Suspense>;`,
   '', true],
  // The layout describes the record; the client page serves the empty box.
  [`'use client';
    return <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}><C /></Suspense>;`,
   `const load = (slug) => fetchRecordForMetadata(\`/organization/\${slug}/\`);`, true],
  // Fixed: the fallback names the record.
  [`const load = (slug) => fetchRecordForMetadata(\`/event/view-event/\${slug}/\`);
    return <Suspense fallback={<ServedSummary title={e?.name} description={described?.description} />}><C /></Suspense>;`,
   '', false],
  // A private page: nothing is described on the server, the empty box is fine.
  [`'use client';
    return <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}><Wallet /></Suspense>;`,
   '', false],
  // The listing helper is a record fetch too.
  [`const load = (slug) => fetchForMetadata(\`/marketplace/listings/\${slug}/\`);
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>`,
   '', true],
];

let bad = 0;
FIXTURES.forEach(([page, layout, expected], i) => {
  if (faulty(page, layout) !== expected) {
    console.error(`self-test FAILED on case ${i + 1}: expected ${expected}`);
    bad += 1;
  }
});
if (process.argv.includes('--self-test')) {
  console.log(`served h1 self-test: ${FIXTURES.length - bad}/${FIXTURES.length} cases pass`);
  process.exit(bad ? 1 : 0);
}
if (bad) {
  console.error('the matcher is wrong, so its count means nothing');
  process.exit(2);
}

const found = [];
for (const path of pages(APP)) {
  const layoutPath = join(dirname(path), 'layout.js');
  const layout = existsSync(layoutPath) ? readFileSync(layoutPath, 'utf8') : '';
  if (faulty(readFileSync(path, 'utf8'), layout)) found.push(relative(ROOT, path));
}
for (const path of found) {
  console.log(`  ${path}: describes a public record but serves an empty fallback (no h1)`);
}
console.log(`served h1: ${found.length} record page(s) serve no h1`);
process.exit(found.length ? 1 : 0);

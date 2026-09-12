// A record page must not describe an API outage as "not found".
//
// `fetchForMetadata` answers `null` for two different facts: the record does
// not exist, and the request never came back. Every record route read `null`
// as the first, so while the API was down each event, tournament, team and
// player page was served with the title "Event not found" and `noindex`, which
// is the one instruction a search engine acts on at once. The client half of
// this fault is `check-spinner-forever`; this is the server half, and it is the
// second time the class has been found, which is what makes it a catcher.
//
// The rule: a server route whose metadata can say "not found" reads its record
// through `fetchRecordForMetadata`, which answers `FAILED` for a request that
// failed, and either handles `__failed` itself or hands the record to a builder
// in seo.js that does (`eventMetadata`, `tournamentMetadata`).
//
//   node scripts/check-metadata-outage.mjs
//   node scripts/check-metadata-outage.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'src', 'app');

// Builders in seo.js that already tell a failure from a missing record.
const AWARE_BUILDERS = /\b(eventMetadata|tournamentMetadata)\s*\(/;

/**
 * One route's verdict, from its source alone.
 * @returns {string|null} the fault, or null when the route is fine.
 */
export function faultIn(source) {
  const saysNotFound = /title:\s*['"`][^'"`]*not found[^'"`]*['"`]/i.test(source);
  if (!saysNotFound) return null;
  const usesNull = /\bfetchForMetadata\s*\(/.test(source);
  const usesAware = /\bfetchRecordForMetadata\s*\(/.test(source);
  if (usesNull && !usesAware) {
    return 'says "not found" from fetchForMetadata, which cannot tell an outage from a missing record';
  }
  if (!usesAware) return null;
  const handles = /__failed/.test(source) || AWARE_BUILDERS.test(source);
  if (!handles) {
    return 'reads through fetchRecordForMetadata but never checks __failed, so the outage still reads as "not found"';
  }
  return null;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/^(page|layout)\.js$/.test(entry.name)) out.push(p);
  }
  return out;
}

/**
 * The builders a route may lean on live in seo.js, out of the route's sight.
 * Each one must check `__failed` itself, or every route trusting it is wrong.
 */
export function builderFaults(seoSource) {
  const out = [];
  for (const name of ['eventMetadata', 'tournamentMetadata']) {
    const m = new RegExp(`export function ${name}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`).exec(seoSource);
    if (!m) out.push(`${name} is not in seo.js, and the routes still call it`);
    else if (!/__failed/.test(m[1])) out.push(`${name} in seo.js never checks __failed`);
  }
  return out;
}

export function run() {
  const files = walk(APP);
  const faults = [];
  let checked = 0;
  for (const fault of builderFaults(fs.readFileSync(path.join(HERE, '..', 'src', 'lib', 'seo.js'), 'utf8'))) {
    faults.push({ file: 'src/lib/seo.js', fault });
  }
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (!/generateMetadata/.test(src)) continue;
    checked += 1;
    const fault = faultIn(src);
    if (fault) faults.push({ file: path.relative(path.join(HERE, '..'), f), fault });
  }
  return { checked, faults };
}

/* ------------------------------------------------------------------ self-test */

const OLD_SHAPE = `
import { buildMetadata, fetchForMetadata } from '@/lib/seo';
const load = (slug) => fetchForMetadata(\`/team/view-team/\${slug}/\`);
export async function generateMetadata({ params }) {
  const team = await load(params.slug);
  if (!team) return buildMetadata({ title: 'Team not found', noindex: true });
  return buildMetadata({ title: team.team_name });
}`;

const FIXED_SHAPE = `
import { buildMetadata, fetchRecordForMetadata, unavailableMetadata } from '@/lib/seo';
const load = (slug) => fetchRecordForMetadata(\`/team/view-team/\${slug}/\`);
export async function generateMetadata({ params }) {
  const team = await load(params.slug);
  if (team?.__failed) return unavailableMetadata(params.slug, '/teams/x');
  if (!team) return buildMetadata({ title: 'Team not found', noindex: true });
  return buildMetadata({ title: team.team_name });
}`;

const HALF_FIXED = `
import { buildMetadata, fetchRecordForMetadata } from '@/lib/seo';
const load = (slug) => fetchRecordForMetadata(\`/team/view-team/\${slug}/\`);
export async function generateMetadata({ params }) {
  const team = await load(params.slug);
  if (!team) return buildMetadata({ title: 'Team not found', noindex: true });
  return buildMetadata({ title: team.team_name });
}`;

const VIA_BUILDER = `
import { eventMetadata, fetchRecordForMetadata } from '@/lib/seo';
const load = (slug) => fetchRecordForMetadata(\`/event/view-event/\${slug}/\`);
export async function generateMetadata({ params }) {
  return eventMetadata(await load(params.slug), params.slug);
}`;

// Degrading gracefully is allowed: a docs page that reads live examples and
// renders without them says nothing about "not found", so it is not this fault.
const GRACEFUL = `
import { buildMetadata, fetchForMetadata } from '@/lib/seo';
export async function generateMetadata() {
  const offer = await fetchForMetadata('/auth/premium/offer/');
  return buildMetadata({ title: offer?.name || 'Premium' });
}`;

// Importable for its `faultIn` without running: only the command line runs.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const cases = [
    ['the old shape, null read as not found', OLD_SHAPE, true],
    ['the fixed shape with its own __failed branch', FIXED_SHAPE, false],
    ['aware fetch but no __failed branch', HALF_FIXED, true],
    ['handled inside eventMetadata', VIA_BUILDER, false],
    ['graceful degradation with no not-found title', GRACEFUL, false],
  ];
  let bad = 0;
  const builders = [
    ['a builder that checks __failed', `export function eventMetadata(e, slug) {
  if (e?.__failed) return x;
  return y;
}
export function tournamentMetadata(t, slug) {
  if (t?.__failed) return x;
  return y;
}`, 0],
    ['a builder that reads null as not found', `export function eventMetadata(e, slug) {
  if (!e) return notFound;
  return y;
}
export function tournamentMetadata(t, slug) {
  if (t?.__failed) return x;
  return y;
}`, 1],
  ];
  for (const [what, src, expected] of builders) {
    const got = builderFaults(src).length;
    if (got !== expected) { bad += 1; console.log(`FAIL: ${what} -> ${got} fault(s), expected ${expected}`); }
    else console.log(`ok: ${what} -> ${got} fault(s)`);
  }
  for (const [what, src, expectFault] of cases) {
    const got = !!faultIn(src);
    if (got !== expectFault) { bad += 1; console.log(`FAIL: ${what} -> fault=${got}, expected ${expectFault}`); }
    else console.log(`ok: ${what} -> fault=${got}`);
  }
  if (bad) process.exit(1);
  console.log('self-test: catches the old shape and the half fix, passes the fixed shapes');
  process.exit(0);
}

if (isMain) {
  const { checked, faults } = run();
  for (const { file, fault } of faults) console.log(`  ${file}: ${fault}`);
  console.log(`${checked} metadata route(s) checked, ${faults.length} that describe an outage as not found`);
  process.exit(faults.length ? 1 : 0);
}

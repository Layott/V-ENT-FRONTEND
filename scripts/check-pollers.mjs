#!/usr/bin/env node
/**
 * Every file that polls the API on a timer must handle being asked to slow down.
 *
 * CEO, 3 September 2026: "ensure to create catchers for errors that have
 * happended more than once pleasse, add this as a rule."
 *
 * This one happened twice:
 *
 *   1. 29 August: nginx throttled the admin console at 5 requests a minute.
 *      The console fetched several endpoints per page, got 429s with no CORS
 *      headers on them, and reported itself to the operator as "connection
 *      lost". Fixed by giving the console its own zone.
 *   2. 3 September: an overlay open in OBS asked /overlay-feed/ about
 *      twenty-five times a second. Every request counted against the
 *      organiser's own address, so their console read "Could not reach the
 *      server" for a minute at a time. Fixed by a feed lane, a microcache,
 *      and a backoff in the two pollers.
 *
 * Same class both times: a page polls, the server refuses, and the page keeps
 * asking at the same rate while somebody stares at a broken screen. So: a file
 * that polls must both refuse to stack requests and back off when refused.
 *
 *   node scripts/check-pollers.mjs
 *
 * Exits non-zero when a poller has no backoff. Self-tests the matcher on
 * fixtures of both shapes, because a checker that reports 0 has two meanings.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');

// A file polls if it arms a repeating timer whose body reaches the API.
const POLLS = /setInterval\s*\(/;
const FETCHES = /fetch\s*\(/;
// It is safe if it notices a refusal and waits: any of these.
const BACKS_OFF = /(429|pausedUntil|backoff|retryAfter|Retry-After|stopPolling|clearInterval)/;
// And it should not stack: one in flight at a time.
const GUARDS = /(inFlight|isFetching|busyRef|abort(Controller)?)/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(path, out);
    } else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.mjs')) {
      out.push(path);
    }
  }
  return out;
}

// How often it asks. A poll every few seconds stacks and starves an address;
// one every half minute does neither, so the same missing guard is a different
// size of problem. Graded rather than counted, because a checker that reports
// harmless code is one people stop reading.
const FAST_MS = 5000;

function fastestInterval(source) {
  let fastest = Infinity;
  const call = /setInterval\s*\([\s\S]{0,400}?,\s*([A-Za-z_$][\w$.]*|\d+)\s*\)/g;
  let match;
  while ((match = call.exec(source)) !== null) {
    const raw = match[1];
    let ms = Number(raw);
    if (Number.isNaN(ms)) {
      // A named constant: read its value from the same file.
      const named = new RegExp(`(?:const|let|var)\\s+${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(\\d+)`);
      const found = source.match(named);
      ms = found ? Number(found[1]) : NaN;
    }
    if (!Number.isNaN(ms)) fastest = Math.min(fastest, ms);
  }
  return fastest;
}

/** The verdict for one file's source. Exported shape, so the self-test uses it. */
export function verdict(source) {
  if (!POLLS.test(source) || !FETCHES.test(source)) return 'not a poller';
  const every = fastestInterval(source);
  if (!BACKS_OFF.test(source)) return every <= FAST_MS ? 'no backoff' : 'no backoff (slow)';
  if (!GUARDS.test(source)) return every <= FAST_MS ? 'may stack' : 'may stack (slow)';
  return 'ok';
}

/** Only the fast ones fail the build. The slow ones are printed and counted. */
const SEVERE = new Set(['no backoff', 'may stack']);

// --------------------------------------------------------------- self-test
// Deliberately attacking a passing gate: fixtures of the real faults.
const FIXTURES = [
  [`useEffect(() => { const t = setInterval(() => { fetch(url); }, 1000); }, []);`,
   'no backoff'],
  [`useEffect(() => { const t = setInterval(async () => {
      const r = await fetch(url); if (r.status === 429) return; }, 1000); }, []);`,
   'may stack'],
  [`useEffect(() => { const t = setInterval(async () => {
      if (inFlight.current) return; inFlight.current = true;
      const r = await fetch(url); if (r.status === 429) pausedUntil.current = Date.now() + 5000;
      inFlight.current = false; }, 1000); }, []);`,
   'ok'],
  [`export default function Page() { return <p>{fetch ? 1 : 2}</p>; }`, 'not a poller'],
  // Half a minute apart: the same missing guard, and not a problem.
  [`useEffect(() => { const t = setInterval(() => { fetch(url); }, 30000); }, []);`,
   'no backoff (slow)'],
  // A named constant, read from the same file.
  [`const REFRESH_MS = 8000;
    useEffect(() => { const t = setInterval(async () => {
      const r = await fetch(url); if (r.status === 429) return; }, REFRESH_MS); }, []);`,
   'may stack (slow)'],
];

let selfTestFailed = false;
for (const [source, expected] of FIXTURES) {
  const got = verdict(source);
  if (got !== expected) {
    console.error(`self-test FAILED: expected "${expected}", got "${got}"`);
    selfTestFailed = true;
  }
}
if (selfTestFailed) {
  console.error('the matcher is wrong, so its count means nothing');
  process.exit(2);
}

// ------------------------------------------------------------------- scan
const severe = [];
const slow = [];
let pollers = 0;
for (const path of walk(SRC)) {
  const source = readFileSync(path, 'utf8');
  const answer = verdict(source);
  if (answer === 'not a poller') continue;
  pollers += 1;
  if (answer === 'ok') continue;
  (SEVERE.has(answer) ? severe : slow).push(`${relative(ROOT, path)}: ${answer}`);
}

for (const line of severe) console.log(line);
for (const line of slow) console.log(line);
console.log(`${severe.length} poller(s) asking every ${FAST_MS / 1000}s or faster with no backoff`
  + `, ${slow.length} slower one(s) noted, of ${pollers} that poll`);
process.exit(severe.length === 0 ? 0 : 1);

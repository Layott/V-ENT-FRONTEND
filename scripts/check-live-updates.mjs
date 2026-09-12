#!/usr/bin/env node
/**
 * A refresh timer that can be torn down by a re-render is a refresh that never
 * happens.
 *
 * CEO, 6 September 2026: "For the refresh never firing, please build a checker
 * for it. also for all models that are currently existing and for future ones
 * that will be built, please make sure it is fixed."
 *
 *   node scripts/check-live-updates.mjs
 *   node scripts/check-live-updates.mjs --self-test
 *   node scripts/check-live-updates.mjs --baseline
 *
 * ## The fault
 *
 * The door list shipped this, and it looked completely correct:
 *
 *   useEffect(() => { ... setTimeout(tick, 10000) ... },
 *             [token, eventId, load, loadSummary]);
 *
 * `load` is a `useCallback` whose deps include `tt` from `useT()`, and `useT()`
 * returns a new function on most renders. So `load` changed identity on most
 * renders, the effect tore its timer down and armed a fresh one every time, and
 * the 10 second timer never survived to fire. Measured in Chrome: twenty
 * seconds on a visible tab, zero requests. Nothing errored, nothing was empty,
 * the list rendered. It simply never updated.
 *
 * ## What this looks for
 *
 * A timer-arming effect whose dependency array names a FUNCTION defined in the
 * same file. That is the shape, and it is decidable without running anything:
 * collect the names bound to `useCallback`, to arrow functions and to `function`
 * declarations in the file, then read the deps of every effect that arms a
 * timer and reaches the network.
 *
 * Passing it means one of two things, and both are fine:
 *
 *   1. the page uses `useLiveData`, which holds its fetcher in a ref; or
 *   2. the effect depends only on primitives and calls through a ref itself.
 *
 * ## Calibration
 *
 * An effect that arms a timer for something OTHER than refreshing - a clock
 * ticking, a toast dismissing, a debounce - is not a poller and is not
 * reported. The body has to reach the network, directly or through a named
 * function that does. That is the same judgement `check-pollers.mjs` had to
 * make, and getting it wrong in either direction produces a checker nobody
 * reads. See [[feedback_checker_calibration]].
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(HERE, 'live-updates-baseline.json');

const TIMER = /\b(setTimeout|setInterval)\s*\(/;
const NETWORK = /\bfetch\s*\(|\bgetSession\s*\(|\baxios\b/;

/** Balance brackets from `open` (index of the opening one) and return the body. */
function balanced(source, open, opener = '(', closer = ')') {
  let depth = 1;
  let i = open + 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === opener) depth += 1;
    else if (ch === closer) depth -= 1;
    i += 1;
  }
  return { body: source.slice(open + 1, i - 1), end: i };
}

/** Names bound to a function in this file, and whether that function reaches the network. */
export function functionsIn(source) {
  const out = new Map();
  const decl = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:useCallback\s*\(\s*)?(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{|function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = decl.exec(source)) !== null) {
    const name = m[1] || m[2];
    const brace = source.indexOf('{', m.index + m[0].length - 1);
    if (brace < 0) continue;
    const { body } = balanced(source, brace, '{', '}');
    out.set(name, NETWORK.test(body));
  }
  return out;
}

/** Every `useEffect(...)` in the file, as { body, deps }. */
export function effectsIn(source) {
  const out = [];
  const opener = /useEffect\s*\(/g;
  let m;
  while ((m = opener.exec(source)) !== null) {
    const open = m.index + m[0].length - 1;
    const { body: whole } = balanced(source, open);
    // The dependency array is the last top-level [ ... ] in the call.
    const lastBracket = whole.lastIndexOf('[');
    const deps = lastBracket === -1
      ? null
      : whole.slice(lastBracket + 1, whole.lastIndexOf(']'));
    const fn = lastBracket === -1 ? whole : whole.slice(0, lastBracket);
    out.push({ body: fn, deps });
  }
  return out;
}

export function findingsIn(source, file) {
  // The hook itself is allowed to do this; it is the thing that does it right.
  if (/src[\\/]lib[\\/]useLiveData\.js$/.test(file)) return [];
  // A page that uses the hook has already delegated the problem.
  const usesHook = /useLiveData\s*\(/.test(source);

  const fns = functionsIn(source);
  const out = [];

  for (const effect of effectsIn(source)) {
    if (!TIMER.test(effect.body)) continue;

    // Does this effect actually refresh anything?
    //
    // `name(` is not enough: `setInterval(refresh, 8000)` hands the function
    // over by REFERENCE and never calls it in the body, which is the most
    // common way a poller is written. So a bare mention of a fetching
    // function counts too. Caught by the self-test rather than by review.
    const callsNetwork = NETWORK.test(effect.body)
      || [...fns.entries()].some(([name, reaches]) =>
        reaches && new RegExp(`\\b${name}\\b`).test(effect.body));
    if (!callsNetwork) continue;

    if (usesHook) continue;

    const deps = (effect.deps || '').split(',').map(d => d.trim()).filter(Boolean);
    const unstable = deps.filter((d) => {
      const bare = d.replace(/\?\./g, '.').split('.')[0];
      return fns.has(bare);
    });

    if (unstable.length) {
      out.push({
        file,
        id: 'timer-depends-on-a-function',
        names: unstable,
        why: `the effect arms a timer and depends on ${unstable.join(', ')}, `
           + 'which is defined in this file. A re-render that changes its '
           + 'identity tears the timer down before it can fire.',
      });
    }
  }
  return out;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, acc);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

// --------------------------------------------------------------- self-test
//
// A checker reporting 0 means "clean" OR "broken", and nothing tells them
// apart. This does. Every fixture is a real shape from this codebase.

const BAD_REAL = `
const load = useCallback(async () => { await fetch(url); }, [token, tt]);
const loadSummary = useCallback(async () => { await fetch(u2); }, [token]);
useEffect(() => {
  const tick = async () => { await load(false); timer = setTimeout(tick, wait); };
  timer = setTimeout(tick, 10000);
  return () => clearTimeout(timer);
}, [token, eventId, load, loadSummary]);
`;

const BAD_INTERVAL = `
const refresh = async () => { const r = await fetch(url); return r.json(); };
useEffect(() => {
  const id = setInterval(refresh, 8000);
  return () => clearInterval(id);
}, [refresh]);
`;

const GOOD_REF = `
const load = useCallback(async () => { await fetch(url); }, [token, tt]);
const loadRef = useRef(load);
useEffect(() => { loadRef.current = load; }, [load]);
useEffect(() => {
  const tick = async () => { await loadRef.current(false); timer = setTimeout(tick, wait); };
  timer = setTimeout(tick, 10000);
  return () => clearTimeout(timer);
}, [token, eventId]);
`;

const GOOD_HOOK = `
const { data } = useLiveData(async () => {
  const res = await fetch(url); return res.json();
}, [token, eventId], { interval: 15000 });
`;

// Calibration: a timer that is not a poller.
const CLOCK = `
const [now, setNow] = useState(Date.now());
const format = (d) => new Date(d).toISOString();
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, [format]);
`;

const DEBOUNCE = `
const search = async (q) => { await fetch(url + q); };
useEffect(() => {
  const id = setTimeout(() => { setTerm(raw); }, 350);
  return () => clearTimeout(id);
}, [raw]);
`;

// ===================================================================== part 2
//
// A page that fetches and NEVER refreshes.
//
// Part 1 above catches a refresh timer that cannot fire. This catches the
// other half of the CEO's ask, and the one that was actually missed:
//
//   CEO, 6 September: "i want all pages on the site to be updating
//   automatically on its own without users having to refresh"
//   CEO, 7 September: "useLiveData is imported by nothing"
//
// Both were true at once. The primitive existed, the dead-timer checker
// reported zero, and 67 of 73 fetching pages simply never asked again. A
// checker that reports 0 while the ask is unmet is the exact failure the CEO
// named about check-seo sitting at 60 for weeks.
//
// ## Why there is a list of exemptions rather than a clever rule
//
// Refreshing underneath somebody who is typing replaces what they wrote with
// what the server still thinks, and a wizard three steps in loses all three.
// So a form must NEVER auto-refresh, and no amount of static analysis reliably
// tells a form from a table. Naming them, with the reason, is honest and is
// the same shape as DELIBERATE in tools/endpoint-callers.py.
const NEVER_REFRESHES = {
  // Forms and wizards. Refreshing would clobber what somebody is typing.
  'src/app/events/create-event/page.js': 'the event wizard',
  'src/app/events/edit-event/page.js': 'a form',
  'src/app/tournaments/create-tournament/page.js': 'the tournament wizard',
  'src/app/tournaments/edit-tournament/page.js': 'a form',
  'src/app/organizations/create/page.js': 'a form',
  'src/app/organizations/manage/page.js': 'a management form',
  'src/app/teams/create-team/page.js': 'a form',
  'src/app/community/scrim/create/page.js': 'a form',
  'src/app/wallets/send/page.js': 'a form that moves money',
  'src/app/wallets/withdraw/page.js': 'a form that moves money',
  'src/app/wallets/topup/page.js': 'a form that moves money',
  'src/app/wallets/pin/page.js': 'sets a PIN',
  'src/app/wallets/verify/page.js': 'a form',
  'src/app/feedback/page.js': 'a form',
  'src/app/user-profile/page.js': 'carries the profile edit panels',
  'src/app/settings/page.js': 'settings are forms',
  'src/app/events/find-ticket/page.js': 'a lookup form',
  'src/app/events/checkout/page.js': 'a checkout form',

  // One-shot and terminal pages. There is nothing to come back for.
  'src/app/login/page.js': 'one-shot',
  'src/app/signup/page.js': 'one-shot',
  'src/app/forgot-password/page.js': 'one-shot',
  'src/app/verify-email/page.js': 'one-shot',
  'src/app/email-verified/[key]/[value]/page.js': 'terminal',
  'src/app/events/ticket-confirmed/page.js': 'a receipt',
  'src/app/events/check-in/[code]/page.js': 'one-shot self check-in',
  'src/app/teams/join/[token]/page.js': 'one-shot join',
  'src/app/partners/authorize/page.js': 'a one-shot consent screen',
  'src/app/claim/page.js': 'one-shot',
  'src/app/wallet-topup-callback/page.js': 'a payment return',
  'src/app/api/auth/session-handler/page.js': 'a redirect shim',

  'src/app/(admin)/admin/settings/page.js': 'settings are forms',
  'src/app/edit-team-profile/page.js': 'a form',
  'src/app/edit-user-profile/page.js': 'a form',
  'src/app/reset-email/page.js': 'one-shot',
  'src/app/reset-password/page.js': 'one-shot',
  'src/app/auth/external/page.js': 'a one-shot sign-in handoff',
  'src/app/claim/[token]/page.js': 'one-shot',

  // Results follow the query, not the clock. Re-running somebody's search
  // underneath them every twenty seconds would reorder what they are reading
  // for no reason they asked for.
  'src/app/search/page.js': 'results follow the query, not the clock',

  // Drawn by a browser source in OBS, which runs its own loop in
  // static/overlay-runtime.js rather than React's.
  'src/app/tournaments/overlay/page.js': 'drawn inside OBS by the overlay runtime',
};

const REFRESHES = /useAutoRefresh|useLiveData|setInterval|visibilitychange/;

// Split out so the self-test can drive it with a fixture rather than the real
// tree. A checker that only ever runs against the codebase it is checking
// cannot tell "clean" from "broken", which is how check-signed-out reached
// zero three times while being wrong.
function neverRefreshes(rel, src) {
  if (!rel.endsWith('/page.js')) return false;
  if (NEVER_REFRESHES[rel]) return false;
  if (!NETWORK.test(src)) return false;    // nothing to keep current
  if (REFRESHES.test(src)) return false;   // already does
  return true;
}

function pagesThatNeverRefresh() {
  const out = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (neverRefreshes(rel, fs.readFileSync(file, 'utf8'))) out.push(rel);
  }
  return out;
}

// Fixtures for part 2, both directions.
const STALE_PAGE = `
export default function Page() {
  const [rows, setRows] = useState([]);
  useEffect(() => { fetch(url).then(r => r.json()).then(d => setRows(d.rows)); }, [url]);
  return null;
}
`;
const WIRED_PAGE = `
export default function Page() {
  const load = useCallback(async ({ quiet } = {}) => { await fetch(url); }, [url]);
  useAutoRefresh(() => load({ quiet: true }));
  return null;
}
`;
const NO_NETWORK_PAGE = `
export default function Page() { return null; }
`;

const PART2 = [
  ['stale', 'src/app/probe/page.js', STALE_PAGE, 'fetches once and never again'],
  ['ok', 'src/app/probe/page.js', WIRED_PAGE, 'drives its loader from useAutoRefresh'],
  ['ok', 'src/app/probe/page.js', NO_NETWORK_PAGE, 'fetches nothing, so nothing to keep current'],
  ['ok', 'src/app/wallets/send/page.js', STALE_PAGE, 'a named form is exempt'],
  ['ok', 'src/components/thing/Thing.js', STALE_PAGE, 'not a page'],
];

const CASES = [
  ['bad', BAD_REAL, 'the door list, exactly as it shipped'],
  ['bad', BAD_INTERVAL, 'setInterval on a function defined in the file'],
  ['clean', GOOD_REF, 'calls through a ref, deps are primitives'],
  ['clean', GOOD_HOOK, 'delegates to useLiveData'],
  ['clean', CLOCK, 'a ticking clock is not a poller'],
  ['clean', DEBOUNCE, 'a debounce is not a poller'],
];

// ------------------------------------------------ part 3: a loud refresh
//
// The refresh must be QUIET. The event console's loop called `load()` with
// nothing, and `load()` began with `setLoading(true)` and `setError('')`: every
// thirty seconds the whole console was replaced by "Loading...", the form
// somebody was typing into unmounted, and the refusal they had just been shown
// was wiped. The stall page had fixed exactly this a week earlier, with a
// `quiet` flag; the console never got one. Second occurrence, so a catcher.
//
// The shape: a refresh call site (`useAutoRefresh(() => X(...))` or
// `loadRef.current(...)`) whose argument list does not mention `quiet`, in a
// file where a loader sets a loading flag true.
const REFRESH_CALL = /(?:useAutoRefresh\(\s*\(\)\s*=>\s*|loadRef\.current)\s*(?:\w+\s*)?\(([^)]*)\)/g;
const SETS_LOADING = /set\w*[Ll]oading\w*\(\s*true\s*\)/;

function loudRefreshes(src) {
  if (!SETS_LOADING.test(src)) return [];
  const out = [];
  let m;
  REFRESH_CALL.lastIndex = 0;
  while ((m = REFRESH_CALL.exec(src))) {
    const args = m[1] || '';
    // `setTick(t => t + 1)` style loops bump a counter and the effect reads
    // `refreshTick > 0` as quiet; those name no loader here and are fine.
    // `load(false)` is the attendees page's spelling of the same thing: the
    // argument is `first`, and false means "not the first, so no loading line".
    if (/quiet|tick|refresh/i.test(args) || /^\s*false\s*$/.test(args) || /set\w+\(/.test(m[0])) continue;
    out.push(m[0].trim());
  }
  return out;
}

const LOUD = `
const load = useCallback(async () => { setLoading(true); await fetch(url); setLoading(false); }, [url]);
const loadRef = useRef(load);
useEffect(() => { const tick = async () => { await loadRef.current(); timer = setTimeout(tick, wait); }; }, [url]);
`;
const QUIET_REF = `
const load = useCallback(async ({ quiet = false } = {}) => { if (!quiet) setLoading(true); await fetch(url); setLoading(false); }, [url]);
const loadRef = useRef(load);
useEffect(() => { const tick = async () => { await loadRef.current({ quiet: true }); timer = setTimeout(tick, wait); }; }, [url]);
`;
const QUIET_HOOK = `
const load = useCallback(async ({ quiet } = {}) => { if (!quiet) setLoading(true); await fetch(url); }, [url]);
useAutoRefresh(() => load({ quiet: true }));
`;
const LOUD_HOOK = `
const load = useCallback(async () => { setLoading(true); await fetch(url); setLoading(false); }, [url]);
useAutoRefresh(() => load());
`;
const COUNTER_HOOK = `
const [refreshTick, setRefreshTick] = useState(0);
useAutoRefresh(() => setRefreshTick(t => t + 1), [], { interval: 30000 });
useEffect(() => { const quiet = refreshTick > 0; if (!quiet) setLoading(true); fetch(url); }, [refreshTick]);
`;
const NO_LOADING = `
const load = useCallback(async () => { const r = await fetch(url); setRows(await r.json()); }, [url]);
useAutoRefresh(() => load());
`;
const FIRST_FLAG = `
const load = useCallback(async (first = false) => { if (first) { setLoading(true); } await fetch(url); }, [url]);
const loadRef = useRef(load);
useEffect(() => { const tick = async () => { await loadRef.current(false); timer = setTimeout(tick, wait); }; }, [url]);
`;
const PART3 = [
  ['ok', FIRST_FLAG, 'the attendees page: false means not the first load'],
  ['loud', LOUD, 'the event console loop, as it shipped'],
  ['loud', LOUD_HOOK, 'useAutoRefresh calling a loud loader'],
  ['ok', QUIET_REF, 'the same loop passing quiet'],
  ['ok', QUIET_HOOK, 'useAutoRefresh passing quiet'],
  ['ok', COUNTER_HOOK, 'a counter bump, read as quiet in the effect'],
  ['ok', NO_LOADING, 'a loader with no loading flag has nothing to be loud with'],
];

function loudRefreshFiles() {
  const out = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel.endsWith('useLiveData.js')) continue;
    const hits = loudRefreshes(fs.readFileSync(file, 'utf8'));
    if (hits.length) out.push([rel, hits]);
  }
  return out;
}

function selfTest() {
  let failed = 0;
  CASES.forEach(([expect, source, label], n) => {
    const found = findingsIn(source, 'src/app/probe/page.js');
    const isBad = found.length > 0;
    if ((expect === 'bad') !== isBad) {
      console.error(`FAIL case ${n} (${label}): expected ${expect}, got ${isBad ? 'a finding' : 'clean'}`);
      failed++;
    }
  });
  // The hook itself must be exempt, or it can never be written.
  if (findingsIn(BAD_REAL, 'src/lib/useLiveData.js').length !== 0) {
    console.error('FAIL: useLiveData.js must be exempt');
    failed++;
  }
  PART2.forEach(([expect, rel, src, label], n) => {
    const isStale = neverRefreshes(rel, src);
    if ((expect === 'stale') !== isStale) {
      console.error(`FAIL part2 case ${n} (${label}): expected ${expect}, got ${isStale ? 'stale' : 'ok'}`);
      failed++;
    }
  });
  PART3.forEach(([expect, src, label], n) => {
    const isLoud = loudRefreshes(src).length > 0;
    if ((expect === 'loud') !== isLoud) {
      console.error(`FAIL part3 case ${n} (${label}): expected ${expect}, got ${isLoud ? 'loud' : 'ok'}`);
      failed++;
    }
  });
  if (failed) {
    console.error(`\n${failed} self-test case(s) failed.`);
    process.exit(1);
  }
  console.log(`self-test passed: ${CASES.length + PART2.length + PART3.length} cases, both directions `
              + `(${CASES.length} dead timers, ${PART2.length} never-refreshes, ${PART3.length} loud refreshes).`);
}

// -------------------------------------------------------------------- main

const RUN = process.argv[1] && process.argv[1].endsWith('check-live-updates.mjs');
if (RUN) {
  if (process.argv.includes('--self-test')) selfTest();
  else main();
}

function main() {
  const findings = [];
  for (const file of walk(SRC)) {
    findings.push(...findingsIn(fs.readFileSync(file, 'utf8'),
                                path.relative(ROOT, file)));
  }
  const key = (f) => `${f.file}:${f.id}`;

  if (process.argv.includes('--baseline')) {
    fs.writeFileSync(BASELINE,
                     JSON.stringify([...new Set(findings.map(key))].sort(), null, 2));
    console.log(`Recorded ${findings.length} existing dead timer(s) as the baseline.`);
    process.exit(0);
  }

  let known = new Set();
  try { known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); } catch { /* none */ }
  const fresh = findings.filter((f) => !known.has(key(f)));

  if (fresh.length) {
    console.error(`${fresh.length} refresh timer(s) that cannot fire:\n`);
    for (const f of fresh) {
      console.error(`  ${f.file}  [${f.id}]`);
      console.error(`      ${f.why}`);
      console.error('      -> use useLiveData from @/lib/useLiveData, or hold the');
      console.error('         fetcher in a ref and depend only on primitives.');
    }
    process.exit(1);
  }

  const stale = pagesThatNeverRefresh();
  if (stale.length) {
    console.error(`${stale.length} page(s) that fetch and never refresh:`);
    console.error('');
    for (const rel of stale) console.error(`  ${rel}`);
    console.error('');
    console.error('  Add one line:  useAutoRefresh(() => yourLoader({ quiet: true }));');
    console.error('  Or, if it is a form or a one-shot page, name it in');
    console.error('  NEVER_REFRESHES in this file with the reason.');
    process.exit(1);
  }

  const loud = loudRefreshFiles();
  if (loud.length) {
    console.error(`${loud.length} refresh loop(s) that put the loading state over the page:`);
    console.error('');
    for (const [rel, hits] of loud) console.error(`  ${rel}  ${hits.join(' | ')}`);
    console.error('');
    console.error('  Give the loader a `quiet` flag, skip setLoading(true) and the error');
    console.error('  reset when it is set, and pass { quiet: true } from the refresh.');
    process.exit(1);
  }

  console.log(`0 dead refresh timers, 0 pages that never refresh, 0 loud refreshes. `
              + `${findings.length} known, being worked down.`);
}

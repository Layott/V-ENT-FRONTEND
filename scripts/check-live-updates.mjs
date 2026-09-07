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

const CASES = [
  ['bad', BAD_REAL, 'the door list, exactly as it shipped'],
  ['bad', BAD_INTERVAL, 'setInterval on a function defined in the file'],
  ['clean', GOOD_REF, 'calls through a ref, deps are primitives'],
  ['clean', GOOD_HOOK, 'delegates to useLiveData'],
  ['clean', CLOCK, 'a ticking clock is not a poller'],
  ['clean', DEBOUNCE, 'a debounce is not a poller'],
];

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
  if (failed) {
    console.error(`\n${failed} self-test case(s) failed.`);
    process.exit(1);
  }
  console.log(`self-test passed: ${CASES.length} cases, both directions.`);
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

  console.log(`0 dead refresh timers. ${findings.length} known, being worked down.`);
}

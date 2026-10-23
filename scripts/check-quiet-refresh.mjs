#!/usr/bin/env node
/**
 * A quiet refresh must not wipe a refusal off the screen.
 *
 * CEO, 3 September 2026: "ensure to create catchers for errors that have
 * happended more than once pleasse, add this as a rule."
 *
 * Found twice on one walk (P3 W2, 17 October 2026):
 *
 *   1. The stage planner. Save answered 400 with "Match C takes a side from a
 *      match that is not in the bracket" and the sentence appeared beside the
 *      button, then vanished a few seconds later: the panel refreshes itself
 *      on a timer with `load({ quiet: true })`, and `load` began with
 *      `setProblem('')`. Pressing Save seemed to do nothing.
 *   2. The match room. The same shape: a player told why their result could
 *      not stand lost the sentence at the next poll.
 *
 * The shape: a load function that takes `quiet`, clears an error state
 * without asking whether it is quiet, and the same state is also where an
 * action (save, draw, report) puts its refusal. A load that only clears its
 * own load error is fine, and so is a clear behind `if (!quiet)`.
 *
 *   node scripts/check-quiet-refresh.mjs              the tree, exits 1 on a hit
 *   node scripts/check-quiet-refresh.mjs --self-test  the matcher on fixtures
 *   node scripts/check-quiet-refresh.mjs --files a.js  only those files
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');

// The states a screen keeps a sentence for somebody in.
const ERROR_SETTER = /^set(Problem|Error|Err|Failure|Refusal|SaveProblem|ActionError)$/;

/** The body of every `useCallback(async ({ quiet ... }) => { ... })`, by
 * balancing braces from the arrow's opening one. Regex cannot match nested
 * braces, and every real load here has some. */
export function quietLoads(source) {
  const out = [];
  const opener = /useCallback\(\s*async\s*\(\s*\{[^}]*\bquiet\b[^}]*\}[^)]*\)\s*=>\s*\{/g;
  let m;
  while ((m = opener.exec(source)) !== null) {
    const start = m.index + m[0].length - 1;
    let depth = 0;
    let i = start;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push({ start, end: i, body: source.slice(start, i + 1) });
  }
  return out;
}

const CLEAR = /\b(set[A-Z]\w*)\(\s*(?:''|""|null)\s*\)/g;
const SET_VALUE = name => new RegExp(`\\b${name}\\(\\s*(?!''|""|null\\s*\\))[^)\\s]`, 'g');

/** The unguarded clears in `source` whose state an action also writes. */
export function faults(source) {
  const found = [];
  for (const load of quietLoads(source)) {
    const lines = load.body.split('\n');
    lines.forEach((line, index) => {
      let c;
      CLEAR.lastIndex = 0;
      while ((c = CLEAR.exec(line)) !== null) {
        const setter = c[1];
        if (!ERROR_SETTER.test(setter)) continue;
        const before = index > 0 ? lines[index - 1] : '';
        if (/!quiet/.test(line) || /if\s*\(\s*!quiet\s*\)\s*\{?\s*$/.test(before)) continue;
        // Written anywhere outside this load with a value: an action's refusal.
        const outside = source.slice(0, load.start) + source.slice(load.end + 1);
        if (!SET_VALUE(setter).test(outside)) continue;
        const lineNo = source.slice(0, load.start).split('\n').length + index;
        found.push({ setter, line: lineNo, text: line.trim() });
      }
    });
  }
  return found;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const FIXTURES = [
  ['an unguarded clear of an action refusal', 1, `
    const load = useCallback(async ({ quiet = false } = {}) => {
      setProblem('');
      const res = await fetch(url);
    }, []);
    const save = async () => { setProblem(apiMessage(tt, body, 'x', 'y')); };`],
  ['the same clear behind if (!quiet)', 0, `
    const load = useCallback(async ({ quiet = false } = {}) => {
      if (!quiet) setProblem('');
      const res = await fetch(url);
    }, []);
    const save = async () => { setProblem(apiMessage(tt, body, 'x', 'y')); };`],
  ['a guard on the line above', 0, `
    const load = useCallback(async ({ quiet = false } = {}) => {
      if (!quiet)
        setError('');
    }, []);
    const act = () => setError(tt('a', 'b'));`],
  ['a load that clears only its own load error', 0, `
    const load = useCallback(async ({ quiet = false } = {}) => {
      setError('');
      try { const r = await fetch(u); if (!r.ok && !quiet) setError(tt('l', 'Load failed')); } catch {}
    }, []);`],
  ['a clear on success that wipes an action refusal', 1, `
    const load = useCallback(async ({ quiet } = {}) => {
      const r = await fetch(u);
      if (r.ok) { setRows(r.rows); setError(''); }
    }, []);
    const remove = async () => { setError(apiMessage(tt, body, 'r', 'Not removed')); };`],
  ['a state that is not an error', 0, `
    const load = useCallback(async ({ quiet = false } = {}) => {
      setNotice('');
      setRows(null);
    }, []);
    const act = () => setRows([1]);`],
];

function selfTest() {
  let failed = 0;
  for (const [name, want, src] of FIXTURES) {
    const got = faults(src).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'pass' : 'FAIL'}  ${name}: ${got} (want ${want})`);
  }
  console.log(failed ? `${failed} self-test case(s) failed` : `${FIXTURES.length} self-test case(s) pass`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();

// `--files a b` reads those files instead of the tree (to prove a fix, or a fault).
const named = process.argv.indexOf('--files');
const files = named >= 0 ? process.argv.slice(named + 1) : walk(SRC);
const hits = [];
for (const file of files) {
  for (const f of faults(readFileSync(file, 'utf8'))) {
    hits.push(`${relative(ROOT, file).replace(/\\/g, '/')}:${f.line}  ${f.setter}  ${f.text}`);
  }
}
for (const h of hits) console.log(h);
console.log(`quiet refresh: ${hits.length} refusal(s) a quiet refresh would wipe`);
process.exit(hits.length ? 1 : 0);

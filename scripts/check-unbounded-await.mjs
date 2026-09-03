// A promise that waits on an event and can never time out.
//
// Twice now. First `await fetch` with no catch, which turned any network
// failure into a spinner that never stopped, on three admin pages. Then, on 3
// September 2026, a `new Promise` resolved only by `onloadedmetadata` and
// `onerror` on a DETACHED video element, where Chrome fires neither. Every
// clip upload hung for ever with the button disabled and nothing on screen.
//
// Both have the same shape: the code waits for something the browser is not
// obliged to send, and has no deadline. The user sees a control that is dead
// and no explanation, which is the worst failure this codebase produces
// because it looks like the whole feature is broken.
//
// So: a `new Promise` whose settle paths are all event handlers, with no timer
// in it, is a finding. Anything with a `setTimeout`, an `AbortSignal.timeout`
// or a `Promise.race` alongside is fine, because that is a deadline.
//
//   node scripts/check-unbounded-await.mjs
//   node scripts/check-unbounded-await.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

/** Every `new Promise(...)` body in a file, with the line it starts on. */
function promiseBodies(source) {
  const out = [];
  const marker = /new Promise\s*\(/g;
  let m;
  while ((m = marker.exec(source))) {
    // Walk to the matching close paren so nested calls do not end it early.
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push({
      body: source.slice(start, i + 1),
      line: source.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

const WAITS_ON_EVENT = /\bon[a-z]+\s*=|\baddEventListener\s*\(/;
const HAS_DEADLINE = /\bsetTimeout\s*\(|\bsetInterval\s*\(|AbortSignal\.timeout|requestAnimationFrame\s*\(/;

export function findingsIn(source, file) {
  const out = [];
  for (const { body, line } of promiseBodies(source)) {
    if (!WAITS_ON_EVENT.test(body)) continue;
    if (HAS_DEADLINE.test(body)) continue;
    out.push({ file, line });
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/* ------------------------------------------------------------------ self-test */

const BAD = `
  const seconds = await new Promise((resolve) => {
    const probe = document.createElement('video');
    probe.onloadedmetadata = () => resolve(probe.duration);
    probe.onerror = () => resolve(0);
    probe.src = URL.createObjectURL(file);
  });
`;

const GOOD_TIMER = `
  const seconds = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(0), 5000);
    probe.onloadedmetadata = () => { clearTimeout(timer); resolve(probe.duration); };
    probe.src = URL.createObjectURL(file);
  });
`;

const GOOD_NO_EVENT = `
  const later = new Promise((resolve) => { queueMicrotask(() => resolve(1)); });
`;

const GOOD_NESTED_CALL = `
  const v = await new Promise((resolve) => {
    thing.addEventListener('load', () => resolve(compute(a, (b))));
    setTimeout(() => resolve(null), 1000);
  });
`;

if (process.argv.includes('--self-test')) {
  const cases = [
    ['an event promise with no deadline', BAD, 1],
    ['the same promise with a timer', GOOD_TIMER, 0],
    ['a promise that waits on no event', GOOD_NO_EVENT, 0],
    ['nested parens and a timer', GOOD_NESTED_CALL, 0],
  ];
  let bad = 0;
  for (const [what, source, expected] of cases) {
    const got = findingsIn(source, 'self-test').length;
    if (got !== expected) {
      console.error(`SELF-TEST ${what}: expected ${expected}, got ${got}`);
      bad += 1;
    } else {
      console.log(`ok: ${what} -> ${got}`);
    }
  }
  if (bad) process.exit(1);
  console.log('self-test: the checker catches the fault and does not cry wolf');
  process.exit(0);
}

/* ---------------------------------------------------------------- the sweep */

const findings = [];
for (const file of walk(SRC)) {
  findings.push(...findingsIn(fs.readFileSync(file, 'utf8'), path.relative(path.join(HERE, '..'), file)));
}

if (findings.length) {
  console.error(`${findings.length} promise(s) waiting on an event with no deadline:\n`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}`);
  console.error('\nAdd a setTimeout that settles it. A control that waits for ever');
  console.error('with nothing on screen reads as the whole feature being broken.');
  process.exit(1);
}
console.log('0 promises waiting on an event with no deadline');

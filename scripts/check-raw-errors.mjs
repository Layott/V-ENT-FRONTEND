#!/usr/bin/env node
/**
 * A person must never be shown a developer's exception.
 *
 * CEO, 7 September 2026, sending a screenshot reading "Something went wrong /
 * MdSell is not defined": "what is this error that is not a good kind of error
 * to show users".
 *
 *   node scripts/check-raw-errors.mjs
 *   node scripts/check-raw-errors.mjs --self-test
 *
 * ## The shape
 *
 *     {error?.message || tx('An unexpected error occurred...')}
 *
 * It was in thirteen error boundaries. The written sentence was there the whole
 * time and the raw exception WON, because `||` takes the left side whenever it
 * is truthy and an exception message almost always is. So the fallback appeared
 * in every case except the one it was written for.
 *
 * What a reader takes from "MdSell is not defined" is that something is broken
 * and nobody expected them to be reading this. Same rule as
 * `feedback_no_developer_errors`: no engineer's sentence, no raw server string,
 * no stack trace, ever, on a screen somebody outside the team can reach.
 *
 * ## What counts
 *
 * Rendering `error.message`, `err.stack`, `e.toString()` or `String(error)`
 * inside JSX. Passing the same thing to `console.error` is FINE and is what
 * should happen: the console is where an exception is useful.
 *
 * That distinction is the whole calibration, and both halves are in the
 * self-test.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(HERE, 'raw-errors-baseline.json');

// Inside a JSX expression: {...error.message...}
const IN_JSX = /\{[^{}]*\b(?:err|error|e|ex|exception)\??\.(message|stack)\b[^{}]*\}/;
const STRINGIFIED = /\{[^{}]*\b(?:String\(\s*(?:err|error|e|ex)\s*\)|(?:err|error|e|ex)\??\.toString\(\))[^{}]*\}/;

export function findingsIn(source, file) {
  // The one component allowed to receive an error object is the one that
  // deliberately does NOT render it.
  if (/error-screen[\\/]ErrorScreen\.js$/.test(file)) return [];

  const out = [];
  source.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    // Logging an exception is right, and is where it belongs.
    if (/console\.(error|warn|log|debug)\s*\(/.test(line)) return;
    if (/allow-raw-error/.test(line)) return;

    if (IN_JSX.test(line) || STRINGIFIED.test(line)) {
      out.push({
        file,
        line: i + 1,
        id: 'raw-error-on-screen',
        text: line.trim().slice(0, 120),
      });
    }
  });
  return out;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, acc);
    } else if (/\.(js|jsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const CASES = [
  // The real one, from thirteen files.
  ['bad', "{error?.message || tx('An unexpected error occurred while loading tournaments.')}"],
  ['bad', '<p>{error.message}</p>'],
  ['bad', '{err?.stack}'],
  ['bad', '{String(error)}'],
  ['bad', '{e.toString()}'],
  // Calibration. None of these is a finding.
  ['clean', "console.error('[v-ent] page error', error);"],
  ['clean', "{apiMessage(tt, body, 'api.failed', 'That did not work.')}"],
  ['clean', "{tt('error.body', 'Something on our side failed.')}"],
  ['clean', "const message = error?.message; // kept for the log"],
  ['clean', "{scanState.message}"],
  ['clean', "{body.message}"],
];

function selfTest() {
  let failed = 0;
  CASES.forEach(([expect, line], n) => {
    const found = findingsIn(line, 'src/app/probe/error.js');
    if ((expect === 'bad') !== (found.length > 0)) {
      console.error(`FAIL case ${n}: expected ${expect} for: ${line}`);
      failed++;
    }
  });
  if (findingsIn('{error.message}', 'src/components/error-screen/ErrorScreen.js').length) {
    console.error('FAIL: ErrorScreen itself must be exempt');
    failed++;
  }
  if (failed) {
    console.error(`\n${failed} self-test case(s) failed.`);
    process.exit(1);
  }
  console.log(`self-test passed: ${CASES.length} cases, both directions.`);
}

const RUN = process.argv[1] && process.argv[1].endsWith('check-raw-errors.mjs');
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
    console.log(`Recorded ${findings.length} as the baseline.`);
    process.exit(0);
  }

  let known = new Set();
  try { known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); } catch { /* none */ }
  const fresh = findings.filter((f) => !known.has(key(f)));

  if (fresh.length) {
    console.error(`${fresh.length} raw exception(s) rendered to a person:\n`);
    for (const f of fresh.slice(0, 40)) {
      console.error(`  ${f.file}:${f.line}`);
      console.error(`      ${f.text}`);
    }
    console.error('\nSay what happened in words somebody can act on, and send the');
    console.error('exception to console.error. Use ErrorScreen for a boundary.');
    process.exit(1);
  }

  console.log(`0 raw exceptions on screen. ${findings.length} known, being worked down.`);
}

#!/usr/bin/env node
/**
 * Two dev servers on one checkout must not write the same build directory.
 *
 * Third occurrence in a single afternoon, so it gets a check rather than a
 * sentence in a handover. When several people (or agents) work in this repo at
 * once, somebody starts `pnpm dev -p 3001` while another server is already on
 * 3005. Both wrote `.next-dev`, overwrote each other's chunks, and the browser
 * said:
 *
 *   Cannot find module './vendor-chunks/next-auth@4.24.13_next@14.2...'
 *
 * which names webpack and next-auth and points at neither. It cost three
 * restarts and one wrong diagnosis (a production build) before the cause was
 * measured.
 *
 * The fix is in `next.config.mjs`: in development the port goes in the name.
 * This check makes sure it stays there.
 *
 *   node scripts/check-dev-distdir.mjs
 *   node scripts/check-dev-distdir.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = path.join(ROOT, 'next.config.mjs');

/** The line that decides the build directory, and whether the port is in it. */
function audit(text) {
  const problems = [];
  const match = text.match(/distDir:[\s\S]{0,400}?,\n/);
  if (!match) {
    problems.push('next.config.mjs has no distDir, so both dev servers write .next');
    return problems;
  }
  const clause = match[0];
  if (!/development/.test(clause)) {
    problems.push('distDir does not distinguish development from production');
  }
  if (!/process\.env\.PORT/.test(clause)) {
    problems.push('the dev distDir does not include the port, so two dev servers '
      + 'on this checkout will overwrite each other');
  }
  return problems;
}

function selfTest() {
  const cases = [
    {
      name: 'the real config passes',
      text: fs.readFileSync(CONFIG, 'utf8'),
      expect: 0,
    },
    {
      name: 'the shape that actually broke is caught',
      text: "  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',\n",
      expect: 1,
    },
    {
      name: 'no distDir at all is caught',
      text: 'export default { reactStrictMode: true }\n',
      expect: 1,
    },
    {
      name: 'a port-scoped dev dir passes',
      text: "  distDir: process.env.NODE_ENV === 'development'\n"
        + "    ? `.next-dev-${process.env.PORT}`\n    : '.next',\n",
      expect: 0,
    },
  ];

  let failures = 0;
  for (const one of cases) {
    const found = audit(one.text).length;
    const ok = one.expect === 0 ? found === 0 : found > 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name}`);
    if (!ok) failures += 1;
  }
  console.log(failures === 0
    ? `${cases.length} self-test case(s) pass`
    : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const problems = audit(fs.readFileSync(CONFIG, 'utf8'));
  problems.forEach(p => console.log(p));
  console.log(`1 config checked, ${problems.length} build directory clash(es) possible`);
  return problems.length === 0 ? 0 : 1;
}

process.exit(main());

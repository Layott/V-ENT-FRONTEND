#!/usr/bin/env node
// A name a screen calls that nothing defines.
//
// Found 29 September 2026: the tournament console's Money tab, and the two
// vendor stall panels on an event, called useAutoRefresh() without importing it.
// All three had shipped on 29 September and crashed to the error screen the
// moment they opened; a reminder scheduled on a tournament did the same to its
// console through formatDateTime(). Nothing caught any of them: the project's
// lint config does not turn on no-undef, and `pnpm build` compiles an undefined
// identifier happily because it only fails when the line runs.
//
// This is the same class as the tab that called three functions nobody wrote
// (memory: undefined functions ship), seen for the second and third time, so it
// is a catcher now. It runs ESLint's no-undef, and nothing else, over every file
// a page can reach (dead components are left out, as in check-inert-controls).
//
//   node scripts/check-undefined.mjs
//   node scripts/check-undefined.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { reachableFrom } from './check-literal-text.mjs';

const require = createRequire(import.meta.url);
const { ESLint } = require('eslint');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function linter() {
  return new ESLint({
    cwd: ROOT,
    useEslintrc: false,
    overrideConfig: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      env: { browser: true, node: true, es2022: true },
      rules: { 'no-undef': 'error' },
    },
  });
}

export async function findUndefined(eslint, text, filePath = 'x.js') {
  const [res] = await eslint.lintText(text, { filePath: path.join(ROOT, 'src', filePath) });
  return res.messages.filter((m) => m.ruleId === 'no-undef');
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walk(p, acc);
    } else if (/\.jsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

async function selfTest() {
  const eslint = linter();
  const cases = [
    ['a hook called and never imported', 'export default function P(){ useAutoRefresh(() => 1); return null; }', 1],
    ['the same hook imported', "import { useAutoRefresh } from '@/lib/useLiveData';\nexport default function P(){ useAutoRefresh(() => 1); return null; }", 0],
    ['a helper called in JSX and never imported', 'export default function P(){ return <span>{formatDateTime(1)}</span>; }', 1],
    ['browser and node globals are known', 'export const a = () => [window.location, process.env.X, fetch, localStorage];', 0],
    ['a local function is known', 'function go(){ return 1; }\nexport default () => go();', 0],
  ];
  let failed = 0;
  for (const [name, text, want] of cases) {
    const got = (await findUndefined(eslint, text)).length;
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got} (want ${want})`);
  }
  console.log(failed ? `${failed} self-test case(s) FAILED` : `${cases.length} self-test case(s) pass`);
  process.exit(failed ? 1 : 0);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const files = walk(path.join(ROOT, 'src'));
  const reachable = reachableFrom(files);
  const targets = files.filter((f) => reachable.has(path.resolve(f)));
  const results = await linter().lintFiles(targets);
  let count = 0;
  for (const r of results) {
    for (const m of r.messages.filter((x) => x.ruleId === 'no-undef')) {
      count++;
      console.log(`${path.relative(ROOT, r.filePath).split(path.sep).join('/')}:${m.line}  ${m.message}`);
    }
  }
  console.log(`${targets.length} reachable file(s) read, ${count} undefined name(s)`);
  process.exit(count ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

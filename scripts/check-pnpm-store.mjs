#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * The pnpm store, gutted.
 *
 * Third occurrence on 9 September 2026, each time within seconds of running
 * `pnpm build` while a dev server was still serving the same tree. The symptom
 * is always:
 *
 *   Error: Cannot find module '.../node_modules/next/dist/bin/next'
 *
 * `node_modules/next` is a symlink into `node_modules/.pnpm/next@<version>/`,
 * and THAT directory is empty: 16 KB where about a gigabyte should be. So the
 * store copy is damaged, not just the link, which is why `pnpm install --force`
 * on its own has never fixed it.
 *
 * The error names a module, so it reads like a missing dependency and gets
 * treated as one. It is not: nothing in package.json changed.
 *
 *   node scripts/check-pnpm-store.mjs             # is the tree usable
 *   node scripts/check-pnpm-store.mjs --self-test
 *
 * Run it BEFORE a build, not after. Ten seconds here beats a failed build and
 * the wrong diagnosis.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * A package directory that holds almost nothing is gutted.
 *
 * Counting entries rather than bytes: walking a gigabyte to decide it is
 * present is slower than the build it is protecting. A real package has its
 * package.json plus a dist or lib; a gutted one has one or two stray files.
 */
function health(dir) {
  if (!existsSync(dir)) return { ok: false, why: 'missing' };
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    return { ok: false, why: `unreadable: ${err.code}` };
  }
  if (entries.length === 0) return { ok: false, why: 'empty' };
  if (!entries.includes('package.json')) {
    return { ok: false, why: `no package.json, ${entries.length} entr(ies)` };
  }
  return { ok: true, why: `${entries.length} entries` };
}

/** The binary a build actually runs. Its absence is the failure itself. */
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

function selfTest() {
  const cases = [
    { name: 'a directory that does not exist is not healthy',
      dir: join(ROOT, 'node_modules', '__no_such_package__'), expect: false },
    { name: 'a real package is healthy',
      dir: join(ROOT, 'node_modules', 'next'), expect: true },
    { name: 'scripts/ has no package.json, so it reads as gutted',
      dir: join(ROOT, 'scripts'), expect: false },
  ];
  let failures = 0;
  for (const one of cases) {
    const got = health(one.dir).ok;
    const ok = got === one.expect;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name}`);
  }
  console.log(failures === 0
    ? `${cases.length} self-test case(s) pass`
    : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

const packages = ['next', 'react', 'react-dom'];
const broken = [];

for (const name of packages) {
  const dir = join(ROOT, 'node_modules', name);
  const state = health(dir);
  if (!state.ok) broken.push(`${name}: ${state.why}`);
}

if (existsSync(join(ROOT, 'node_modules', 'next')) && !existsSync(NEXT_BIN)) {
  broken.push('next: the bin a build runs is not there');
}

if (broken.length) {
  console.log('THE INSTALL IS DAMAGED:');
  for (const line of broken) console.log(`  ${line}`);
  console.log('\nThis is the gutted-store fault, not a missing dependency.');
  console.log('All four steps, in order. --force on its own does not fix it:');
  console.log('  pnpm store prune');
  console.log('  rm -rf node_modules/.pnpm/next@* node_modules/next');
  console.log('  pnpm install --force');
  console.log('\nAnd stop every dev server on this tree before building.');
  console.log(`${packages.length} package(s) checked, ${broken.length} damaged`);
  process.exit(1);
}

console.log(`${packages.length} package(s) checked, 0 damaged`);

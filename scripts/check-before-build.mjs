#!/usr/bin/env node
/**
 * Refuse a production build while a dev server is running on this tree.
 *
 * ## Why this exists
 *
 * SECOND OCCURRENCE, both on 10 September, and the first one cost two builds
 * and two reinstalls. `pnpm build` was run with `pnpm dev` still serving 3001,
 * and it came back:
 *
 *     Cannot find module '.../next/dist/compiled/jest-worker/processChild.js'
 *
 * The `next` package in the pnpm store had been GUTTED: not a missing
 * dependency, not a cache to clear. `node_modules/next` is a symlink into
 * `node_modules/.pnpm/next@.../node_modules/next`, so the dev server and the
 * build are writing into the same real directory, and the loser is whatever the
 * other one was reading. The repair is a full `pnpm install --force`, about a
 * minute, and the build has to be run again after it.
 *
 * `check-pnpm-store.mjs` already catches the damage. It catches it AFTERWARDS.
 * This catches the thing that causes it, which is the half that was missing.
 *
 * ## What it does
 *
 *   node scripts/check-before-build.mjs             # exit 1 if a dev server is up
 *   node scripts/check-before-build.mjs --self-test
 *
 * It runs as `prebuild`, so `pnpm build` refuses on its own rather than
 * depending on somebody remembering. There is no flag to skip it: the fix is to
 * stop the dev server, which takes a second, and the alternative is a corrupted
 * install and a reinstall.
 *
 * ## Unknown is not the same as clear
 *
 * If the port list cannot be read at all, this ALLOWS the build. That is the
 * opposite of `check-stale-builds`, which deletes nothing when it cannot read,
 * and both are the same rule: when you cannot see, do the harmless thing. There
 * it is "delete nothing"; here it is "do not block a build on a guess".
 */
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { listeningPorts } from './check-stale-builds.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The ports THIS tree's dev servers use, from the build directories they
 *  leave behind. A dev server writes `.next-dev-<port>`, so the directory
 *  names are the record of which ports have ever been served from here. */
export function devPortsFor(names) {
  const ports = new Set();
  for (const name of names) {
    const m = String(name).match(/^\.next-dev-(\d{2,5})$/);
    if (m) ports.add(Number(m[1]));
  }
  return ports;
}

/** Which of this tree's dev ports are being served right now. */
export function busyPorts(names, ports) {
  if (ports === null) return [];        // cannot see: do not block
  return [...devPortsFor(names)].filter((p) => ports.has(p)).sort((a, b) => a - b);
}

function selfTest() {
  const cases = [
    {
      name: 'a dev server on this tree blocks the build',
      names: ['.next', '.next-dev-3001'],
      ports: new Set([3001, 8000]),
      expect: [3001],
    },
    {
      name: 'a port nothing is serving does not block',
      names: ['.next', '.next-dev-3005'],
      ports: new Set([8000]),
      expect: [],
    },
    {
      name: 'two dev servers are both named',
      names: ['.next-dev-3001', '.next-dev-3005'],
      ports: new Set([3001, 3005]),
      expect: [3001, 3005],
    },
    {
      name: 'the production build directory is not a dev port',
      names: ['.next'],
      ports: new Set([3000]),
      expect: [],
    },
    {
      name: 'an unreadable port list does not block a build',
      names: ['.next-dev-3001'],
      ports: null,
      expect: [],
    },
    {
      name: 'a backend port on the same box is not this tree',
      names: ['.next-dev-3001'],
      ports: new Set([8000]),
      expect: [],
    },
  ];

  let failures = 0;
  for (const one of cases) {
    const got = busyPorts(one.names, one.ports);
    const ok = JSON.stringify(got) === JSON.stringify(one.expect);
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name}`
      + (ok ? '' : ` (expected ${JSON.stringify(one.expect)}, got ${JSON.stringify(got)})`));
  }

  // The parser itself, on real netstat output, because a self-test that only
  // feeds its own fixtures proves the fixtures.
  const real = listeningPorts(process.platform === 'win32'
    ? 'TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    27824\n'
    : 'LISTEN 0 511 0.0.0.0:3001 0.0.0.0:*\n');
  const parsed = real && real.has(3001);
  if (!parsed) failures += 1;
  console.log(`${parsed ? 'ok  ' : 'FAIL'}: a listening line is parsed as its port`);

  console.log(failures === 0
    ? `${cases.length + 1} self-test case(s) pass`
    : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

let names = [];
try {
  names = readdirSync(ROOT).filter((n) => n.startsWith('.next'));
} catch {
  names = [];
}

const busy = busyPorts(names, listeningPorts());

if (busy.length) {
  console.log('A DEV SERVER IS RUNNING ON THIS TREE:');
  for (const port of busy) console.log(`  port ${port}`);
  console.log('\nBuilding now gets a gutted node_modules/next and a build that');
  console.log('fails with "Cannot find module .../jest-worker/processChild.js".');
  console.log('It has happened twice. Stop the dev server, then build:');
  if (process.platform === 'win32') {
    console.log(`  netstat -ano | grep ":${busy[0]} " | grep LISTENING`);
    console.log('  powershell -NoProfile -Command "Stop-Process -Id <pid> -Force"');
  } else {
    console.log(`  kill $(lsof -ti :${busy[0]})`);
  }
  console.log(`\n${busy.length} dev server(s) in the way`);
  process.exit(1);
}

console.log(`${names.length} build directory(s) checked, 0 dev server(s) in the way`);

// Nothing to do with ports, and the reason this is a `prebuild` rather than a
// note in a handover: if the store is ALREADY damaged, the build fails
// halfway through with a stack trace nobody reads as "reinstall". Say it now.
try {
  execSync('node scripts/check-pnpm-store.mjs', { cwd: ROOT, stdio: 'inherit' });
} catch {
  process.exit(1);
}

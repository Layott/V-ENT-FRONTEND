#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * A build directory nobody is serving is rubbish, and here it is gigabytes of it.
 *
 * CEO, 8 September 2026, on finding eight of them: "add a rule and a checker to
 * always delete old obsolete ones."
 *
 * The dev distDir carries the PORT (`.next-dev-3005`), which is what stopped
 * two dev servers corrupting each other's chunks. The cost of that fix is one
 * directory per port anybody has ever used, and each is around a gigabyte. On
 * this machine eight of them had built up holding 5.6 GB, for ports nothing had
 * listened on for hours.
 *
 * So: a directory is STALE when no server is listening on its port. This
 * reports them, and removes them with --clean.
 *
 *   node scripts/check-stale-builds.mjs
 *   node scripts/check-stale-builds.mjs --clean
 *   node scripts/check-stale-builds.mjs --self-test
 *
 * `.next` is never touched: it is the production build the VPS serves.
 */
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Ports something is listening on, whatever the platform calls the command. */
export function listeningPorts(raw) {
  const text = raw !== undefined ? raw : (() => {
    try {
      return process.platform === 'win32'
        ? execSync('netstat -ano', { encoding: 'utf8' })
        : execSync('ss -ltn || netstat -ltn', { encoding: 'utf8', shell: '/bin/sh' });
    } catch {
      // Nothing readable. Say so, rather than returning an empty set: an empty
      // set means "nothing is listening", and that would mark the directory
      // being served right now as rubbish and delete it under a running
      // server. Unknown and empty are different answers.
      return null;
    }
  })();

  if (text === null) return null;

  const ports = new Set();
  for (const line of text.split('\n')) {
    if (!/LISTEN/i.test(line)) continue;
    const m = line.match(/[:.](\d{2,5})\s/);
    if (m) ports.add(Number(m[1]));
  }
  return ports;
}

/** Every dev build directory, and whether anything is serving it. */
export function staleDirs(names, ports) {
  // No evidence about what is listening. Delete nothing: the risk is deleting
  // the build directory under a server that is serving it.
  if (ports === null) return [];

  const out = [];
  for (const name of names) {
    const m = name.match(/^\.next-dev-(\d{2,5})$/);
    if (name === '.next-dev') {
      // The un-suffixed one predates the port-scoped fix and nothing writes it.
      out.push({ name, port: null, why: 'from before the dev distDir carried the port' });
      continue;
    }
    if (!m) continue;
    const port = Number(m[1]);
    if (!ports.has(port)) {
      out.push({ name, port, why: `nothing is listening on ${port}` });
    }
  }
  return out;
}

function sizeOf(dir) {
  let total = 0;
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        try { total += statSync(p).size; } catch { /* gone mid-walk */ }
      }
    }
  };
  walk(dir);
  return total;
}

function selfTest() {
  const cases = [
    {
      name: 'a directory whose port has no listener is stale',
      names: ['.next-dev-3001', '.next-dev-3005'],
      ports: new Set([3005]),
      expect: ['.next-dev-3001'],
    },
    {
      name: 'the directory being served is kept',
      names: ['.next-dev-3005'],
      ports: new Set([3005]),
      expect: [],
    },
    {
      name: 'the production build is never touched',
      names: ['.next', '.next-dev-3005'],
      ports: new Set([3005]),
      expect: [],
    },
    {
      name: 'the old un-suffixed dev directory is always stale',
      names: ['.next-dev', '.next-dev-3005'],
      ports: new Set([3005]),
      expect: ['.next-dev'],
    },
    {
      name: 'with no port evidence at all, nothing is called stale',
      names: ['.next-dev-3005', '.next-dev-3001'],
      ports: null,
      expect: [],
    },
    {
      name: 'an empty port set is not the same as no evidence',
      names: ['.next-dev-3001'],
      ports: new Set(),
      expect: ['.next-dev-3001'],
    },
    {
      name: 'unreadable port output reads as unknown, not as empty',
      parseNull: true,
      expectPorts: null,
    },
    {
      name: 'netstat output is read for listening ports',
      parse: '  TCP    0.0.0.0:3005    0.0.0.0:0    LISTENING    8236\n'
        + '  TCP    127.0.0.1:8000  0.0.0.0:0    LISTENING    9920\n',
      expectPorts: [3005, 8000],
    },
  ];

  let failures = 0;
  for (const one of cases) {
    if (one.parseNull) {
      const got = listeningPorts(null);
      const ok = got === null;
      if (!ok) failures += 1;
      console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name}`);
      continue;
    }
    if (one.parse !== undefined) {
      const got = [...listeningPorts(one.parse)].sort((a, b) => a - b);
      const ok = JSON.stringify(got) === JSON.stringify(one.expectPorts);
      if (!ok) failures += 1;
      console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name} (${got.join(', ')})`);
      continue;
    }
    const got = staleDirs(one.names, one.ports).map((d) => d.name).sort();
    const ok = JSON.stringify(got) === JSON.stringify([...one.expect].sort());
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name} (${got.join(', ') || 'none'})`);
  }
  console.log(failures === 0
    ? `${cases.length} self-test case(s) pass`
    : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();

  const clean = process.argv.includes('--clean');
  const names = readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const stale = staleDirs(names, listeningPorts());

  let bytes = 0;
  for (const dir of stale) {
    const full = join(ROOT, dir.name);
    const size = sizeOf(full);
    bytes += size;
    const mb = (size / 1024 / 1024).toFixed(0);
    if (clean) {
      rmSync(full, { recursive: true, force: true });
      console.log(`removed ${dir.name}  ${mb} MB  (${dir.why})`);
    } else {
      console.log(`${dir.name}  ${mb} MB  (${dir.why})`);
    }
  }

  const gb = (bytes / 1024 / 1024 / 1024).toFixed(1);
  if (!stale.length) {
    console.log('0 stale dev build directory(s)');
    return 0;
  }
  console.log(`\n${stale.length} stale dev build directory(s), ${gb} GB`);
  if (clean) return 0;
  console.log('Run with --clean to remove them. Nothing being served is touched.');
  // LAST, because check-all reads the last line and the debt ledger takes
  // its number from it. A friendly sentence printed after the count is how
  // a checker ends up recording no number at all.
  console.log(`${stale.length} stale dev build directory(s), ${gb} GB`);
  return 1;
}

process.exit(main());

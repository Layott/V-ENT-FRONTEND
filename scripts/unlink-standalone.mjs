#!/usr/bin/env node
// Remove the links inside .next/standalone before a build deletes the folder.
//
// ## The fault this ends
//
// On this machine the install kept being gutted: jest-worker/processChild.js
// gone, then next, react and react-dom emptied, four times on 28 September,
// with no dev server running. The build guard printed the repair every time and
// nobody knew the cause.
//
// The cause: with pnpm, `output: 'standalone'` writes .next/standalone/
// node_modules/{next,react,react-dom,sharp} as SYMBOLIC LINKS into
// node_modules/.pnpm. The next `pnpm build` starts by deleting the old .next,
// and on Windows that delete goes through the links and empties the real
// packages. Exactly the three the guard kept finding. Linux (the VPS) removes a
// link without following it, which is why production never saw this.
//
// So before each build the links are removed as links - the link itself, never
// what it points at - and the folder is safe to delete.
//
//   node scripts/unlink-standalone.mjs
//   node scripts/unlink-standalone.mjs --self-test

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// Every symbolic link or junction under `dir`, without following any of them.
export function findLinks(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) acc.push(p);
    else if (st.isDirectory()) findLinks(p, acc);
  }
  return acc;
}

// Remove the link, not its target. A directory link on Windows is removed with
// rmdir; unlink covers file links and every link elsewhere.
export function removeLink(p) {
  try {
    fs.unlinkSync(p);
  } catch {
    fs.rmdirSync(p);
  }
}

export function unlinkUnder(dir) {
  const links = findLinks(dir);
  links.forEach(removeLink);
  return links.length;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unlink-standalone-'));
  let failed = 0;
  const check = (name, ok) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); };
  try {
    const real = path.join(tmp, 'real', 'next');
    fs.mkdirSync(real, { recursive: true });
    fs.writeFileSync(path.join(real, 'package.json'), '{}');
    const standalone = path.join(tmp, 'standalone', 'node_modules');
    fs.mkdirSync(standalone, { recursive: true });
    fs.symlinkSync(real, path.join(standalone, 'next'), 'junction');
    check('the link is found', findLinks(path.join(tmp, 'standalone')).length === 1);
    check('one link removed', unlinkUnder(path.join(tmp, 'standalone')) === 1);
    check('the link is gone', !fs.existsSync(path.join(standalone, 'next')));
    check('the real package is untouched', fs.existsSync(path.join(real, 'package.json')));
    check('a missing folder is not an error', unlinkUnder(path.join(tmp, 'absent')) === 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`${5 - failed}/5 self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const n = unlinkUnder(path.join(ROOT, '.next', 'standalone'));
  console.log(`${n} link(s) removed from .next/standalone, their targets untouched`);
}

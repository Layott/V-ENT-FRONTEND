// No frontend catcher names a backend folder itself.
//
// A catcher that reads the backend has to read the one being judged. Five of
// them carried their own list of sibling folders with a stale docs worktree
// first, so a new wording on a feature branch was invisible to the catcher
// meant to hold it (13 October 2026). The third time a checker read other code
// (29 September: workspace tool forwarders; 9 October: the commit hook), so it
// gets a catcher: every script asks scripts/backend-dir.mjs instead.
//
//   node scripts/check-backend-dir.mjs              the scripts; exit 1 on a hit
//   node scripts/check-backend-dir.mjs --self-test  proves it on fixtures
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
//: A backend folder written as a string: 'V-ENT-BACKEND', 'V-ENT-BACKEND-flw', ...
const NAMED = /(?:['"`]|[/\\])V-ENT-BACKEND(?:-[A-Za-z0-9]+)?(?:['"`]|[/\\])/;
//: The one file allowed to name it, because it is where the answer lives.
const ALLOWED = new Set(['backend-dir.mjs', 'check-backend-dir.mjs']);

export function hits(files) {
  const out = [];
  for (const [name, text] of files) {
    if (ALLOWED.has(path.basename(name))) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*#.*$/, '');
      if (NAMED.test(code)) out.push(`${name}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  return out;
}

function scripts() {
  return fs.readdirSync(HERE)
    .filter((n) => /\.(mjs|js|py|cjs)$/.test(n))
    .map((n) => [n, fs.readFileSync(path.join(HERE, n), 'utf8')]);
}

function selfTest() {
  const cases = [
    ['a list of sibling backends', [['a.mjs', "const B = ['V-ENT-BACKEND-flw', 'V-ENT-BACKEND']"]], 1],
    ['a joined path', [['b.mjs', "path.join(ROOT, '..', 'V-ENT-BACKEND', 'vent_auth')"]], 1],
    ['a relative path', [['c.py', "BACK = '../V-ENT-BACKEND/vent_auth'"]], 1],
    ['a slash path', [['d.mjs', "const p = 'V-ENT-BACKEND/vent_auth/x.py'"]], 1],
    ['asking backend-dir', [['e.mjs', "const B = backendFile('vent_auth/x.py');"]], 0],
    ['a comment naming it', [['f.mjs', "// read from V-ENT-BACKEND, the main checkout"]], 0],
    ['backend-dir itself', [['backend-dir.mjs', "path.join(WORKSPACE, 'V-ENT-BACKEND')"]], 0],
  ];
  let failed = 0;
  for (const [label, files, want] of cases) {
    const got = hits(files).length;
    if (got !== want) { failed += 1; console.log(`FAIL ${label}: ${got} hit(s), wanted ${want}`); }
  }
  console.log(`${cases.length} self-test case(s), ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const found = hits(scripts());
  found.forEach((h) => console.log(h));
  console.log(`${found.length} script(s) naming a backend folder instead of asking backend-dir.mjs`);
  process.exit(found.length ? 1 : 0);
}

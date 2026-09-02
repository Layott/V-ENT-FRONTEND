// Does any page decide who you are in a way that can be wrong when signed out?
//
// CEO, 2 September 2026: "Create rules for this please to apply automatically to
// the site and other new pages that maybe built."
//
// So this is the automatic part. Two faults, both invisible to the build, the
// linter and the type system, because both are valid JavaScript that happens to
// be false.
//
// ## Fault 1: comparing two identities that can both be absent
//
//     org?.owner?.username === session?.user?.username
//
// Signed out, `org.owner` is a string, so `.username` is `undefined`. And
// `session?.user?.username` is `undefined`. `undefined === undefined` is TRUE,
// so every organisation looked like the viewer's own and every card offered
// Manage to a stranger. That shipped, and a person found it.
//
// Optional chaining is what makes this likely rather than rare: `a?.b === c?.d`
// reads as careful while being exactly the shape of the bug.
//
// Use `sameUser(a, b)` from `lib/gating`, which is false unless both exist.
//
// ## Fault 2: branching on session DATA rather than session STATUS
//
//     const { data: session } = useSession();
//     if (!session) { ...treat as signed out... }
//
// `data` is null while NextAuth is still asking. Treating that as "signed out"
// makes the page flash from a member's view to a stranger's, which looks like a
// bug because it is one. Branch on `status`, or use `useViewer()`.
//
//   node scripts/check-signed-out.mjs

import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(full);
  }
};
walk('src');

// `x?.a === y?.b` where BOTH sides are optional-chained. One side optional is
// fine: the other is then a definite value and cannot be undefined by accident.
const BOTH_OPTIONAL = /(\w[\w.?]*\?\.[\w.?]+)\s*===\s*(\w[\w.?]*\?\.[\w.?]+)/g;

// Reading session data without ever reading status, in a file that branches.
const USES_DATA = /useSession\(\)\s*;?[\s\S]{0,120}?\bdata\s*:/;
const READS_STATUS = /\bstatus\b\s*[,}]|status\s*===|useViewer\(/;

let identity = 0;
let statusless = 0;
const report = [];

// Comments describe the fault as often as they contain it - this file and the
// fixes both quote the bad pattern in prose. A checker that reports its own
// documentation gets ignored, and an ignored checker is worse than none.
const stripComments = (src) => src
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    // Not a URL, and not inside a string. Crude, and right for source files
    // where the only `//` that matters here is a leading comment.
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;
    return line.slice(0, at);
  })
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const rel = file.split(path.sep).join('/');

  // Skip the rule module and its checker; they talk about the pattern.
  if (rel.includes('lib/gating.js') || rel.includes('check-signed-out')) continue;

  const hits = [...src.matchAll(BOTH_OPTIONAL)];
  for (const m of hits) {
    // Only care when one side looks like the viewer and the other like a record.
    const pair = `${m[1]} === ${m[2]}`;
    if (!/session|viewer|user|me\b/i.test(pair)) continue;
    identity += 1;
    report.push(`${rel}\n  identity compared with both sides optional: ${pair.trim()}`);
  }

  if (/useSession\(/.test(src) && USES_DATA.test(src) && !READS_STATUS.test(src)) {
    statusless += 1;
    report.push(`${rel}\n  reads session data but never status: cannot tell "signed out" from "still asking"`);
  }
}

for (const line of report) console.log(line);
console.log('');
console.log(`${identity} identity comparison(s) that can be true when signed out`);
console.log(`${statusless} file(s) branching on session data without status`);
console.log(`${identity + statusless} live write controls at risk`);

process.exit(identity + statusless ? 1 : 0);

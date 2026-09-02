// A number in an address somebody can see.
//
// The rule (V-ENT/CLAUDE.md): no numeric id ever appears in a URL a person can
// see. Not in a path, not in a query string.
//
//     /tournaments/naija-free-fire-weekly-12    not  /tournaments/25
//     /events/lagos-anime-con                   not  /events/view-event?id=12
//
// Two reasons, and the second is the one that bites. An address carrying a
// number tells a reader nothing and cannot be shared usefully. And sequential
// ids let anybody walk the whole table by counting, which publishes every
// unlisted record somebody made.
//
// This was a pre-ship grep in the rule and therefore ran when somebody
// remembered. It found a real one today: My Tournaments linked Manage by
// `${t.id}` while the View button beside it used the slug.
//
//   node scripts/check-slugs.mjs
//
// Modules still behind ComingSoon are exempt until they are built, which the
// rule says explicitly, so they are listed here rather than silently skipped.

import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.next', '.git']);

// Named, with the reason, so an exemption is a decision somebody can read
// rather than a hole nobody remembers opening.
const EXEMPT = [
  ['src/app/search/page.js',
   'links into marketplace, shop and anime, all still behind ComingSoon'],
];

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.jsx?$/.test(entry.name)) files.push(full);
  }
};
walk('src');

const blank = (text) => text.replace(/[^\n]/g, ' ');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;
    return line.slice(0, at) + ' '.repeat(line.length - at);
  })
  .join('\n');

const findings = [];
const exempted = [];

for (const file of files) {
  const rel = file.split(path.sep).join('/');
  const exemption = EXEMPT.find(([p]) => rel === p);
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const lineOf = (i) => src.slice(0, i).split('\n').length;

  const hits = [];

  // 1. `?id=` in anything that becomes an address.
  for (const m of src.matchAll(/[?&]id=\$\{|[?&]id=['"`]?\$\{/g)) {
    hits.push({ line: lineOf(m.index), rule: 'query-string id',
                text: src.slice(m.index - 40, m.index + 40).trim() });
  }

  // 2. A path segment interpolating something that reads like a numeric id,
  //    where a slug was available. `${x.id}` and `${x.event_id}` etc.
  const inPath = /(?:href|push|replace)\s*[=(]\s*\{?\s*`\/[^`]*\$\{[^}]*\b\w+\.(?:id|[a-z_]+_id)\b[^}]*\}/g;
  for (const m of src.matchAll(inPath)) {
    // `slug || id` is the accepted fallback: the slug is used when it exists,
    // and a record that has none has to be reachable somehow.
    if (/\bslug\b/.test(m[0])) continue;
    hits.push({ line: lineOf(m.index), rule: 'numeric id in a path',
                text: m[0].replace(/\s+/g, ' ').slice(0, 110) });
  }

  if (!hits.length) continue;
  if (exemption) {
    exempted.push({ file: rel, why: exemption[1], count: hits.length });
    continue;
  }
  for (const h of hits) findings.push({ file: rel, ...h });
}

for (const f of findings) {
  console.log(`${f.file}:${f.line}  ${f.rule}`);
  console.log(`  ${f.text}`);
  console.log('  Use the slug. Every address a person can see carries the name.');
  console.log('');
}

for (const e of exempted) {
  console.log(`exempt  ${e.file} (${e.count}) - ${e.why}`);
}

console.log('');
console.log(`${findings.length} numeric id(s) in a visible address`);
process.exit(findings.length ? 1 : 0);

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
  ['src/app/embed/events/[slug]/page.js',
   'a frame inside another website: nobody sees its address in a browser bar, and every snippet names the slug'],
  ['src/app/embed/tournaments/[slug]/page.js',
   'a frame inside another website: nobody sees its address in a browser bar, and every snippet names the slug'],
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

// The pages a person shares. API paths are not addresses anybody sees.
const PAGE = /(?:^|[^\w-])\/(?:teams|tournaments|events|organizations|u|community\/(?:thread|post|club|challenge))\/\$\{([^}]*)\}/g;
export function pageIds(src) {
  const out = [];
  for (const m of src.matchAll(PAGE)) {
    const expr = m[1];
    const line = src.slice(0, m.index).split(/\r?\n/).pop();
    if (/API|api_url|NEXT_PUBLIC_API|fetch\(/.test(line)) continue;
    if (/\b(slug|username|handle|eventRef|ref)\b/i.test(expr)) continue;
    if (!/(?:\?\.|\.)\s*(?:id|[a-z]+_id)\b|\b(?:user_id|team_id|event_id|tournament_id|org_id)\b/.test(expr)) continue;
    out.push(m);
  }
  return out;
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['the team share that shipped', 'const link = `${window.location.origin}/teams/${team?.id ?? teamId}`;', 1],
    ['a profile by account number', 'const link = `${origin}/u/${profileData.user_id}`;', 1],
    ['by slug', 'const link = `${origin}/teams/${team.slug}`;', 0],
    ['slug with a fallback', 'href={`/teams/${team.slug || team.id}`}', 0],
    ['a username', 'href={`/u/${u.username}`}', 0],
    ['an API path', 'fetch(`${API}/team/view-team/${team.id}/`)', 0],
  ];
  let bad = 0;
  for (const [what, src, expected] of cases) {
    const got = pageIds(src).length;
    if (got !== expected) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${expected}`); }
    else console.log(`ok: ${what} -> ${got}`);
  }
  console.log(bad ? 'self-test FAILED' : 'self-test: catches an id in any page address, leaves slugs, usernames and API paths');
  process.exit(bad ? 1 : 0);
}

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

  // 3. Any template that builds a page address, wherever it goes: a share
  //    link built into a variable (`${origin}/teams/${team?.id ?? teamId}`)
  //    shipped past rule 2, which only read href/push/replace and `.id`
  //    without `?.`. CEO, 30 September 2026: "I wanted to share a team and
  //    still saw an ID https://v-ent.co/teams/29". A username is the slug of
  //    a person, so it counts as one.
  for (const m of pageIds(src)) {
    if (hits.some((h) => h.line === lineOf(m.index))) continue;
    hits.push({ line: lineOf(m.index), rule: 'numeric id in a page address',
                text: m[0].replace(/\s+/g, ' ').slice(0, 110) });
  }

  // 4. A record route that follows a rename (`__moved`) must also send a
  //    number to the name, or /teams/29 opens and keeps the number in the
  //    address bar people copy (inbox 381). src/lib/slugAddress.js does it.
  if (/\/\[slug\]\/(page|layout)\.js$/.test(rel) && /__moved/.test(src)
      && /\bredirect\(/.test(src) && !/\btoSlugAddress\(/.test(src)) {
    hits.push({ line: 1, rule: 'record route keeps a number in the address',
                text: 'call toSlugAddress(slug, record, base, searchParams) after the __moved redirect' });
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

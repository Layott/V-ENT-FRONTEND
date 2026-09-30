// A search that only finds what was typed exactly.
//
// CEO, 30 September 2026, after "Winlo" answered "No account found": "Any
// search bar must work the same way that you don't have to type what you're
// searching for correctly or fully." Every search now goes through one
// matcher, src/lib/fuzzy.js in the browser and vent_auth/fuzzy.py on the
// server. This fails the two shapes that skip it:
//
//   browser  a search term tested with `.toLowerCase().includes(q)`
//   server   a search term handed to `__icontains` (or `__istartswith`)
//
// A term that is not a search (a status, a country code picked from a list)
// is not this fault; the patterns only fire on the names search terms are
// given here (q, query, search, term, needle, searchQuery, searchTerm).
//
//   node scripts/check-forgiving-search.mjs
//   node scripts/check-forgiving-search.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(HERE, '..', 'src');
const BACK = ['V-ENT-BACKEND-flw', 'V-ENT-BACKEND']
  .map((d) => path.join(HERE, '..', '..', d)).find((d) => fs.existsSync(path.join(d, 'vent_auth')));

const TERM = String.raw`(?:q|query|search|term|needle|searchQuery|searchTerm|modalSearch|eventSearchTerm)`;
const JS_EXACT = new RegExp(String.raw`\.toLowerCase\(\)\.includes\(\s*${TERM}\b|\.includes\(\s*${TERM}\.toLowerCase\(\)`);
const PY_EXACT = new RegExp(String.raw`__(?:icontains|istartswith)\s*=\s*${TERM}\b`);

export function jsFaults(source) {
  return source.split('\n').map((line, i) => [i + 1, line])
    .filter(([, line]) => !/^\s*(\/\/|\*)/.test(line) && JS_EXACT.test(line));
}
export function pyFaults(source) {
  return source.split('\n').map((line, i) => [i + 1, line])
    // `# exact-match: <reason>` keeps a lookup exact on purpose: a ticket
    // code or a phone number read off a screen is typed whole.
    .filter(([, line]) => !/^\s*#/.test(line) && !/#\s*exact-match:/.test(line) && PY_EXACT.test(line));
}

function walk(dir, keep, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'migrations', '__pycache__', 'generated', '.venv', 'venv'].includes(entry.name)) continue;
      walk(p, keep, out);
    } else if (keep(entry.name)) out.push(p);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const cases = [
    ['js exact includes', "list.filter(t => (t.name || '').toLowerCase().includes(q))", 'js', 1],
    ['js lowercased term', 'games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))', 'js', 1],
    ['js through the matcher', 'list.filter(t => fuzzyMatches(q, t.name))', 'js', 0],
    ['js a status, not a search', "rows.filter(r => r.status.toLowerCase().includes('live'))", 'js', 0],
    ['py icontains on a search', 'qs = qs.filter(team_name__icontains=search)', 'py', 1],
    ['py istartswith on a term', 'rows.filter(Q(username__istartswith=term))', 'py', 1],
    ['py through the matcher', "qs = fuzzy.search(qs, search, ['team_name'])", 'py', 0],
    ['py a country from a list', 'qs = qs.filter(country__icontains=country)', 'py', 0],
    ['py exact on purpose', '| Q(code__icontains=term)  # exact-match: read off a screen', 'py', 0],
  ];
  let bad = 0;
  for (const [what, src, kind, expected] of cases) {
    const got = (kind === 'js' ? jsFaults : pyFaults)(src).length;
    if (got !== expected) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${expected}`); }
    else console.log(`ok: ${what} -> ${got}`);
  }
  console.log(bad ? 'self-test FAILED' : 'self-test: catches an exact-only search on both sides, leaves the matcher and non-search filters');
  process.exit(bad ? 1 : 0);
}

if (isMain) {
  const hits = [];
  for (const f of walk(FRONT, (n) => n.endsWith('.js'))) {
    if (f.endsWith(path.join('lib', 'fuzzy.js'))) continue;
    for (const [line, text] of jsFaults(fs.readFileSync(f, 'utf8'))) hits.push(`${path.relative(path.join(HERE, '..'), f)}:${line}  ${text.trim().slice(0, 110)}`);
  }
  if (BACK) {
    for (const f of walk(BACK, (n) => n.endsWith('.py') && n !== 'fuzzy.py' && !/^tests?_|_tests?\.py$/.test(n))) {
      for (const [line, text] of pyFaults(fs.readFileSync(f, 'utf8'))) hits.push(`${path.relative(path.join(HERE, '..', '..'), f)}:${line}  ${text.trim().slice(0, 110)}`);
    }
  }
  for (const h of hits) console.log(`  ${h}`);
  console.log(`${hits.length} search(es) that only find an exact spelling${BACK ? '' : ' (backend not found, browser only)'}`);
  process.exit(hits.length ? 1 : 0);
}

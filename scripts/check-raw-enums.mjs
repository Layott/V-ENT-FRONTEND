// A stored value drawn as if it were a word.
//
// `{event.event_type}` puts "physical" on the page: English, lower case (or
// upper case, if the stylesheet shouts it), and the same in French and
// Portuguese. The value is a key, not a sentence. Found on the embeds walk,
// 30 September 2026 (inbox 364): the event page's badge read "PHYSICAL" on a
// French page, and the same shape was on the organisation profile, the event
// wizard's review, a tournament card and six status cells. The fix every time
// is the same: look the value up, `tt(`prefix.${value}`, fallback)`, or a
// helper in src/lib/labels.js that does.
//
// What counts: a JSX expression that renders, as text, a field whose values
// are codes rather than words. `status`, `event_type`, `tournament_type`,
// `tournament_access`, `participant_type`, `prize_type`, `entry_fee`,
// `visibility`, with or without `(x || '').replace('_', ' ')` around it.
// Inside tt(...), a className, a key, a comparison or an attribute it is fine.
//
// The admin console is English only (middleware sends it to /login?next=/admin
// in English), so it is outside this check.
//
//   node scripts/check-raw-enums.mjs
//   node scripts/check-raw-enums.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

const FIELDS = 'status|event_type|tournament_type|tournament_access|participant_type|prize_type|tournament_visibility|visibility';

// `{x.status}` or `{(x.status || '').replace(...)}` or `{x?.status}` as the whole expression.
const RAW = new RegExp(
  String.raw`\{\s*\(?\s*[A-Za-z_$][\w$]*(?:\??\.[\w$]+)*\??\.(?:${FIELDS})\s*(?:\|\|\s*(?:''|""))?\s*\)?\s*(?:\.replace\([^)]*\))?\s*\}`,
  'g',
);

/** The raw renders in one file's source, as [line, text]. */
export function rawRenders(source) {
  const out = [];
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(RAW)) {
      const before = line.slice(0, m.index);
      // An attribute: `className={x.status}`, `value={x.status}`, `key=...`.
      if (/[\w-]+=\s*$/.test(before)) continue;
      // Inside a template literal or a call on the same line, e.g. tt(`s.${x.status}`).
      if (/\$$/.test(before)) continue;
      out.push([i + 1, line.trim()]);
    }
  });
  return out;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '(admin)' || entry.name === 'generated') continue;
      walk(p, out);
    } else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

export function run() {
  const hits = [];
  for (const f of walk(SRC)) {
    for (const [line, text] of rawRenders(fs.readFileSync(f, 'utf8'))) {
      hits.push(`${path.relative(path.join(HERE, '..'), f)}:${line}  ${text}`);
    }
  }
  return hits;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const cases = [
    ['a badge drawing the type', '<span className={s.badge}>\n  {event.event_type}\n</span>', 1],
    ['optional chaining', '<td>{e?.status}</td>', 1],
    ['the replace dressing', "{(t.status || '').replace('_', ' ')}", 1],
    ['a paragraph of it', '<p>{selectedTournament.status}</p>', 1],
    ['looked up through tt', "{tt(`tstatus.${t.status}`, t.status)}", 0],
    ['a className', '<span className={styles[`status_${e.status}`]}>', 0],
    ['a value attribute', '<select value={form.event_type}>', 0],
    ['a comparison', "{e.status === 'live' && <b>Live</b>}", 0],
    ['a helper', '{eventTypeLabel(tt, event.event_type)}', 0],
    ['an HTTP status in a template', 'throw new Error(`failed (${res.status})`)', 0],
  ];
  let bad = 0;
  for (const [what, src, expected] of cases) {
    const got = rawRenders(src).length;
    if (got !== expected) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${expected}`); }
    else console.log(`ok: ${what} -> ${got}`);
  }
  if (bad) process.exit(1);
  console.log('self-test: catches a stored code drawn as text, leaves lookups, attributes and comparisons');
  process.exit(0);
}

if (isMain) {
  const hits = run();
  for (const h of hits) console.log(`  ${h}`);
  console.log(`${hits.length} stored code(s) drawn as words`);
  process.exit(hits.length ? 1 : 0);
}

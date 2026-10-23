#!/usr/bin/env node
/**
 * Every reader of the game list must read `.games` out of the answer.
 *
 * Written 23 October 2026. GET /auth/games/ answers
 * `{status, data: {games: [...], count}}`. This fault happened twice: two
 * pages stored `data.data` (the whole object) as if it were the array, then
 * called `.map` on it, and the screen crashed with "titles.map is not a
 * function". The right reads are `data.data.games` or the shared `useGames`
 * hook.
 *
 * The rule is deliberately small. A file that fetches the list endpoint (the
 * exact address `/auth/games/`, followed by a quote or a backtick) must also
 * contain `.games` somewhere. A file with no `.games` read cannot have read the
 * list out of the answer, whatever it stored.
 *
 *   node scripts/check-games-shape.mjs
 *   node scripts/check-games-shape.mjs --self-test
 *
 * Exits non-zero when a reader never reads `.games`. The self-test runs the
 * same rule on fixtures of the real fault and of the shapes that must pass,
 * because a checker that reports 0 has two meanings.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const SKIP_DIR = join('i18n', 'generated');

// The list endpoint exactly: the address ends right after the slash, so a
// quote or backtick follows. `/auth/games/${id}/modes/` is a different
// endpoint and does not match.
const READER = /\/auth\/games\/['"`]/;
const READS_GAMES = /\.games\b/;

/**
 * The verdict for one file's source.
 * `null` when the file does not read the list endpoint at all.
 * Otherwise `{ line, passes }`, where `line` is the first list-endpoint line.
 */
export function verdict(source) {
  const match = READER.exec(source);
  if (!match) return null;
  const line = source.slice(0, match.index).split('\n').length;
  return { line, passes: READS_GAMES.test(source) };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(path, out);
    } else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.mjs')) {
      out.push(path);
    }
  }
  return out;
}

// --------------------------------------------------------------- self-test
// Deliberately attacking a passing gate: fixtures of the real fault and of the
// shapes that must pass or be ignored.
const FIXTURES = [
  // The real fault: the whole object is stored and then mapped as the array.
  [`const r = await fetch(\`\${API}/auth/games/\`); const b = await r.json();
    setTitles(b.data); titles.map(t => t);`,
   'fault'],
  // The shared pattern: the list is read out of the answer.
  [`const res = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/auth/games/\`);
    const data = await res.json();
    if (data?.status === 'success') setGames(data.data.games || []);`,
   'pass'],
  // Optional chaining on the answer, as BasicInfo and the edit panel write it.
  [`const res = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/auth/games/\`);
    const body = await res.json();
    setGames((body?.data?.games || []).map(g => g.name));`,
   'pass'],
  // A different endpoint with the same prefix: not the list, not a reader.
  [`const res = await fetch(\`\${API}/auth/games/\${id}/modes/\`);
    setModes(await res.json());`,
   'ignored'],
  // No fetch at all.
  [`export const LABELS = { games: 'Games' };
    export default function Page() { return <p>{LABELS.games}</p>; }`,
   'ignored'],
];

let selfTestFailed = false;
let selfTestPassed = 0;
for (const [source, expected] of FIXTURES) {
  const found = verdict(source);
  const got = found === null ? 'ignored' : found.passes ? 'pass' : 'fault';
  if (got === expected) {
    selfTestPassed += 1;
  } else {
    console.error(`self-test FAILED: expected "${expected}", got "${got}"`);
    selfTestFailed = true;
  }
}
if (process.argv.includes('--self-test')) {
  console.log(`games shape self-test: ${selfTestPassed}/${FIXTURES.length} cases pass`);
  process.exit(selfTestFailed ? 1 : 0);
}
if (selfTestFailed) {
  console.error('the matcher is wrong, so its count means nothing');
  process.exit(2);
}

// ------------------------------------------------------------------- scan
const faults = [];
let readers = 0;
for (const path of walk(SRC)) {
  const rel = relative(SRC, path);
  if (rel.startsWith(SKIP_DIR + sep)) continue;
  const found = verdict(readFileSync(path, 'utf8'));
  if (found === null) continue;
  readers += 1;
  if (found.passes) continue;
  faults.push(`${relative(ROOT, path).split(sep).join('/')}:${found.line}  reads /auth/games/ but never reads .games from the answer`);
}

for (const line of faults) console.log(line);
console.log(`games shape: ${readers} reader(s) of /auth/games/, ${faults.length} that never read .games`);
process.exit(faults.length === 0 ? 0 : 1);

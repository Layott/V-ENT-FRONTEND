#!/usr/bin/env node
// Every prize is written by src/lib/prize.js.
//
// CEO, 12 October 2026 (inbox 444): a prize pool typed in naira showed in
// coins once the tournament was published. It was the second fault in how a
// prize is written (inbox 403 stored naira as coins), and fifteen screens each
// printed `prize_pool` with " VC" glued after it, so a fix in one place could
// not reach the rest. Four older components put a dollar sign in front of
// coins, and one an "N".
//
// What fails, outside src/lib/prize.js:
//   1. a prize value followed by " VC" in JSX or a template string;
//   2. "$" or "N" glued in front of a prize value;
//   3. "Prize: $" as text.
//
// DEAD names files no page imports, with the reason; each is checked to still
// be imported by nothing, so the moment one comes back to life it fails here
// and gets fixed rather than shipping its "$".
//
//   node scripts/check-prize-display.mjs            # "prize display: N problems"
//   node scripts/check-prize-display.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');

const DEAD = {
  'src/components/tournaments/TournamentsComponent.js': 'the old /tournaments listing, replaced by src/app/tournaments/page.js',
  'src/components/tournaments/all-tournaments/tournaments-by-game/TournamentByGame.js': 'only TournamentsComponent reaches it',
  'src/components/tournaments/new-tournaments/NewTournaments.js': 'only TournamentsComponent reaches it',
  'src/components/tournaments/tournaments-featured/TournamentsFeatured.js': 'only TournamentsComponent reaches it',
  'src/components/view-tournament/tournament-details-overview/TournamentDetailsOverview.js': 'the old tournament page, replaced by view-tournament/page.js',
  'src/components/view-tournament/tournament-details-overview/tournament-details-overview-right/TournamentDetailsOverviewRight.js': 'only the old overview, rules and event tabs reach it',
  'src/components/view-tournament/tournament-details-prize/TournamentDetailsPrize.js': 'the old prize tab',
  'src/components/view-event/event-details-prize/EventDetailsPrize.js': 'the old event prize panel',
  'src/components/tournaments/all-tournaments/AllTournaments.js': 'only TournamentsComponent reaches it',
  'src/components/view-tournament/tournament-details-rules/TournamentDetailsRules.js': 'the old rules tab',
  'src/components/view-event/event-details-tournament/EventDetailsTournaments.js': 'the old event tournaments tab',
};

const PATTERNS = [
  ['a prize followed by " VC"', /\{[^{}\n]*\bprize\w*\b[^{}\n]*\}\s*VC\b/i],
  ['a prize followed by " VC"', /\$\{[^}\n]*\bprize\w*\b[^}\n]*\}\s*VC\b/i],
  ['a prize followed by " VC"', /\bprize\w*\.toLocaleString\([^)]*\)\}?\s*VC\b/i],
  ['"$" in front of a prize', /\$\$\{[^}\n]*\bprize/i],
  ['"$" in front of a prize', />\s*\$\{[^}\n]*\bprize/i],
  ['"N" in front of a prize', /`N\s?\$\{[^}\n]*\bprize/],
  ['"Prize: $" as text', /Prize:\s*\$["'`]/],
];

// Block comments become blank space line for line, so a line number still
// points at the right line after them.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

function problemsIn(text, file) {
  const out = [];
  const lines = stripComments(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [what, re] of PATTERNS) {
      if (re.test(line)) { out.push(`${file}:${i + 1}: ${what}; use prizeText from @/lib/prize`); break; }
    }
  });
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return /^(i18n|node_modules)$/.test(e.name) ? [] : walk(p);
    return /\.(js|jsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function importedAnywhere(target, files, texts) {
  const base = path.basename(target, '.js');
  const re = new RegExp(`from\\s+['"][^'"]*/${base}(\\.js)?['"]|import\\(\\s*['"][^'"]*/${base}(\\.js)?['"]`);
  return files.filter((f) => rel(f) !== target && !DEAD[rel(f)] && re.test(texts.get(f)));
}

function run() {
  const files = walk(SRC);
  const texts = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  const problems = [];
  for (const [file, why] of Object.entries(DEAD)) {
    if (!fs.existsSync(path.join(ROOT, file))) { problems.push(`${file}: listed as dead (${why}) but gone; take it off the list`); continue; }
    const users = importedAnywhere(file, files, texts);
    if (users.length) problems.push(`${file}: listed as dead but ${rel(users[0])} imports it; fix its prizes and take it off the list`);
  }
  for (const f of files) {
    const r = rel(f);
    if (r === 'src/lib/prize.js' || DEAD[r]) continue;
    problems.push(...problemsIn(texts.get(f), r));
  }
  for (const p of problems) console.log('  ' + p);
  console.log(`prize display: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function selfTest() {
  const cases = [
    ['coins glued after prize_pool', '<span>{Number(t.prize_pool || 0).toLocaleString()} VC</span>', 1],
    ['a local prize variable', '<span>{prize.toLocaleString()} VC</span>', 1],
    ['template string', 'const s = `${t.prize_pool} VC`;', 1],
    ['dollar before coins', '? `$${tournament.prize_distributions[0].prize}`', 1],
    ['naira letter glued', "const prize = t.prize ? `N${t.prize}` : '-';", 1],
    ['"Prize: $" text', '{tt("ui.prize.07d5", "Prize: $")}', 1],
    ['the helper passes', '<span>{prizeText(t)}</span>', 0],
    ['a fee in VC is not a prize', '<span>{fee} VC</span>', 0],
    ['a commented line is ignored', '// <span>{t.prize_pool} VC</span>', 0],
  ];
  let failed = 0;
  for (const [label, text, want] of cases) {
    const got = problemsIn(text, 'fixture.js').length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${got})`);
  }
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest(); else run();

#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Every place another member's name is shown goes through UserChip.
 *
 * CEO, 29 August 2026, with a screenshot of a direct message: "why didnt her
 * founder badge show here?" and then "anywhere Winlola name shows, the founder
 * badge must be there also."
 *
 * The badge was on posts, comments, threads and search because somebody added
 * it to each of those by hand, and missing from direct messages, club members
 * and tournament organisers because nobody had got to them yet. The same is
 * true of linking a name to its profile. Both are properties of a NAME, not of
 * a screen, so they belong in one component, and this checker is what stops
 * the thirty-first screen from writing one out by hand again.
 *
 * What counts as a hand-written name: rendering `.full_name` or `.username` as
 * visible JSX text in a file that does not import UserChip.
 *
 * Run: node scripts/check-user-chips.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

// Screens that legitimately write a name without the chip.
//
// Deliberately short. An earlier draft of this list exempted the viewer's own
// name in the header, the sidebar and the bottom menu, on the reasoning that
// somebody knows who they are. The CEO settled it: "everywhere i type or my
// name appears, the badge must show beside it." A founder is a founder on
// their own screen too, so those exemptions are gone.
//
// Named one by one with a reason, rather than a pattern, because a blanket
// exemption is how the rule quietly stops applying to half the app.
const ALLOWED = new Map([
  ['src/app/user-profile/page.js', 'this IS the profile; it renders the badge itself'],
  ['src/app/u/[username]/page.js', 'this IS the profile; it renders the badge itself'],
  ['src/app/signup/page.js', 'a username being chosen, not a person being shown'],
  ['src/app/claim/[token]/page.js', 'a reserved username being claimed'],
  ['src/app/onboarding/page.js', 'the viewer filling in their own details'],
  // A sentence confirming which account is about to authorise a partner:
  // "Signed in as X." It is the viewer's own handle inside a sentence,
  // not a person being presented to click on.
  ['src/app/partners/authorize/page.js', "the viewer's own handle inside a sentence"],
  // A sponsor's "username" is that brand's social handle, typed in by the
  // organiser. It is not a V-ENT account, so it has no profile to open and no
  // founder mark to carry.
  ['src/components/create-event-component/review/review-sponsor-links/ReviewSponsorLinks.js',
   'a sponsor brand handle, not a member'],
  ['src/components/create-tournament-component/review/review-sponsor-links/ReviewSponsorLinks.js',
   'a sponsor brand handle, not a member'],
  // The admin console is internal tooling: a table of accounts to act on,
  // where every row already links to the admin's own detail view rather than
  // to a public profile.
  ['ADMIN', 'internal tooling, rows link to the admin detail view'],
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

// `{x.full_name}` or `{x?.username}` rendered as text, and `@{x.username}`.
// One level of nesting is allowed on the left: `{m.user?.full_name}` is
// exactly how the organisation member table wrote a name, and the first
// version of this pattern walked straight past it, so that row shipped with
// no badge and no link while the checker reported everything clean.
const NAME_EXPR = /\{\s*[a-zA-Z_$][\w$]*\??\.(?:[a-zA-Z_$][\w$]*\??\.)?(full_name|username)\b[^}]*\}/;

/**
 * A name rendered as JSX TEXT, which is the only case that needs a badge and
 * a link.
 *
 * Not an attribute (`alt={u.full_name}`, `value={field.username}`), not a
 * string built for a toast, not a URL builder. The first version of this
 * matched all of those and reported twenty-two files, most of which were
 * nothing: an `alt` attribute has nowhere to put a badge, and a checker that
 * cries wolf is one people learn to ignore.
 */
function rendersName(line) {
  if (!NAME_EXPR.test(line)) return false;
  const at = line.search(NAME_EXPR);
  const before = line.slice(0, at);
  // An attribute: the brace is the right-hand side of `something=`.
  if (/[a-zA-Z-]+=$/.test(before.trimEnd())) return false;
  // Inside a template literal, so it is a string being built, not rendered.
  if (before.includes('`')) return false;
  return true;
}

const offenders = [];
let checked = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (ALLOWED.has(rel)) continue;
  if (rel.startsWith('src/app/(admin)/') || rel.startsWith('src/components/admin/')) continue;
  // The chip itself, and helpers that build strings or URLs rather than JSX.
  if (rel === 'src/components/user-chip/UserChip.js') continue;
  if (rel.startsWith('src/lib/')) continue;

  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  if (!lines.some(rendersName)) continue;
  checked += 1;
  if (src.includes('user-chip/UserChip')) continue;

  const line = lines.findIndex(rendersName) + 1;
  offenders.push(`${rel}:${line} renders a name without UserChip`);
}

console.log(`files rendering a name: ${checked}`);
if (offenders.length) {
  console.log(`\nNAMES WRITTEN BY HAND (${offenders.length}):`);
  for (const o of offenders) console.log(`  ${o}`);
  console.log('\nUse <UserChip user={...} />. It carries the founder mark and');
  console.log('opens the person\'s profile, which a hand-written name does not.');
  process.exit(1);
}
console.log('every name renders through UserChip');

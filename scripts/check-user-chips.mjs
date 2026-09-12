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
  // The live participant list in a reading room. The feed sends USERNAMES, not
  // people: it is a cursor-paged list of who is present right now, and asking
  // it for an avatar and a founder mark per tick would be a person object per
  // participant per two seconds. The names beside a message and on a room card
  // ARE chips, because those are people being presented.
  ['src/app/anime/room/[token]/RoomClient.js',
   'a live presence list of usernames from the feed, not people to open'],
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

/**
 * Inside a `<select>` option, where a chip is not possible.
 *
 * HTML says an `<option>` holds text and nothing else: a browser drops any
 * element put inside one. So a name in an option is the only way to write it,
 * and reporting it is asking for a change that cannot be made. That is a false
 * positive, and a checker with false positives is one somebody eventually
 * satisfies by breaking working code.
 *
 * Looks back a few lines rather than at one, because the name is usually on
 * its own line under the opening tag. It stops at a `</option>`, so a span
 * written after an option closes is still caught.
 */
function insideOption(lines, index) {
  // What is open at the name's own position, first. An option written on one
  // line closes on that line too, so a lookback alone misses it - which the
  // self-test caught, in the fixture written to prove the opposite case.
  const text = lines[index];
  const at = text.search(NAME_EXPR);
  const before = at >= 0 ? text.slice(0, at) : text;
  if (before.lastIndexOf('<option') > before.lastIndexOf('</option>')) return true;
  if (before.includes('</option>')) return false;

  for (let i = index - 1; i >= Math.max(0, index - 4); i -= 1) {
    const line = lines[i];
    const close = line.lastIndexOf('</option>');
    const open = line.lastIndexOf('<option');
    if (open > close) return true;
    if (close > -1) return false;
  }
  return false;
}

/**
 * `@{x.username}`: a handle, which is a different thing from a name.
 *
 * The founder mark and the link belong to the NAME. A handle printed under a
 * chipped name is right, and treating it as a fault is how a checker ends up
 * reporting twenty-three things when about ten are real.
 */
function isHandle(line) {
  const at = line.search(NAME_EXPR);
  if (at < 0) return false;
  return line.slice(0, at).trimEnd().endsWith('@');
}

/**
 * Proven both ways, and with TWO instances in one fixture on purpose.
 *
 * A one-instance fixture passes under the right rule AND under the old
 * first-hit-per-file rule, so it cannot tell them apart. That is exactly how
 * this checker read clean for days while hiding nine hand-written names.
 *
 *   node scripts/check-user-chips.mjs --self-test
 */
function selfTest() {
  const cases = [
    {
      name: 'two hand-written names in one file are BOTH reported',
      chipped: false,
      src: ["<span>{post.author.full_name}</span>",
            "<span>{comment.author.full_name}</span>"],
      expect: 2,
    },
    {
      name: 'a name is reported even when the file imports the chip',
      chipped: true,
      src: ["<UserChip user={post.author} />",
            "<span>{comment.author.full_name}</span>"],
      expect: 1,
    },
    {
      name: 'a handle beside a chipped name is fine',
      chipped: true,
      src: ["<UserChip user={u} />", "<span>@{u.username}</span>"],
      expect: 0,
    },
    {
      name: 'a handle standing in for the name, with no chip, is reported',
      chipped: false,
      src: ["<span>@{u.username}</span>"],
      expect: 1,
    },
    {
      name: 'a name inside a select option is not reportable: a chip cannot go there',
      chipped: false,
      src: ["<option key={m.id} value={m.user?.username}>",
            "  {m.user?.full_name}",
            "</option>"],
      expect: 0,
    },
    {
      name: 'a span written after an option closes is still caught',
      chipped: false,
      src: ["<option value=\"a\">{m.user?.full_name}</option>",
            "<span>{other.author.full_name}</span>"],
      expect: 1,
    },
    {
      name: 'an attribute is not a rendered name',
      chipped: false,
      src: ["<Avatar name={u.full_name} />"],
      expect: 0,
    },
    {
      name: 'a template literal is a string, not a name on screen',
      chipped: false,
      src: ["const msg = `hello ${u.full_name}`;"],
      expect: 0,
    },
    {
      name: 'one level of nesting still counts',
      chipped: false,
      src: ["<span>{m.user?.full_name}</span>"],
      expect: 1,
    },
  ];

  let failures = 0;
  for (const one of cases) {
    let found = 0;
    one.src.forEach((line, index) => {
      if (!rendersName(line)) return;
      if (isHandle(line) && one.chipped) return;
      if (insideOption(one.src, index)) return;
      found += 1;
    });
    const ok = found === one.expect;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name} (expected ${one.expect}, got ${found})`);
  }
  console.log(failures === 0
    ? `${cases.length} self-test case(s) pass`
    : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

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

  // EVERY hand-written name, not the first, and no whole-file exemption for a
  // file that happens to import the chip.
  //
  // Both of those made this checker go blind exactly where somebody had just
  // worked: fixing the line it reported ADDED the import, and every other
  // hand-written name in that file became invisible for ever. On 8 September
  // 2026 that was hiding 23 names across 12 files, 17 of them with no founder
  // mark, while this read clean and the CEO's 29 August bug was still shipping.
  //
  // A check that stops at the first hit per file counts how many FILES are
  // dirty, and then gets quoted as how many THINGS are wrong.
  // A file that renders the NAME through the chip may still print the handle
  // under it, and that is correct: the founder mark belongs to the name, and
  // "@winlola" under a chip is a handle, not a second name.
  const chipped = src.includes('user-chip/UserChip');

  lines.forEach((text, index) => {
    if (!rendersName(text)) return;
    // `@{x.username}` is a handle. Beside a chipped name it is fine; with no
    // chip anywhere in the file it IS the name being shown, so it is not.
    if (isHandle(text) && chipped) return;
    if (insideOption(lines, index)) return;
    const what = isHandle(text) ? 'shows a handle as the name' : 'renders a name';
    offenders.push(`${rel}:${index + 1} ${what}, without UserChip`);
  });
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

// A name on screen with no way to show the face beside it.
//
// CEO, 2 September 2026: "ADD A CATCHER FOR THE USERNAME NOT LOADING PROFILE
// PICTURE EVERYWHERE ALSO."
//
// The organiser card on a tournament drew a circle with the first letter of
// the name in it. Not a fallback - a hand-rolled div that could never show a
// picture, beside a `<UserChip size={0}>` with its avatar deliberately
// switched off. So the organiser's photo was unreachable however well the API
// reported it, and the founder badge with it.
//
// It is an easy thing to write. `{name.charAt(0)}` in a round div looks like
// an avatar, renders immediately, needs no data, and quietly becomes the
// permanent state of that screen.
//
// Two rules, both grep-able:
//
//   1. Nobody hand-rolls an initial-in-a-circle. `Avatar` already does that,
//      as a FALLBACK for somebody with no picture, and shows the picture when
//      there is one.
//   2. `UserChip size={0}` is only honest when something else on that row is
//      already drawing the person. Passing it and then drawing your own
//      circle is the bug above.
//
//   node scripts/check-avatars.mjs
//   node scripts/check-avatars.mjs --self-test
//
// ## Calibration, 7 September 2026
//
// The CEO reported their own picture and badge missing under an organisation.
// This checker already had that line, at `org-profile/page.js:506`, sitting
// inside a count of 21 that nobody had worked down. Reading all 21 by hand,
// four were not faults at all:
//
//   admin/games/page.js          a GAME logo with a letter fallback
//   FavoriteGamesEditPanel.js    a game cover, twice
//   community/page.js            `me.full_name.split(' ')[0]`, a first name in
//                                a greeting, next to a real <Avatar>
//
// A game has a `name` too and is not a person, and taking the first WORD of a
// name is not the same as taking its first LETTER. Nineteen percent noise is
// how a count gets ignored, and an ignored count is how the CEO ends up
// finding the real one by looking at the screen. So the rule now asks who the
// name belongs to, and the self-test holds all four false cases as fixtures
// alongside the faults, because a checker reporting 0 has two meanings and
// only the self-test separates them.

import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.next', '.git']);

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

// The component that is allowed to draw initials, because it draws the
// picture first when there is one.
const ALLOWED = new Set([
  'src/components/avatar/Avatar.js',
]);

// Comments are blanked to SPACES rather than removed, so every character
// keeps its original offset and a reported line number matches the file.
//
// Removing them shortens the text, and the line numbers this printed were
// then several lines off - which sends somebody to the wrong place and
// teaches them the checker is unreliable, which is worse than not having one.
const blank = (text) => text.replace(/[^\n]/g, ' ');

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;   // a URL
    return line.slice(0, at) + ' '.repeat(line.length - at);
  })
  .join('\n');

// Who a `name` belongs to.
//
// `full_name`, `username` and `display_name` are only ever a person, so they
// need no receiver. Bare `name` is on games, teams, organisations, products,
// tiers and cues as well, and only counts when whatever holds it reads like a
// person. Erring toward silence here is deliberate: a false positive costs
// more than a miss, because it is what made the honest ones invisible.
const PERSON_HOLDER =
  '(?:user|member|author|owner|person|player|applicant|creator|founder|'
  + 'viewer|attendee|participant|profile|organiser|organizer|captain|'
  + 'holder|buyer|sender|recipient|me|other|him|her|them)';

const PERSON_FIELD = new RegExp(
  '(?:\\b(?:full_name|username|display_name)\\b'
  + `|\\b${PERSON_HOLDER}\\w*\\s*\\??\\.\\s*name\\b`
  + `|\\b${PERSON_HOLDER}\\w*\\s*\\??\\.\\w*\\s*\\??\\.\\s*name\\b)`,
  'i');

// Taking the first WORD is not taking the first LETTER. `name.split(' ')[0]`
// is a first name for a greeting; `name.split(' ').map(w => w[0])` is a set of
// initials being drawn. The difference is whether the index lands on the split
// itself or inside a map.
const FIRST_WORD = /\.\s*split\s*\([^)]*\)\s*\[\s*0\s*\]/;

// Anchored on a name-ish field first, then anything up to the index
// operation. Written this way because the initials form in the wild is a
// chain - `name.split(' ').map(p => p[0]).join('')` - and a character class
// tight enough to be readable will not survive an arrow function inside it.
// A monogram is one letter or two, so `.slice(0, 2)` counts as much as
// `.charAt(0)`. The admin user table drew a two-letter one and this checker
// looked only for a single character, so it never saw it.
const INITIAL =
  /\{\s*\(?[\w.?\s|'"]*\b(?:full_name|username|display_name|name)\b[^}]{0,90}?(?:\.charAt\(0\)|\.(?:slice|substring)\(0,\s*[123]\)|\[0\])[^}]{0,60}\}/g;

/** Every avatar fault in one file. Exported shape so the self-test can drive it. */
export function findInSource(rel, rawSrc) {
  const found = [];
  if (ALLOWED.has(rel)) return found;

  const src = stripComments(rawSrc);
  const lineOf = (index) => src.slice(0, index).split('\n').length;

  // 1. An initial taken off a PERSON's name and rendered on its own.
  for (const m of src.matchAll(INITIAL)) {
    const text = m[0];
    const before = src.slice(Math.max(0, m.index - 160), m.index);
    // A bare `name` says nothing about whose it is, but the box it is being
    // drawn into does. The founders panel held `{name.split(...)}` inside a
    // `className={styles.founderAvatar}`, and a container called an avatar is
    // a container drawing a face whatever the variable is called.
    // No word boundary in front: the class is as often `userAvatar` or
    // `memberAvatar` as it is `avatar`, and requiring one let the admin user
    // table through with a hand-rolled two-letter monogram in `shared.userAvatar`.
    const inAFaceShapedBox = /class[nN]ame=[{`][^}`]*(?:avatar|founder|profilePic|photo|face|initial)/i.test(before);
    if (!PERSON_FIELD.test(text) && !inAFaceShapedBox) continue;  // a game, a cue
    if (FIRST_WORD.test(text)) continue;         // a first name, not an initial
    // Inside an alt/aria/title string it is text, not a drawn avatar.
    if (/\b(?:alt|aria-label|title|key)\s*=\s*$/.test(before.slice(-60))) continue;
    found.push({
      file: rel,
      line: lineOf(m.index),
      rule: 'hand-rolled initial',
      detail: 'draws a letter where a face belongs. Use <Avatar src={...} '
        + 'name={...} />, which shows the picture and falls back to initials.',
      text: text.replace(/\s+/g, ' ').slice(0, 100),
    });
  }

  // 2. UserChip with its avatar switched off AND nothing else on the screen
  //    drawing the person.
  //
  //    size={0} is legitimate in a table whose first column is already an
  //    <Avatar>, and in a dense list where a face would be noise. Flagging all
  //    23 of those beside the one real fault is the same as flagging none: the
  //    count gets ignored and the broken one hides inside it. Same lesson as
  //    grading the undefined-CSS-class check by whether it breaks a control.
  //
  //    So the file must draw no Avatar at all before this counts. A bare
  //    next/image behind a truthy check does NOT count as drawing the person:
  //    that is what the organisation member table did, and everybody without
  //    an uploaded picture got an empty circle.
  const drawsAvatarSomewhere = /<Avatar[\s/>]/.test(src);
  if (!drawsAvatarSomewhere) {
    const chipOff = /<UserChip[^>]*\bsize=\{0\}/g;
    for (const m of src.matchAll(chipOff)) {
      found.push({
        file: rel,
        line: lineOf(m.index),
        rule: 'UserChip with no avatar, and no avatar anywhere on this screen',
        detail: 'size={0} hides the picture and leaves the founder badge beside '
          + 'a name with nothing to identify it. Nothing else in this file '
          + 'draws the person either.',
        text: m[0].replace(/\s+/g, ' ').slice(0, 100),
      });
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Self-test. Every fixture is real code from this repository: the faults it
// must catch, and the four it must leave alone.
// ---------------------------------------------------------------------------

const FIXTURES = [
  // --- must catch ---
  {
    why: 'the organisation founders panel, which is what the CEO reported',
    flag: true,
    src: `const F = () => <div className={s.founderAvatar}>
      {name.split(' ').map(p => p[0]).join('').slice(0, 2)}
    </div>;`,
  },
  {
    why: 'the tournament organiser card that started this checker',
    flag: true,
    src: `const O = () => <span className={s.orgInitial}>{organiser.full_name.charAt(0)}</span>;`,
  },
  {
    why: 'the admin user table, whose class is `userAvatar` and not `avatar`. '
      + 'Requiring a word boundary in front let this one through',
    flag: true,
    src: `const U = () => <div className={shared.userAvatar}>
      {(u.username || 'U').slice(0, 2).toUpperCase()}
    </div>;`,
  },
  {
    why: 'a member row taking one letter off a username',
    flag: true,
    src: `const M = () => <div className={s.av}>{(user.username || '?').charAt(0)}</div>;`,
  },
  {
    why: 'UserChip with the avatar off and nothing else drawing the person',
    flag: true,
    src: `const R = () => <td><UserChip user={r.applicant} size={0} secondary /></td>;`,
  },
  {
    why: 'a person drawn only by a guarded next/image, which blanks for '
      + 'everybody with no uploaded picture',
    flag: true,
    src: `const M = () => <div>
      {m.user?.avatar && <Image src={m.user.avatar} alt="" width={32} height={32} />}
      <UserChip user={m.user} size={0} />
    </div>;`,
  },
  // --- must leave alone ---
  {
    why: 'a GAME logo with a letter fallback. A game is not a person',
    flag: false,
    src: `const G = () => (game.logo
      ? <img className={s.gameLogo} src={game.logo} alt={game.name} />
      : <span className={s.gameLogoBlank} aria-hidden="true">{game.name.slice(0, 1)}</span>);`,
  },
  {
    why: 'a game cover in the favourite-games panel',
    flag: false,
    src: `const C = () => (gameCover(g)
      ? <img src={mediaUrl(gameCover(g))} alt={g.name} />
      : <span className={s.coverFallback}>{(g.name || '?').charAt(0)}</span>);`,
  },
  {
    why: 'a first name in a greeting, beside a real Avatar',
    flag: false,
    src: `const C = () => <div>
      <Avatar src={me.avatar} name={me.username} size={40} />
      <textarea placeholder={\`What's on your mind, \${me.full_name.split(' ')[0]}?\`} />
    </div>;`,
  },
  {
    why: 'UserChip with the avatar off in a table whose first column is an Avatar',
    flag: false,
    src: `const T = () => <tr>
      <td><Avatar src={m.user.avatar} name={m.user.username} size={32} /></td>
      <td><UserChip user={m.user} size={0} secondary /></td>
    </tr>;`,
  },
  {
    why: 'a run-of-show cue owner, which is typed text and not an account',
    flag: false,
    src: `const Q = () => <span className={s.cueOwner}>{item.owner.slice(0, 1)}</span>;`,
  },
  {
    why: 'an initial inside an alt string, which is text and not a drawing',
    flag: false,
    src: `const A = () => <img alt={user.full_name.charAt(0)} src={u} />;`,
  },
  {
    why: 'Avatar itself, which is the one thing allowed to draw initials',
    flag: false,
    rel: 'src/components/avatar/Avatar.js',
    src: `const I = (name) => <span>{(name || '?').charAt(0)}</span>;`,
  },
];

function selfTest() {
  let bad = 0;
  for (const f of FIXTURES) {
    const hits = findInSource(f.rel || 'src/x/Fixture.js', f.src);
    const flagged = hits.length > 0;
    if (flagged !== f.flag) {
      bad += 1;
      console.log(`FAIL  expected ${f.flag ? 'a finding' : 'no finding'}: ${f.why}`);
      for (const h of hits) console.log(`      got: ${h.rule} - ${h.text}`);
    }
  }
  if (bad) {
    console.log(`\n${bad} of ${FIXTURES.length} self-test case(s) wrong`);
    process.exit(1);
  }
  console.log(`${FIXTURES.length} cases, both directions: self-test passed`);
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();

const findings = [];
for (const file of walk('src')) {
  const rel = file.split(path.sep).join('/');
  findings.push(...findInSource(rel, fs.readFileSync(file, 'utf8')));
}

for (const f of findings) {
  console.log(`${f.file}:${f.line}  ${f.rule}`);
  console.log(`  ${f.text}`);
  console.log(`  ${f.detail}`);
  console.log('');
}

console.log(`${findings.length} place(s) showing a name with no way to show the picture`);
process.exit(findings.length ? 1 : 0);

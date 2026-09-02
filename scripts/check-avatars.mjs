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

import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.next', '.git']);
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

const findings = [];

for (const file of files) {
  const rel = file.split(path.sep).join('/');
  if (ALLOWED.has(rel)) continue;

  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const lineOf = (index) => src.slice(0, index).split('\n').length;

  // 1. An initial taken off a person's name and rendered on its own. The
  //    `.charAt(0)` / `[0]` / `.slice(0, 1)` forms, applied to something that
  //    reads like a person.
  const initial = /\{\s*\(?[\w.?\s|'"]*\b(?:full_name|username|name|display_name)\b[^}]{0,80}?(?:\.charAt\(0\)|\.slice\(0,\s*1\)|\[0\])\s*\)?[^}]{0,40}\}/g;
  for (const m of src.matchAll(initial)) {
    // Inside an alt/aria/title string it is text, not a drawn avatar.
    const before = src.slice(Math.max(0, m.index - 60), m.index);
    if (/\b(?:alt|aria-label|title|key)\s*=\s*$/.test(before)) continue;
    findings.push({
      file: rel,
      line: lineOf(m.index),
      rule: 'hand-rolled initial',
      detail: 'draws a letter where a face belongs. Use <Avatar src={...} '
        + 'name={...} />, which shows the picture and falls back to initials.',
      text: m[0].replace(/\s+/g, ' ').slice(0, 100),
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
  //    So the file must draw no Avatar at all before this counts.
  const drawsAvatarSomewhere = /<Avatar[\s/>]/.test(src);
  if (!drawsAvatarSomewhere) {
    const chipOff = /<UserChip[^>]*\bsize=\{0\}/g;
    for (const m of src.matchAll(chipOff)) {
      findings.push({
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
}

for (const f of findings) {
  console.log(`${f.file}:${f.line}  ${f.rule}`);
  console.log(`  ${f.text}`);
  console.log(`  ${f.detail}`);
  console.log('');
}

console.log(`${findings.length} place(s) showing a name with no way to show the picture`);
process.exit(findings.length ? 1 : 0);

// The two design bans, and the vibecoded list, as code rather than as a rule.
//
// V-ENT/CLAUDE.md carries them with grep-level lists already written out. A
// rule with a grep in it that nobody runs is a rule that survives until the
// next person, which is why this exists.
//
//   node scripts/check-design.mjs
//
// BAN 1 - no hairline or outlined anything. Structure is built from surface
// and space, never from 1px strokes. The a11y focus ring is required and
// stays; native form controls draw their own.
//
// BAN 2 - no glow, halos, or ambient animation. A live dot is a solid flat
// dot. Emphasis is colour, weight, size and fill, never light bloom.
//
// VIBECODED - the parts of that list a scanner can actually see: the banned
// default typefaces, harsh gradients, and emoji used as interface.
//
// What it cannot judge is whether a layout is a cliche or whether the copy
// reads like filler. Those stay a read.

import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.next', '.git']);
const files = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(css|scss|jsx?)$/.test(entry.name)) files.push(full);
  }
};
walk('src');
if (fs.existsSync('public/styles')) walk('public/styles');

// One deliberate exception, by explicit instruction: the founder badge is the
// one component allowed to glow and loop. Recorded here rather than left as a
// mystery finding somebody keeps re-reporting.
const EXCEPTIONS = new Map([
  ['src/components/founder-badge/FounderBadge.js',
   'the founder badge glows by explicit CEO instruction'],
  ['src/components/founder-badge/founder-badge.module.css',
   'the founder badge glows by explicit CEO instruction'],
]);

const RULES = [
  // --- Ban 1: hairlines -------------------------------------------------
  { ban: 'hairline',
    what: 'a 1px stroke drawing structure',
    fix: 'a filled surface one step off the page background, radius 12-16px',
    re: /(?:^|[\s;{])border(?:-(?:top|right|bottom|left))?\s*:\s*(?!none|0)[^;]*\b1px\s+solid/gi },
  { ban: 'hairline',
    what: 'a dashed placeholder box',
    fix: 'centred muted text, or a filled muted surface',
    re: /border(?:-[a-z]+)?\s*:[^;]*\bdashed\b/gi },
  { ban: 'hairline',
    what: 'an <hr>',
    fix: 'more margin',
    re: /<hr[\s/>]/gi },

  // --- Ban 2: glow ------------------------------------------------------
  { ban: 'glow',
    what: 'a centred bloom (box-shadow with no offset)',
    fix: 'neutral downward elevation, or colour and weight instead',
    re: /box-shadow\s*:\s*(?:inset\s+)?0\s+0\s+[^;]*(?:rgba?\(|#[0-9a-f]{3})/gi },
  { ban: 'glow',
    what: 'a coloured drop-shadow filter',
    fix: 'as above',
    re: /drop-shadow\(\s*0\s+0\s/gi },
  { ban: 'glow',
    what: 'a pulsing or breathing animation',
    fix: 'a solid flat dot, or a text label plus colour',
    re: /@keyframes\s+(?:glow|pulse|breathe|shimmer|ping)\b|animation\s*:[^;]*\b(?:pulse|ping|glow|breathe|shimmer)\b/gi },
  { ban: 'glow',
    what: 'a blurred decorative orb',
    fix: 'delete it',
    re: /filter\s*:\s*blur\(|\bblur-(?:2xl|3xl)\b/gi },

  // --- Vibecoded --------------------------------------------------------
  { ban: 'vibecoded',
    what: 'a banned default typeface',
    fix: 'the chosen pairing: Clash Grotesk, with a real reason behind it',
    re: /font-family\s*:[^;]*\b(?:Inter|Geist|Space Grotesk)\b/gi },
  { ban: 'vibecoded',
    what: 'a multi-hue gradient wash',
    fix: 'one committed brand hue on a flat fill',
    re: /linear-gradient\([^)]*,[^)]*,[^)]*,[^)]*\)/gi },
];

const blank = (t) => t.replace(/[^\n]/g, ' ');
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
const skipped = [];

for (const file of files) {
  const rel = file.split(path.sep).join('/');
  if (EXCEPTIONS.has(rel)) {
    skipped.push({ file: rel, why: EXCEPTIONS.get(rel) });
    continue;
  }
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const lineOf = (i) => src.slice(0, i).split('\n').length;

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of src.matchAll(rule.re)) {
      // The accessibility focus ring is required and stays.
      const context = src.slice(Math.max(0, m.index - 120), m.index + 40);
      if (/focus-visible|:focus\b/.test(context)) continue;
      findings.push({
        file: rel, line: lineOf(m.index), ban: rule.ban,
        what: rule.what, fix: rule.fix,
        text: m[0].replace(/\s+/g, ' ').slice(0, 76),
      });
    }
  }
}

const byBan = {};
for (const f of findings) (byBan[f.ban] ||= []).push(f);

for (const ban of Object.keys(byBan)) {
  console.log(`--- ${ban} (${byBan[ban].length}) ---`);
  for (const f of byBan[ban].slice(0, 12)) {
    console.log(`  ${f.file}:${f.line}  ${f.what}`);
    console.log(`      ${f.text}`);
    console.log(`      use: ${f.fix}`);
  }
  if (byBan[ban].length > 12) {
    console.log(`  ... and ${byBan[ban].length - 12} more`);
  }
  console.log('');
}

for (const s of skipped) console.log(`exempt  ${s.file} - ${s.why}`);

console.log('');
console.log(`${findings.length} design-ban breach(es) across ${files.length} files`);
process.exit(findings.length ? 1 : 0);

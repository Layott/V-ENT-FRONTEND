// Control bytes sitting in source where an escape sequence was meant.
//
// The tickets console carried this one for weeks:
//
//     /\x08(day|jour|dia)\s*\d/i.test(row.name)
//
// That is a literal 0x08 byte, written by a shell heredoc which read \b as an
// escape and helpfully turned it into a backspace. It is invisible in an
// editor, in a diff, in code review and in a screenshot. The regex therefore
// matched nothing, the "No date set" warning never appeared on a ticket type
// with no date, and the hunt went to the render logic, then the API payload,
// then the component state, all three of which were correct.
//
// A second copy was capitalising game names: /\x08\w/g never matched, so
// "free_fire" rendered as "free fire" rather than "Free Fire".
//
// Neither the build, nor the linter, nor the tests can see these. Only this
// can.
//
//   node scripts/check-control-bytes.mjs

import fs from 'node:fs';
import path from 'node:path';

const EXT = new Set(['.js', '.jsx', '.css', '.json', '.mjs']);
const SKIP = new Set(['node_modules', '.next', '.git']);

// Everything below 0x20 except tab, newline and carriage return, which are the
// only control characters that legitimately appear in these files.
const BAD = /[\x00-\x08\x0b\x0c\x0e-\x1f]/;

const hits = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXT.has(path.extname(entry.name))) continue;

    const src = fs.readFileSync(full, 'utf8');
    if (!BAD.test(src)) continue;

    src.split('\n').forEach((line, i) => {
      if (!BAD.test(line)) return;
      hits.push({
        file: full.split(path.sep).join('/'),
        line: i + 1,
        // Print the line with the offender made visible, so the report is
        // actionable rather than being one more invisible thing.
        text: line.trim().replace(
          new RegExp(BAD.source, 'g'),
          (c) => '<0x' + c.charCodeAt(0).toString(16).padStart(2, '0') + '>',
        ),
      });
    });
  }
};

walk('src');
if (fs.existsSync('scripts')) walk('scripts');

for (const h of hits) {
  console.log(`${h.file}:${h.line}`);
  console.log(`  ${h.text}`);
}

console.log('');
console.log(`${hits.length} control byte(s) in source`);
process.exit(hits.length ? 1 : 0);

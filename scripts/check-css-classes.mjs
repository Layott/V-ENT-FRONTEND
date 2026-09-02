// A class name used but never defined resolves to `undefined`, and React
// renders class="undefined" without complaining. The element is still there,
// with no fill, no padding and no shape.
//
// This is how nine buttons on the event console - including every Save - came
// to look like plain text. A save button that does not look like a button does
// not get pressed, and the report that reaches you is "it didn't save" or
// "there was no save button on that page", which sends you looking at the save
// handler rather than at a missing line of CSS.
//
// Neither the build nor the linter sees it. Only this does.
//
//   node scripts/check-css-classes.mjs

import fs from 'node:fs';
import path from 'node:path';

const roots = ['src'];
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) files.push(full);
  }
};
roots.forEach((r) => fs.existsSync(r) && walk(r));

let problems = 0;
let severeCount = 0;
const report = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const imp = src.match(/import\s+styles\s+from\s+['"]([^'"]+\.module\.css)['"]/);
  if (!imp) continue;

  const cssPath = path.resolve(path.dirname(file), imp[1]);
  if (!fs.existsSync(cssPath)) continue;
  const css = fs.readFileSync(cssPath, 'utf8');

  // Every class selector the stylesheet defines.
  const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  // Every class the component reaches for. Bracket access is dynamic and can
  // only be checked by running the page, so it is deliberately skipped.
  const used = new Set([...src.matchAll(/styles\.([a-zA-Z]\w*)/g)].map((m) => m[1]));

  const missing = [...used].filter((c) => !defined.has(c)).sort();
  if (!missing.length) continue;

  // Not every undefined class breaks a control. `${styles.confirmButton}
  // goldBTN` still renders as a button, because a global class carries the
  // look. The dangerous kind is an undefined class on an INTERACTIVE element
  // with nothing else to style it: that control is invisible, and nobody
  // presses what they cannot see. That was the event console's Save.
  //
  // Without this split the count reads as 221 alarming problems, so it gets
  // ignored, and the few that genuinely break something are lost inside it.
  const severe = [];
  const cosmetic = [];
  for (const c of missing) {
    const onControl = new RegExp(
      `<(button|a|input|select|textarea)[^>]*styles\\.${c}\\b`).test(src);
    const alsoGlobalClass = new RegExp(
      `styles\\.${c}\\}[^\`"']*\\s[a-zA-Z]`).test(src);
    if (onControl && !alsoGlobalClass) severe.push(c);
    else cosmetic.push(c);
  }

  problems += missing.length;
  severeCount += severe.length;
  report.push({
    file: file.split(path.sep).join('/'), css: imp[1], missing, severe, cosmetic,
  });
}

// Severe first: those leave a control unstyled and therefore unpressable.
report.sort((a, b) => b.severe.length - a.severe.length
  || b.missing.length - a.missing.length);

for (const r of report) {
  if (!r.severe.length) continue;
  console.log(`SEVERE  ${r.file}`);
  console.log(`  -> interactive element with no styling: ${r.severe.join(', ')}`);
}
for (const r of report) {
  if (!r.cosmetic.length) continue;
  console.log(`        ${r.file}: ${r.cosmetic.slice(0, 8).join(', ')}`);
}

console.log('');
console.log(`${severeCount} undefined class(es) on an interactive element  <-- these break something`);
console.log(`${problems} undefined class reference(s) across ${report.length} file(s)`);
process.exit(severeCount ? 1 : 0);

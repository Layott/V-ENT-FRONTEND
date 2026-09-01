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
  if (missing.length) {
    problems += missing.length;
    report.push({ file: file.split(path.sep).join('/'), css: imp[1], missing });
  }
}

report.sort((a, b) => b.missing.length - a.missing.length);
for (const r of report) {
  console.log(`${r.file}`);
  console.log(`  -> ${r.css} is missing: ${r.missing.join(', ')}`);
}

console.log('');
console.log(`${problems} undefined class reference(s) across ${report.length} file(s)`);
process.exit(problems ? 1 : 0);

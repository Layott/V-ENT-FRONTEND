#!/usr/bin/env node
// No native date control on any screen.
//
// A native <input type="date"> draws its own text in the BROWSER's language,
// so a French page showed `mm/dd/yyyy`. All 25 were replaced by DateField in
// August 2026 and the memory said none were left. On 28 September 2026 the
// walk found six back: the running order's "Add a day", four deadlines on the
// lineup rules, and the anime studio's release date. A rule that lives in a
// memory file survives until the next person writes a form.
//
// What to write instead: `<DateField value onChange withTime? />` from
// src/components/date-field/DateField.js. Same value, same event shape.
//
// `type="time"` is not refused: DateField does not draw a time on its own, and
// the one weekly time field has no replacement yet.
//
//   node scripts/check-date-inputs.mjs
//   node scripts/check-date-inputs.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');

const NATIVE = /type\s*=\s*\{?\s*['"](date|datetime-local|month|week)['"]/;
const ALLOWED = {
  'src/components/date-field/DateField.js': 'the replacement itself',
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next'].includes(entry.name) || entry.name.startsWith('.next-dev')) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

export function findNative(files, root = FRONTEND) {
  const hits = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (ALLOWED[rel]) continue;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      if (NATIVE.test(line)) hits.push(`${rel}:${i + 1}: ${t.slice(0, 110)}`);
    });
  }
  return hits;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(FRONTEND, '.date-inputs-selftest-'));
  const cases = [
    ['src/a.js', '<input className={styles.input} type="date" value={day} />', 1],
    ['src/b.js', "<input type='datetime-local' value={at} />", 1],
    ['src/c.js', '<input type={"month"} />', 1],
    ['src/d.js', '<DateField withTime value={at} onChange={set} />', 0],
    ['src/e.js', '<input type="time" value={t} />', 0],
    ['src/f.js', '// the old <input type="date"> is refused', 0],
    ['src/components/date-field/DateField.js', "const kind = 'type=\"date\"';", 0],
  ];
  let failed = 0;
  for (const [name, body, expected] of cases) {
    const file = path.join(tmp, ...name.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body + '\n');
    const got = findNative([file], tmp).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: expected ${expected}, got ${got}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const files = walk(path.join(FRONTEND, 'src'));
  const hits = findNative(files);
  for (const h of hits) console.log(h);
  console.log(`${hits.length} native date control${hits.length === 1 ? '' : 's'} in ${files.length} files`);
  process.exit(hits.length ? 1 : 0);
}

#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * The legal pages have to be pages, and they have to be finished.
 *
 * The terms of use shipped as a PDF carrying its own drafting notes: "the laws
 * of [Insert Jurisdiction, e.g., the Federal Republic of Nigeria]" and "[Insert
 * Dispute Resolution Mechanism, ...]". It survived for a year because a PDF is
 * not something anybody opens while working on the app, and nothing on the way
 * to production reads it.
 *
 * So this reads it. It checks that both documents are routes rather than files,
 * that neither contains a placeholder or a square-bracketed note, and that the
 * terms name a country and a court rather than leaving it to the reader.
 *
 * Usage: node scripts/check-legal.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'src', 'app');
const PUBLIC = path.join(HERE, '..', 'public');

const problems = [];

// 1. Both are routes.
for (const route of ['terms', 'privacy-policy']) {
  if (!fs.existsSync(path.join(APP, route, 'page.js'))) {
    problems.push(`/${route} is not a page`);
  }
}

// 2. Neither is still a document in /public. A PDF cannot be translated, cannot
//    be read by a crawler or a screen reader, and cannot be corrected by anybody
//    who does not own the original file.
for (const f of fs.existsSync(PUBLIC) ? fs.readdirSync(PUBLIC) : []) {
  if (/(terms|privacy|policy).*\.(pdf|docx?)$/i.test(f)) {
    problems.push(`public/${f} is a document, not a page`);
  }
}

// 3. No placeholder left in the copy.
const PLACEHOLDER = /\[insert[^\]]*\]|\bTBD\b|\bTODO\b|\bXXX\b|\bLorem ipsum\b|\{\{[^}]+\}\}/i;
const copyFiles = ['terms/termsCopy.js', 'privacy-policy/policyCopy.js']
  .map((f) => path.join(APP, f))
  .filter((f) => fs.existsSync(f));

for (const file of copyFiles) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // The comment header quotes the placeholder it exists to explain, so only
    // string content counts.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (PLACEHOLDER.test(line)) {
      problems.push(`${path.basename(file)}:${i + 1} placeholder: ${trimmed.slice(0, 70)}`);
    }
  });
}

// 4. The terms say which law and which court. This is the specific thing that
//    was wrong, so it is the specific thing that is asserted.
if (fs.existsSync(path.join(APP, 'terms/termsCopy.js'))) {
  const terms = fs.readFileSync(path.join(APP, 'terms/termsCopy.js'), 'utf8');
  if (!/laws of the Federal Republic of Nigeria/.test(terms)) {
    problems.push('termsCopy.js does not name the governing law');
  }
  if (!/courts of Lagos State/.test(terms)) {
    problems.push('termsCopy.js does not name where a dispute is heard');
  }
}

console.log(`legal pages checked: ${copyFiles.length}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log('no placeholders');

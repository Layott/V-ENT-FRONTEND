#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Nothing rises when you point at it.
 *
 * From the design rules: "hover animation on everything (lift, scale, glow,
 * translate)" is banned, and the replacement is "instant state changes (fill,
 * color, weight) for hover". A card that lifts under the cursor is on every
 * generated page this year, it does nothing on a phone, where most of this is
 * read, and it moves the text somebody is in the middle of reading.
 *
 * This finds `transform: translateY(-...)` and `scale(...)` inside a `:hover`
 * rule. Keyframes are left alone: motion for something arriving is allowed, and
 * is a different thing.
 *
 * Usage: node scripts/check-hover-lift.mjs [--fix]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOTS = [path.join(HERE, '..', 'src'), path.join(HERE, '..', 'public', 'styles')];
const FIX = process.argv.includes('--fix');

function cssFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) cssFiles(full, out);
    else if (e.name.endsWith('.css')) out.push(full);
  }
  return out;
}

const MOVES = /transform:\s*[^;]*(?:translate[XY]?\(\s*-?[\d.]|scale\(\s*1\.[\d])[^;]*;?/gi;

const offenders = [];
let fixed = 0;

for (const file of ROOTS.flatMap((r) => cssFiles(r))) {
  const css = fs.readFileSync(file, 'utf8');
  let out = '';
  let last = 0;
  let changed = false;

  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().split('\n').pop().trim();
    if (!selector.includes(':hover')) continue;
    if (!MOVES.test(m[2])) { MOVES.lastIndex = 0; continue; }
    MOVES.lastIndex = 0;

    const line = css.slice(0, m.index).split('\n').length;
    offenders.push(`${path.relative(path.join(HERE, '..'), file)}:${line}  ${selector}`);

    if (FIX) {
      const body = m[2].replace(MOVES, '').replace(/\n\s*\n\s*\n/g, '\n\n');
      out += css.slice(last, m.index) + m[1] + '{' + body + '}';
      last = m.index + m[0].length;
      changed = true;
      fixed += 1;
    }
  }

  if (FIX && changed) {
    out += css.slice(last);
    // A rule left with nothing in it is noise; drop it.
    out = out.replace(/^[^{}\n][^{}]*\{\s*\}\n?/gm, '');
    fs.writeFileSync(file, out);
  }
}

if (FIX) {
  console.log(`hover movements removed: ${fixed}`);
} else {
  console.log(`hover rules that move something: ${offenders.length}`);
  if (offenders.length) {
    console.log('\nA HOVER MUST NOT MOVE ANYTHING (run with --fix):');
    for (const o of offenders.slice(0, 80)) console.log(`  ${o}`);
    process.exit(1);
  }
  console.log('nothing rises on hover');
}

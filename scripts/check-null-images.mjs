// An <img> whose src can be null.
//
// `lib/mediaUrl.js` returns null when there is nothing to load, and says so in
// its own comment: "anything empty comes back null so the caller can draw its
// own fallback rather than render a broken image."
//
// The club page ignored that and passed the null straight through:
//
//     <img src={mediaUrl(club.banner)} alt={`${club.name} banner`} />
//     <img src={mediaUrl(club.logo)}   alt={`${club.name} logo`} />
//
// A club with no artwork - which is every club on the day it is made - drew two
// broken-image glyphs, one of them across the whole hero, with the alt text
// sitting beside them in the middle of the page. Nothing could report it: the
// markup is valid, the helper did exactly what it promised, and the only way to
// see it is to make a club and look.
//
//   node scripts/check-null-images.mjs
//
// The rule: if `mediaUrl(...)` is the src, the same expression must guard the
// element, or the src must have a fallback of its own (`|| something`, `??`).

import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(full);
  }
};
walk('src');


// Only what a page can actually render. A component no page imports any more
// is dead code, and reporting its images buries the ones somebody can see.
const importsOf = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    let base;
    if (spec.startsWith('@/')) base = path.join('src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.join(path.dirname(file), spec);
    else continue;
    for (const ext of ['.js', '.jsx', '/index.js', '/index.jsx']) {
      if (fs.existsSync(base + ext)) { out.push(base + ext); break; }
      if (fs.existsSync(base) && fs.statSync(base).isFile()) { out.push(base); break; }
    }
  }
  return out;
};

const reachable = new Set();
{
  const queue = files.filter((f) => /page\.jsx?$/.test(f) || /layout\.jsx?$/.test(f));
  while (queue.length) {
    const next = queue.pop();
    const key = path.resolve(next);
    if (reachable.has(key)) continue;
    reachable.add(key);
    for (const dep of importsOf(next)) queue.push(dep);
  }
}

const findings = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = file.split(path.sep).join('/');
  if (rel.includes('check-null-images')) continue;
  if (!reachable.has(path.resolve(file))) continue;

  for (const m of src.matchAll(/<(?:img|Image)\b[^>]*?\bsrc=\{([^}]*mediaUrl\([^)]*\)[^}]*)\}/g)) {
    const expr = m[1];
    // A fallback inside the src itself is a guard: `mediaUrl(x) || fallback`.
    if (/\|\||\?\?/.test(expr)) continue;

    // Or the element sits behind the same expression. 400 characters back is
    // the JSX conditional that wraps it; further than that and the guard is
    // too far from the element to be one.
    const inner = (expr.match(/mediaUrl\(([^)]*)\)/) || [])[1] || '';
    const before = src.slice(Math.max(0, m.index - 400), m.index);
    if (inner && before.includes(`mediaUrl(${inner})`)) continue;

    findings.push({
      rel,
      line: src.slice(0, m.index).split('\n').length,
      expr: expr.trim().slice(0, 60),
    });
  }
}

for (const f of findings) {
  console.log(`${f.rel}:${f.line}`);
  console.log(`  <img src={${f.expr}}> with no guard. mediaUrl returns null when`
    + ' there is nothing to load, and a null src renders a broken-image glyph');
  console.log('  with the alt text beside it. Guard the element, or give the'
    + ' src a fallback.');
  console.log('');
}

console.log(`${findings.length} image(s) that can render as broken`);
process.exit(findings.length ? 1 : 0);

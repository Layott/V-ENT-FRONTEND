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

    // Or the element sits behind something that implies the src is not null.
    // Two shapes count, and the second was missing at first:
    //
    //     {mediaUrl(x) && <img src={mediaUrl(x)} />}     the helper
    //     {x && <img src={mediaUrl(x)} />}               the field itself
    //
    // The second is just as safe, because mediaUrl only returns null for a
    // falsy input. Not accepting it made the checker report 63 sites of which
    // a good half were already correct, and a checker that reports correct
    // code is one people stop reading.
    //
    // Optional chaining is normalised away, because `{r.user?.avatar && <img
    // src={mediaUrl(r.user.avatar)} />}` is the same expression written twice
    // with different care about the middle of the path.
    const inner = (expr.match(/mediaUrl\(([^)]*)\)/) || [])[1] || '';
    const before = src.slice(Math.max(0, m.index - 400), m.index);
    const plain = (t) => t.replace(/\?\./g, '.').replace(/\s+/g, '');
    // And one more shape, which is the normal way to show the first of a list:
    //
    //     {post.images && post.images.length > 0 && <img src={mediaUrl(post.images[0])} />}
    //
    // The guard names the array, the src takes element zero. Only a literal
    // `[0]` is stripped: guarding that an array exists says nothing about
    // whether it has a sixth element, and excusing `[5]` here would hide a
    // real one.
    const first = inner.replace(/\[0\]$/, '');
    if (inner && (before.includes(`mediaUrl(${inner})`)
      || plain(before).includes(plain(inner))
      || (first !== inner && plain(before).includes(plain(first))))) continue;

    findings.push({
      rel,
      line: src.slice(0, m.index).split('\n').length,
      expr: expr.trim().slice(0, 60),
    });
  }
}


// ---------------------------------------------------------------- self-test
//
// This now reports zero, and a zero has two meanings: the code is clean, or
// the checker is broken. `check-signed-out` went to a passing zero three
// separate times while its bug was still in the tree, so every checker here
// carries fixtures of the real shapes and runs them against the live matcher.
//
// The calibration matters as much as the detection. This first reported 63
// sites, of which 54 were already correct: guarded by the raw field rather
// than by `mediaUrl(field)`. A checker that reports correct code is one people
// stop reading, so the false cases below are fixtures too.
//
//   node scripts/check-null-images.mjs --self-test

const FIXTURES = [
  {
    name: 'the club hero, 2 September 2026',
    shouldFlag: true,
    src: '<img src={mediaUrl(club.banner)} alt={`${club.name} banner`} className={s.heroBanner} />',
  },
  {
    name: 'guarded by the helper',
    shouldFlag: false,
    src: '{mediaUrl(club.banner) && <img src={mediaUrl(club.banner)} alt="" />}',
  },
  {
    name: 'guarded by the field itself',
    shouldFlag: false,
    src: '{r.user?.avatar && <Image src={mediaUrl(r.user.avatar)} alt={r.user.full_name} width={36} height={36} />}',
  },
  {
    name: 'the first of a list, guarded by the list',
    shouldFlag: false,
    src: '{post.images && post.images.length > 0 && <img src={mediaUrl(post.images[0])} alt="" />}',
  },
  {
    name: 'a fallback inside the src',
    shouldFlag: false,
    src: '<img src={mediaUrl(org.logo) || placeholder} alt={org.name} />',
  },
  {
    name: 'guarded by a DIFFERENT field, which guards nothing',
    shouldFlag: true,
    src: '{club.name && <img src={mediaUrl(club.banner)} alt={club.name} />}',
  },
];

const flagsIn = (text) => {
  let n = 0;
  for (const m of text.matchAll(/<(?:img|Image)\b[^>]*?\bsrc=\{([^}]*mediaUrl\([^)]*\)[^}]*)\}/g)) {
    const expr = m[1];
    if (/\|\||\?\?/.test(expr)) continue;
    const inner = (expr.match(/mediaUrl\(([^)]*)\)/) || [])[1] || '';
    const before = text.slice(Math.max(0, m.index - 400), m.index);
    const plain = (t) => t.replace(/\?\./g, '.').replace(/\s+/g, '');
    const first = inner.replace(/\[0\]$/, '');
    if (inner && (before.includes(`mediaUrl(${inner})`)
      || plain(before).includes(plain(inner))
      || (first !== inner && plain(before).includes(plain(first))))) continue;
    n += 1;
  }
  return n;
};

let selfTestFailures = 0;
for (const f of FIXTURES) {
  const found = flagsIn(f.src) > 0;
  const ok = found === f.shouldFlag;
  if (!ok) selfTestFailures += 1;
  if (!ok || process.argv.includes('--self-test')) {
    console.log(`${ok ? 'ok  ' : 'BAD '} self-test: ${f.name}`
      + ` (expected ${f.shouldFlag ? 'a report' : 'silence'},`
      + ` got ${found ? 'a report' : 'silence'})`);
  }
}
if (selfTestFailures) {
  console.log('');
  console.log(`${selfTestFailures} self-test(s) failed: this checker can no`
    + ' longer see a fault it was built for, or it now reports code that is'
    + ' fine. Fix the checker before trusting its count.');
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
process.exit(findings.length + selfTestFailures ? 1 : 0);

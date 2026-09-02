// A ref that is read but never attached.
//
// The sponsor logo upload in both creation wizards looked like this:
//
//     const fileInputs = useRef([]);
//     const triggerFileInput = i => fileInputs.current[i].click();
//     ...
//     <input type="file" id={`logoUpload-${i}`} className={styles.hiddenInput} />
//
// The input is hidden and a visible box forwards the click to it, so the ref
// is the only thing joining the two - and there is no `ref` on the input. The
// array stays empty, `fileInputs.current[i]` is undefined, and `.click()`
// throws. On screen: pressing Upload Logo did nothing at all. No picker, no
// message, just a TypeError in a console nobody has open.
//
// It had never worked, on tournaments or on events, and nothing caught it: the
// build compiles it, the linter allows it, and a ref is exactly the kind of
// wiring a reader assumes is there.
//
//   node scripts/check-dangling-refs.mjs

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

const findings = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  // Every `const x = useRef(...)` in the file.
  const declared = [...src.matchAll(/const\s+(\w+)\s*=\s*useRef\s*\(/g)]
    .map((m) => m[1]);
  if (!declared.length) continue;

  for (const name of declared) {
    // Is it USED as a live DOM handle? Reading .current is not enough on its
    // own, because a ref is also a perfectly good mutable box that never
    // touches the DOM. Calling a DOM method on it is the tell.
    const usesDom = new RegExp(
      `\\b${name}\\.current(?:\\[[^\\]]*\\])?\\s*(?:\\?\\.)?\\s*\\.?\\s*` +
      `(?:click|focus|blur|scrollIntoView|select|submit|play|pause)\\s*\\(`,
    ).test(src)
      || new RegExp(`\\b${name}\\.current(?:\\[[^\\]]*\\])?\\.(?:click|focus)\\b`).test(src);
    if (!usesDom) continue;

    // Is it ATTACHED anywhere? Either directly, or through a callback ref
    // that assigns into it.
    const attached = new RegExp(`ref=\\{[^}]*\\b${name}\\b`).test(src)
      || new RegExp(`\\b${name}\\.current(?:\\[[^\\]]*\\])?\\s*=\\s*(?:el|node|e|ref)\\b`).test(src);
    if (attached) continue;

    const line = src.slice(0, src.indexOf(`${name}.current`)).split('\n').length;
    findings.push({
      file: file.split(path.sep).join('/'),
      line,
      name,
    });
  }
}

for (const f of findings) {
  console.log(`${f.file}:${f.line}`);
  console.log(`  \`${f.name}\` has a DOM method called on it and is never attached with ref=`);
}

console.log('');
console.log(`${findings.length} ref(s) read but never attached`);
process.exit(findings.length ? 1 : 0);

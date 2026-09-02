// A const read before the line that declares it.
//
// The profile page white-screened on every account. The cause:
//
//     const safetyTarget = profileData?.username || null;      // line 113
//     useEffect(() => { ... }, [safetyTarget, isOwner, ...]);  // line 115
//     ...
//     const isOwner = !profileId || profileId === sessionUserId;   // line 137
//
// The dependency array is evaluated during render, and `isOwner` is a `const`
// declared twenty lines further down, so reading it hits the temporal dead
// zone. React reports it from a minified bundle as
//
//     ReferenceError: Cannot access 'eP' before initialization
//
// which names a variable that does not exist in the source, on a page it does
// not name. Nothing else catches it: the build compiles it, the linter allows
// it, and it only fires at runtime on the page that has it.
//
//   node scripts/check-tdz.mjs
//
// It reads hook dependency arrays specifically. That is where this happens,
// because a dependency array looks like documentation and is actually an
// expression that runs immediately, so moving a block of code up in a
// component quietly changes when its names are read.

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

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const lineOf = (i) => src.slice(0, i).split('\n').length;

  // The start of the top-level function or component enclosing an offset.
  // Top-level means declared at column 0, which is how every component in
  // this codebase is written.
  const starts = [...src.matchAll(
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+\w+|^(?:export\s+)?const\s+\w+\s*=\s*(?:\([^)]*\)|\w+)\s*=>/gm,
  )].map((m) => m.index);
  const componentAt = (offset) => {
    let found = -1;
    for (const start of starts) {
      if (start <= offset) found = start;
      else break;
    }
    return found;
  };

  // Where each top-of-component const is declared. Only simple
  // `const name = ...` and `const [a, b] = ...`, which is what a component
  // body is made of.
  const declaredAt = new Map();
  for (const m of src.matchAll(/^\s*const\s+(?:\[([^\]]+)\]|(\w+))\s*=/gm)) {
    const names = m[1]
      ? m[1].split(',').map((n) => n.trim()).filter(Boolean)
      : [m[2]];
    for (const name of names) {
      // First declaration wins: a name redeclared in a nested scope is a
      // different binding and not what this is looking for.
      if (!declaredAt.has(name)) declaredAt.set(name, m.index);
    }
  }

  // Every hook dependency array, and where it sits.
  for (const m of src.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)) {
    const deps = m[1];
    if (!deps.trim()) continue;
    const at = m.index;

    for (const raw of deps.split(',')) {
      // The root identifier: `session?.user?.id` depends on `session`.
      const name = raw.trim().split(/[.?[\s]/)[0];
      if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) continue;

      const declared = declaredAt.get(name);
      if (declared === undefined) continue;      // imported, or a prop
      if (declared < at) continue;               // declared first, which is fine

      // Both have to be inside the SAME component. One file often holds
      // several, and a name declared in a later component is a different
      // binding entirely - flagging those made the checker report four
      // things, three of which were nothing, which is how a checker teaches
      // people to skip it.
      if (componentAt(at) !== componentAt(declared)) continue;

      findings.push({
        file: file.split(path.sep).join('/'),
        line: lineOf(at),
        name,
        declaredLine: lineOf(declared),
      });
    }
  }
}

for (const f of findings) {
  console.log(`${f.file}:${f.line}`);
  console.log(`  a dependency array reads \`${f.name}\`, which is declared`
    + ` at line ${f.declaredLine}`);
  console.log('  A dependency array runs during render. Move this below the'
    + ' declaration, or the page throws before it paints.');
  console.log('');
}

console.log(`${findings.length} dependency read before its declaration`);
process.exit(findings.length ? 1 : 0);

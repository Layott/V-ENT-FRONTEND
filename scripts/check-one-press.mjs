#!/usr/bin/env node
// A destructive control takes two presses.
//
// On 18 September 2026 eight controls deleted, ended, cancelled or refunded
// something on ONE press: a ticket tier, a vendor pitch (it deleted one
// mid-walk), End broadcast (it killed every browser-source URL in somebody's
// OBS scene), an overlay's Remove and New URL, a sponsor, a product, and
// Cancel and refund on an order. Each was fixed the same way: the first press
// opens a "Remove {name}?" / "Keep it" pair, the second press does it.
//
// This reads every component: a function whose body sends a DELETE, or posts
// to a path that deletes, ends, cancels, refunds or rotates, is destructive.
// Every onClick that calls it must clear a confirm state in the same handler
// (`setRemoving(null)`, `setConfirm(false)`, `setPending('')`), which is what
// the second press of a two-press control looks like. A control that is
// deliberately one press (Undo check-in at a gate with a queue) says so on
// the line above its handler:
//
//     {/* one-press: undo at a gate is reversed by pressing Check in again */}
//
//   node scripts/check-one-press.mjs
//   node scripts/check-one-press.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// What makes a function destructive.
const DESTRUCTIVE_CALL = /method:\s*['"]DELETE['"]|\/(delete|remove|end|cancel|refund|rotate|void|reject)\/?['"`]/;
// The second press of a two-press control clears the confirm state.
const CLEARS_CONFIRM = /set[A-Z]\w*\(\s*(null|false|''|"")\s*\)/;
// A control that says it is one press on purpose.
const DECLARED = /one-press:/;
// The confirm step drawn around the second press: the button is rendered only
// while `removing === row.id`, or its label is a question ("Remove {name}?"),
// or its sibling is "Keep it", or the panel says "Yes, delete it".
const CONFIRM_NEARBY = /[Kk]eep it|[Cc]onfirm|\?['"`]|===\s*\w+(?:\.id)?\s*\?|Yes,/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next'].includes(entry.name)) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// Function bodies by name: `const name = (...) => {` / `async function name(`
// / `const name = async (...) =>`, read until the brace that closes them.
function functionsOf(text) {
  const out = new Map();
  const re = /(?:const|let|function)\s+([A-Za-z_$][\w$]*)\s*=?\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)?\s*(?:=>)?\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    const name = m[1];
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') { depth -= 1; if (depth === 0) break; }
    }
    out.set(name, text.slice(m.index, i + 1));
  }
  return out;
}

// Every onClick={...} with its balanced expression and the line it starts on.
function handlersOf(text) {
  const out = [];
  const re = /onClick=\{/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') { depth -= 1; if (depth === 0) break; }
    }
    const body = text.slice(m.index + m[0].length, i);
    const line = text.slice(0, m.index).split('\n').length;
    const before = text.slice(Math.max(0, m.index - 400), m.index);
    const after = text.slice(i, i + 250);
    out.push({ body, line, before, after });
  }
  return out;
}

export function findOnePress(files) {
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!DESTRUCTIVE_CALL.test(text)) continue;
    const fns = functionsOf(text);
    const destructive = new Set();
    for (const [name, body] of fns) {
      if (DESTRUCTIVE_CALL.test(body)) destructive.add(name);
    }
    for (const h of handlersOf(text)) {
      const calls = [...destructive].filter((n) => new RegExp('\\b' + n + '\\s*\\(').test(h.body));
      const inline = DESTRUCTIVE_CALL.test(h.body);
      if (!calls.length && !inline) continue;
      if (CLEARS_CONFIRM.test(h.body)) continue;
      // The second press may live inside the function: it clears the confirm
      // state itself, and the button only exists while that state is set.
      if (calls.some((n) => CLEARS_CONFIRM.test(fns.get(n) || ''))) continue;
      if (CONFIRM_NEARBY.test(h.before) || CONFIRM_NEARBY.test(h.after)) continue;
      if (DECLARED.test(h.before)) continue;
      hits.push(`${path.relative(ROOT, file)}:${h.line}: ${calls.join(', ') || 'inline'} on one press`);
    }
  }
  return hits;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(ROOT, '.one-press-selftest-'));
  const cases = [
    ['one.js', `
      const removeTier = async (row) => { await call('/tiers/' + row.id + '/', { method: 'DELETE' }); };
      export default function X() { return <button onClick={() => removeTier(row)}>Remove</button>; }
    `, 1],
    ['two.js', `
      const removeTier = async (row) => { await call('/tiers/' + row.id + '/', { method: 'DELETE' }); };
      export default function X() { return <>
        <button onClick={() => setRemoving(row.id)}>Remove</button>
        <button onClick={() => { setRemoving(null); removeTier(row); }}>Remove {name}?</button>
        <button onClick={() => setRemoving(null)}>Keep it</button>
      </>; }
    `, 0],
    ['inline.js', `
      export default function X() { return <button onClick={() => fetch(API + '/event/' + id + '/cancel/', { method: 'POST' })}>End</button>; }
    `, 1],
    ['declared.js', `
      const undo = async () => { await fetch(API + '/undo-check-in/', { method: 'POST' }); };
      export default function X() { return <>
        {/* one-press: undo at a gate is reversed by pressing Check in again */}
        <button onClick={() => undo()}>Undo</button>
      </>; }
    `, 0],
    ['harmless.js', `
      const save = async () => { await fetch(API + '/tiers/', { method: 'POST' }); };
      export default function X() { return <button onClick={() => save()}>Save</button>; }
    `, 0],
  ];
  let failed = 0;
  for (const [name, body, expected] of cases) {
    const file = path.join(tmp, name);
    fs.writeFileSync(file, body);
    const got = findOnePress([file]).length;
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
  const files = walk(path.join(ROOT, 'src'));
  const hits = findOnePress(files);
  for (const h of hits) console.log(h);
  console.log(`${hits.length} destructive control${hits.length === 1 ? '' : 's'} on one press, in ${files.length} files`);
  process.exit(hits.length ? 1 : 0);
}

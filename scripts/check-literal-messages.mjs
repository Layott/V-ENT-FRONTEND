// An English sentence handed straight to the screen as an error or a notice.
//
// `e.start_date = 'Start date is required.'` and `setDmError('Could not reach
// the server.')` never pass through t(), so a French or Portuguese reader gets
// English at the exact moment something went wrong. check-keys cannot see
// them (there is no key), and check-literal-text reads JSX text, not strings
// assigned in a validator. Found 30 September 2026 on the events audit (inbox
// 364): the event wizard's ten validation messages on a French page, then 47
// across 14 files, the login and signup forms among them.
//
// What counts: a string that starts like a sentence (a capital, a word, a
// space) assigned to a property (`errors.name = '...'`) or passed to a setter
// named for a message (`setXError(...)`, `setXMsg(...)`, `showToast(...)`,
// `toast(...)`, `alert(...)`). Wrapped in tt('key', '...') it is fine. The
// admin console is English only and exempt.
//
//   node scripts/check-literal-messages.mjs
//   node scripts/check-literal-messages.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

const PATTERN = /(\b[a-zA-Z_]+\.(?!(?:className|id|href|src|rel|target|type|style|key|download|title)\b)[a-zA-Z_]+ = |set[A-Z][a-zA-Z]*(?:Error|Msg|Message|Notice|Status|Toast)\(|showToast\(|toast\(|alert\()\s*(['"])[A-Z][a-z]+[ ,][^'"]{6,}\2/;

// The same fault in a prop: `sub="Open to join now"`, a template placeholder
// `What's on your mind, ${name}?`, an aria-label or alt in English. Found on
// the full walk (inbox 376): 14 more. ComingSoon translates its own props by
// their English text, so its lines are exempt.
const PROPS = /\b(?:placeholder|title|alt|aria-label|label|sub|hint|text|description|emptyText|message|heading|subtitle|caption|tooltip)=(?:"[A-Z][a-z']+ [^"{}]{3,}"|\{`[A-Z][a-z']+ [^`]{3,}`\})/;

export function literalMessages(source) {
  const out = [];
  source.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;
    if (PATTERN.test(line)) out.push([i + 1, t]);
    else if (PROPS.test(line) && !/<ComingSoon\b/.test(line)) out.push([i + 1, t]);
  });
  return out;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '(admin)' || entry.name === 'generated') continue;
      walk(p, out);
    } else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const cases = [
    ['a validator', "if (!x) e.start_date = 'Start date is required.';", 1],
    ['a setter', "setDmError('Could not reach the server.');", 1],
    ['double quotes', 'next.password = "Password is required";', 1],
    ['a toast', "showToast('Saved your changes for later.')", 1],
    ['through tt', "e.start_date = tt('msg.startNeeded', 'Start date is required.');", 0],
    ['a setter through tt', "setDmError(tt('msg.noReach', 'Could not reach the server.'));", 0],
    ['a class name', "el.className = 'Card header';", 0],
    ['a code', "setError('NETWORK')", 0],
    ['a comment', "// e.name = 'Event name is required.'", 0],
    ['a sub prop', '<StatCard sub="Open to join now" />', 1],
    ['a template placeholder', "<textarea placeholder={`What's on your mind, ${name}?`} />", 1],
    ['an aria-label', '<button aria-label={`Remove ${g.name}`} />', 1],
    ['a keyed prop', "<StatCard sub={tt('home.sub.x', 'Open to join now')} />", 0],
    ['ComingSoon translates its own', '<ComingSoon title="Stream overlay" />', 0],
  ];
  let bad = 0;
  for (const [what, src, expected] of cases) {
    const got = literalMessages(src).length;
    if (got !== expected) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${expected}`); }
    else console.log(`ok: ${what} -> ${got}`);
  }
  if (bad) process.exit(1);
  console.log('self-test: catches English handed to the screen, leaves tt(), class names and codes');
  process.exit(0);
}

if (isMain) {
  const hits = [];
  for (const f of walk(SRC)) {
    for (const [line, text] of literalMessages(fs.readFileSync(f, 'utf8'))) {
      hits.push(`${path.relative(path.join(HERE, '..'), f)}:${line}  ${text.slice(0, 120)}`);
    }
  }
  for (const h of hits) console.log(`  ${h}`);
  console.log(`${hits.length} English message(s) handed to the screen without a key`);
  process.exit(hits.length ? 1 : 0);
}

// An error a person is shown that was written for an engineer.
//
// CEO, 2 September 2026, with a screenshot of his own tournament console:
//
//     Pending BE deploy - this action activates once the backend endpoint
//     ships. (Cancel & Refund)
//
// "that kind of error should not show publicly, there needs to be proper
// errors for stuff like that, create a catcher for errors that do not have
// proper uis".
//
// That sentence names an internal deploy process, is untranslated, and tells
// the person who owns the tournament nothing they can do. It was also WRONG:
// the endpoint had shipped months earlier and the console was calling it with
// a slug against an int route.
//
// The same family reached him on the same day as
//
//     Authorization header with a Bearer token is required.
//
// which is a raw server string rendered straight into a user's error slot.
//
// So two faults, and they are the two ways an error goes wrong here:
//
// ## Fault 1: developer vocabulary in text a person reads
//
// "BE deploy", "endpoint", "backend", "500", "null", "undefined", "traceback",
// "not implemented". Words from the inside of the machine. A person cannot act
// on any of them.
//
// ## Fault 2: a raw server string used as the message
//
//     setError(data.message)
//     setError(err.message)
//
// The API's `message` is written for whoever is reading the logs and is only
// ever in English. `lib/apiMessage.js` exists precisely for this: it maps a
// server CODE onto a translated sentence, and falls back to one the app owns.
// Anything that renders `.message` straight is one backend edit away from
// showing somebody a sentence nobody wrote for them.
//
//   node scripts/check-error-ui.mjs
//   node scripts/check-error-ui.mjs --self-test

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

// Words that belong on the inside. Deliberately narrow: "error" and "failed"
// are perfectly good words to say to somebody, and a checker that bans them
// would be reporting most of the product.
const INSIDE = [
  /\bBE[- ]?(deploy|gap)\b/i,
  /\bbackend endpoint\b/i,
  /\bnot implemented\b/i,
  /\bunimplemented\b/i,
  /\bTODO\b/,
  /\bstack ?trace\b/i,
  /\btraceback\b/i,
  /\bnull\b(?!able)/,
  /\bundefined\b/,
  /\bHTTP \d{3}\b/,
  /\b(500|502|503) (error|response)\b/i,
  /Authorization header/i,
  /\bBearer token\b/i,
];

// `.message` straight out of a response, put where a person will read it.
const RAW_MESSAGE = /set(?:Error|Message|Toast|Notice|Banner|Status)\s*\(\s*(?:[\w.?]*(?:err|error|e|res|data|body|json|payload)[\w.?]*\.message)\b/;

const blank = (t) => t.replace(/[^\n]/g, ' ');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;   // a URL
    return line.slice(0, at) + ' '.repeat(line.length - at);
  })
  .join('\n');

const findings = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripComments(raw);
  const rel = file.split(path.sep).join('/');
  if (rel.includes('check-error-ui')) continue;
  // `apiMessage` is the fix, not the fault; it names the shapes it replaces.
  if (rel.endsWith('lib/apiMessage.js')) continue;

  // Fault 1, only inside text a person actually reads: a `tt()` default, or a
  // bare string in JSX. Not inside a fetch URL, a key, or a console.log.
  for (const m of src.matchAll(/tt\(\s*["'][^"']*["']\s*,\s*(["'])((?:(?!\1)[\s\S]){4,300})\1/g)) {
    const text = m[2];
    const hit = INSIDE.find((re) => re.test(text));
    if (!hit) continue;
    findings.push({
      rel,
      line: src.slice(0, m.index).split('\n').length,
      kind: 'developer vocabulary',
      detail: text.slice(0, 90),
    });
  }

  // Fault 2.
  for (const m of src.matchAll(new RegExp(RAW_MESSAGE, 'g'))) {
    findings.push({
      rel,
      line: src.slice(0, m.index).split('\n').length,
      kind: 'raw server string',
      detail: m[0].slice(0, 70),
    });
  }
}

// ---------------------------------------------------------------- self-test
//
// A zero here has two meanings, and every checker in this repo that reported a
// confident zero while broken has taught the same lesson. These are the two
// real sentences that reached the CEO, plus the shapes that must NOT be
// reported, because a checker that flags correct code is one people stop
// reading.

const FIXTURES = [
  {
    name: 'the pending-deploy banner, 2 September 2026',
    shouldFlag: true,
    src: `tt("ui.pending.be.deploy.this.505b", "Pending BE deploy - this action activates once the backend endpoint ships. (Cancel & Refund)")`,
  },
  {
    name: 'a raw server message put in the error slot',
    shouldFlag: true,
    src: `setError(data.message);`,
  },
  {
    name: 'the same, from a caught error',
    shouldFlag: true,
    src: `setError(err.message || 'x');`,
  },
  {
    name: 'a plain sentence somebody can act on',
    shouldFlag: false,
    src: `tt('org.signInToJoin', 'Sign in to join')`,
  },
  {
    name: 'apiMessage, which is the fix',
    shouldFlag: false,
    src: `setError(apiMessage(tt, err, 'api.couldNotSave', 'That did not save.'));`,
  },
  {
    name: 'the word error, which is a normal English word',
    shouldFlag: false,
    src: `tt('x.y', 'Something went wrong. Try again in a moment.')`,
  },
];

const flagsIn = (text) => {
  let n = 0;
  for (const m of text.matchAll(/tt\(\s*["'][^"']*["']\s*,\s*(["'])((?:(?!\1)[\s\S]){4,300})\1/g)) {
    if (INSIDE.some((re) => re.test(m[2]))) n += 1;
  }
  for (const _m of text.matchAll(new RegExp(RAW_MESSAGE, 'g'))) n += 1;
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
  console.log(`${selfTestFailures} self-test(s) failed: fix the checker before`
    + ' trusting its count.');
}

for (const f of findings) {
  console.log(`${f.rel}:${f.line}`);
  console.log(`  ${f.kind}: ${f.detail}`);
  console.log(f.kind === 'raw server string'
    ? '  The API message is written for the log and is only ever in English.'
      + ' Use apiMessage(tt, err, key, fallback).'
    : '  A person cannot act on this. Say what happened and what they can do,'
      + ' through tt(), in all three languages.');
  console.log('');
}

console.log(`${findings.length} error(s) shown to a person that were written for an engineer`);
process.exit(findings.length + selfTestFailures ? 1 : 0);

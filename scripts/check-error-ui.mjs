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

// Fault 3: a native browser dialog.
//
// `window.confirm('Delete this draft? This cannot be undone.')` is the same
// family as the pending-deploy banner: it is a message with no interface. The
// browser draws it, so it carries none of the product's type, colour or
// spacing; the text cannot go through tt() in any useful way, so it is English
// for everybody; and it blocks the whole tab while it is up. On a phone it is
// a system sheet that looks like it came from somewhere else entirely.
//
// Confirm in place, with the product's own controls.
const NATIVE_DIALOG = /(?:^|[^.\w])(?:window\.)?(?:confirm|alert|prompt)\s*\(/;

// `.message` straight out of a response, put where a person will read it.
// Any `setSomething(...)`, not a list of six names I happened to think of.
// `setFeedback(err.message)` slipped straight through the list version, and
// the next person will invent a seventh name rather than read this file.
const RAW_MESSAGE = /set[A-Z]\w*\s*\(\s*(?:[\w.?]*(?:err|error|res|data|body|json|payload)[\w.?]*\.message)\b/;

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

  // Fault 3.
  for (const m of src.matchAll(new RegExp(NATIVE_DIALOG, 'g'))) {
    findings.push({
      rel,
      line: src.slice(0, m.index).split('\n').length,
      kind: 'native browser dialog',
      detail: src.slice(m.index, m.index + 60).split('\n')[0].trim(),
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
    name: 'a setter nobody thought to list',
    shouldFlag: true,
    src: `setFeedback(err.message);`,
  },
  {
    name: 'a native confirm, which has no interface at all',
    shouldFlag: true,
    src: `if (!window.confirm('Delete this draft? This cannot be undone.')) return;`,
  },
  {
    name: 'a method that merely ends in confirm',
    shouldFlag: false,
    src: `await api.confirmBooking(id);`,
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
  for (const _m of text.matchAll(new RegExp(NATIVE_DIALOG, 'g'))) n += 1;
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
// apiMessage is the fix every call site is pointed at, so what it does with a
// BROWSER failure decides whether any of them are safe. 27 call sites hand it
// a caught error, and a browser's own message carries no word this checker
// looks for: on 3 September the console showed the CEO "Failed to fetch"
// during a deploy. Run the real function against the real shapes.
{
  const src = fs.readFileSync(path.join('src', 'lib', 'apiMessage.js'), 'utf8')
    .replace(/^export const /mg, 'const ')
    .replace(/^export default.*/mg, '');
  // eslint-disable-next-line no-new-func
  const apiMessage = new Function(`${src}; return apiMessage;`)();
  const t = (key, english) => (key === 'api.TOO_LATE' ? 'Too late.' : english);
  class ApiError extends Error {
    constructor(message, opts = {}) {
      super(message);
      this.name = 'ApiError';
      this.code = opts.code;
      this.status = opts.status;
    }
  }
  const GENERIC = 'Could not load that.';
  const cases = [
    ['chrome', new TypeError('Failed to fetch'), GENERIC],
    ['firefox', new TypeError('NetworkError when attempting to fetch resource.'), GENERIC],
    ['safari', new TypeError('Load failed'), GENERIC],
    ['a parse error', new Error('Unexpected token < in JSON at position 0'), GENERIC],
    ['nothing at all', null, GENERIC],
    // And the two it must still let through, or the fix would have cost the
    // specific errors worth reading.
    ['a translated code', { status: 'error', code: 'TOO_LATE' }, 'Too late.'],
    ['the server, specific', { status: 'error', code: 'X', message: 'All 64 places have been taken' },
      'All 64 places have been taken'],
    ['an ApiError from a body', new ApiError('All 64 places have been taken', { code: 'FULL' }),
      'All 64 places have been taken'],
  ];
  for (const [name, input, expected] of cases) {
    const got = apiMessage(t, input, 'api.generic', GENERIC);
    if (got !== expected) {
      selfTestFailures += 1;
      console.log(`BAD  apiMessage: ${name} gave ${JSON.stringify(got)},`
        + ` expected ${JSON.stringify(expected)}`);
    } else if (process.argv.includes('--self-test')) {
      console.log(`ok   apiMessage: ${name}`);
    }
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
    : f.kind === 'native browser dialog'
      ? '  The browser draws this one, so it carries none of the product and'
        + ' cannot be translated. Confirm in place, with our own controls.'
      : '  A person cannot act on this. Say what happened and what they can do,'
        + ' through tt(), in all three languages.');
  console.log('');
}

console.log(`${findings.length} error(s) shown to a person that were written for an engineer`);
process.exit(findings.length + selfTestFailures ? 1 : 0);

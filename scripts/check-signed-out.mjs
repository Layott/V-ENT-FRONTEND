// Does any page decide who you are in a way that can be wrong when signed out?
//
// CEO, 2 September 2026: "Create rules for this please to apply automatically to
// the site and other new pages that maybe built."
//
// So this is the automatic part. Two faults, both invisible to the build, the
// linter and the type system, because both are valid JavaScript that happens to
// be false.
//
// ## Fault 1: comparing two identities that can both be absent
//
//     org?.owner?.username === session?.user?.username
//
// Signed out, `org.owner` is a string, so `.username` is `undefined`. And
// `session?.user?.username` is `undefined`. `undefined === undefined` is TRUE,
// so every organisation looked like the viewer's own and every card offered
// Manage to a stranger. That shipped, and a person found it.
//
// Optional chaining is what makes this likely rather than rare: `a?.b === c?.d`
// reads as careful while being exactly the shape of the bug.
//
// Use `sameUser(a, b)` from `lib/gating`, which is false unless both exist.
//
// ## Fault 2: branching on session DATA rather than session STATUS
//
//     const { data: session } = useSession();
//     if (!session) { ...treat as signed out... }
//
// `data` is null while NextAuth is still asking. Treating that as "signed out"
// makes the page flash from a member's view to a stranger's, which looks like a
// bug because it is one. Branch on `status`, or use `useViewer()`.
//
// ## Fault 3: a write control rendered live on a public page
//
// The organisations list rendered Join to a signed-out visitor. Pressing it
// answered "Authorization header with a Bearer token is required": a raw
// backend string, in English, after the person had already committed to the
// action. Faults 1 and 2 both reported zero on that page, because the identity
// comparison had already been fixed and the page did read `status`. The
// control was simply never guarded.
//
// So this looks for the thing itself: an onClick or onSubmit calling a handler
// that sends an Authorization header, with no sign of a signed-in guard
// anywhere near it in the JSX.
//
// A page the middleware gates whole is exempt, deliberately: the rule says a
// page-level redirect is the right gate when the entire page means "mine". The
// list is read out of src/middleware.js so it cannot drift from it.
//
//   node scripts/check-signed-out.mjs

import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(full);
  }
};
walk('src');

// `x?.a === y?.b` where BOTH sides are optional-chained. One side optional is
// fine: the other is then a definite value and cannot be undefined by accident.
const BOTH_OPTIONAL = /(\w[\w.?]*\?\.[\w.?]+)\s*===\s*(\w[\w.?]*\?\.[\w.?]+)/g;

// Reading session data without ever reading status, in a file that branches.
const USES_DATA = /useSession\(\)\s*;?[\s\S]{0,120}?\bdata\s*:/;
const READS_STATUS = /\bstatus\b\s*[,}]|status\s*===|useViewer\(/;


// --------------------------------------------------------------- fault 3

// The routes middleware gates whole, read from middleware itself.
const middleware = fs.readFileSync('src/middleware.js', 'utf8');
const GATED = [...middleware.matchAll(/"(\/[a-z0-9/-]+)"/g)].map((m) => m[1]);
// The console is gated by its own branch a few lines above `protectedRoutes`,
// because an admin proves the second factor at the ordinary sign-in and the
// console reads that session. It is a gated route all the same.
if (/path\.startsWith\('\/admin'\)/.test(middleware)) GATED.push('/admin');
const GATED_PATTERNS = [
  /^\/events\/[^/]+\/(edit|manage|attendees)/,
  /^\/tournaments\/[^/]+\/manage/,
];

/** The route a page file serves, route groups dropped and slugs normalised. */
const routeOf = (rel) => {
  const m = rel.match(/^src\/app\/(.*)\/(page|layout)\.jsx?$/);
  if (!m) return null;
  return '/' + m[1]
    .split('/')
    .filter((part) => !part.startsWith('('))
    .map((part) => (part.startsWith('[') ? 'slug' : part))
    .join('/');
};

const isGatedRoute = (route) => route !== null
  && (GATED.some((g) => route.startsWith(g))
      || GATED_PATTERNS.some((re) => re.test(route)));

// A component has no route of its own, so whether its controls need a guard
// depends entirely on where it is rendered. `settings-panels/PaymentsPanel`
// only ever appears on /settings, which middleware gates whole; a gallery that
// appears on a public profile does not have that cover.
//
// Without this the checker reported 62 things, 49 of which were components
// that can only be reached with an account. That is how a checker teaches
// people to skip it, so it resolves the graph instead of guessing.
const importsOf = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
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

/** Every file reachable from the public pages. */
const reachableFromPublic = new Set();
{
  const queue = [];
  for (const file of files) {
    const rel = file.split(path.sep).join('/');
    const route = routeOf(rel);
    if (route !== null && !isGatedRoute(route)) queue.push(file);
  }
  const seen = new Set();
  while (queue.length) {
    const next = queue.pop();
    const key = path.resolve(next);
    if (seen.has(key)) continue;
    seen.add(key);
    reachableFromPublic.add(key);
    for (const dep of importsOf(next)) queue.push(dep);
  }
}

/** Does this file's markup ever render where somebody can be signed out? */
const isGated = (file, route) => {
  if (route !== null) return isGatedRoute(route);
  return !reachableFromPublic.has(path.resolve(file));
};

// A handler that sends an Authorization header. That is what "a control a
// signed-out visitor cannot use" means, stated in the terms the code carries.
const authedHandlers = (src) => {
  const names = new Set();
  // The parameter list must not cross a line break. Greedy and unbounded, it
  // ran past the end of the line and swallowed the whole handler body up to
  // the next `)`, so the
  // body this then searched for an Authorization header began AFTER the
  // Authorization header. `const save = async () => {` still matched and
  // `const handleApply = async orgId => {` silently did not, which is how the
  // checker came to report zero on a page that was broken. The self-test
  // below is the only reason that was noticed.
  const re = /(?:const|function)\s+(\w+)\s*=?\s*(?:async\s*)?\(?[^)\n]*\)?\s*=?>?\s*\{/g;
  for (const m of [...src.matchAll(re)]) {
    // The body is what the opening brace encloses, counted. Two cheaper rules
    // were both wrong and both silent: a fixed window ran past the end of
    // `switchTab` into a neighbour that authenticates, so a tab strip was
    // reported as a write control; and "up to the next declaration" ended the
    // body at the `const res =` on the handler's own first line, so the
    // Authorization header two words later was never seen.
    const open = src.indexOf('{', m.index + m[0].length - 1);
    if (open === -1) continue;
    let depth = 0;
    let end = src.length;
    for (let k = open; k < src.length; k += 1) {
      if (src[k] === '{') depth += 1;
      else if (src[k] === '}') {
        depth -= 1;
        if (depth === 0) { end = k; break; }
      }
    }
    if (/Authorization:\s*`Bearer/.test(src.slice(open, end))) names.add(m[1]);
  }
  return names;
};

const GUARD = /viewer\.signedIn|\bsignedIn\b|status === 'authenticated'|status !== 'authenticated'|NeedsAccount|isAuthed|requireAccount/;

/**
 * Is this control inside `{someGuard && ...}`?
 *
 * Only `&&`, never a ternary. `cond && X` puts X on one side of the condition
 * and there is nowhere else for it to be. `cond ? A : B` has two branches, and
 * working out which one a control sits in - through nesting, through negation,
 * through a chain of four - is not worth the false negatives. The organisations
 * bug was exactly a ternary: `owned ? Manage : member ? Member : ... : Join`,
 * where three conditions sat above a control that none of them guarded.
 *
 * Three levels out, which covers a menu inside a panel inside a section. Deeper
 * than that and the guard is too far from the control to be read as one.
 */
const enclosedByGuard = (src, at) => {
  let cursor = at;
  for (let level = 0; level < 3; level += 1) {
    let depth = 0;
    let open = -1;
    for (let k = cursor - 1; k >= 0 && k > cursor - 6000; k -= 1) {
      const c = src[k];
      if (c === '}') depth += 1;
      else if (c === '{') {
        if (depth === 0) { open = k; break; }
        depth -= 1;
      }
    }
    if (open === -1) return false;
    // The condition is what sits between that brace and the first `&&` that is
    // not itself nested.
    const inner = src.slice(open + 1, at);
    let d = 0;
    let amp = -1;
    for (let k = 0; k < inner.length - 1; k += 1) {
      const c = inner[k];
      if (c === '{' || c === '(' || c === '[') d += 1;
      else if (c === '}' || c === ')' || c === ']') d -= 1;
      // The LAST top-level `&&`, not the first: `{openMenu === m.id &&
      // viewer.signedIn && <div>` is a chain, and every operand in it has to
      // hold for the markup to exist. Testing only up to the first one read
      // `openMenu === m.id` and called the block unguarded.
      else if (d === 0 && c === '&' && inner[k + 1] === '&') amp = k;
    }
    if (amp !== -1 && GUARD.test(inner.slice(0, amp))) return true;
    cursor = open;
  }
  return false;
};

let unguarded = 0;

let identity = 0;
let statusless = 0;
const report = [];

// Comments describe the fault as often as they contain it - this file and the
// fixes both quote the bad pattern in prose. A checker that reports its own
// documentation gets ignored, and an ignored checker is worse than none.
const stripComments = (src) => src
  .split('\n')
  .map((line) => {
    const at = line.indexOf('//');
    // Not a URL, and not inside a string. Crude, and right for source files
    // where the only `//` that matters here is a leading comment.
    if (at === -1) return line;
    if (at > 0 && line[at - 1] === ':') return line;
    return line.slice(0, at);
  })
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const rel = file.split(path.sep).join('/');

  // Skip the rule module and its checker; they talk about the pattern.
  if (rel.includes('lib/gating.js') || rel.includes('check-signed-out')) continue;

  const hits = [...src.matchAll(BOTH_OPTIONAL)];
  for (const m of hits) {
    // Only care when one side looks like the viewer and the other like a record.
    const pair = `${m[1]} === ${m[2]}`;
    if (!/session|viewer|user|me\b/i.test(pair)) continue;
    identity += 1;
    report.push(`${rel}\n  identity compared with both sides optional: ${pair.trim()}`);
  }

  if (/useSession\(/.test(src) && USES_DATA.test(src) && !READS_STATUS.test(src)) {
    statusless += 1;
    report.push(`${rel}\n  reads session data but never status: cannot tell "signed out" from "still asking"`);
  }

  // Fault 3: a write control a signed-out visitor can press.
  const route = routeOf(rel);
  if (!isGated(file, route)) {
    const handlers = authedHandlers(src);
    if (handlers.size) {
      for (const m of src.matchAll(/on(?:Click|Submit)=\{[^}]*?\b(\w+)\s*\(/g)) {
        if (!handlers.has(m[1])) continue;
        // The guard has to be ADJACENT to the control, not merely somewhere in
        // the file, and not merely somewhere in the same ternary chain. The
        // organisations page read `status` forty lines away and had `owned ?`
        // three branches up, and still offered Join to a stranger: a condition
        // guards its own branch and not the ones after it.
        //
        // Textually working out which branch of a nested ternary a control
        // sits in is not worth the false negatives, so the rule is proximity,
        // which is also a defensible standard on its own: a control that needs
        // an account says so where it is written, not forty lines away in a
        // derived boolean.
        const near = src.slice(Math.max(0, m.index - 220), m.index + 60);
        if (GUARD.test(near)) continue;
        if (enclosedByGuard(src, m.index)) continue;
        unguarded += 1;
        const line = src.slice(0, m.index).split('\n').length;
        report.push(`${rel}:${line}\n  a control calling ${m[1]}() sends an Authorization header and is`
          + ` rendered with no signed-in guard in view. Signed out this fails on`
          + ` press, after the person has already committed to it.`);
      }
    }
  }
}


// ---------------------------------------------------------------- self-test
//
// A checker that reports zero has two possible meanings and no way to tell
// them apart: the code is clean, or the checker is broken. Both of the shapes
// below were real, both shipped, and both are re-run against the live matcher
// on every invocation. If either stops being reported, this exits non-zero and
// says so rather than quietly passing everything for ever.
//
//   node scripts/check-signed-out.mjs --self-test    (prints the detail)

const FIXTURES = [
  {
    name: 'organisations Join, 2 September 2026',
    shouldFlag: true,
    src: `
  const handleApply = async orgId => {
    const res = await fetch(url, { headers: { Authorization: \`Bearer \${token}\` } });
  };
  const view = () => (
    <div>
      {owned ? <Link href={"/x"}>Manage</Link>
        : member ? <span>Member</span>
        : reqState === 'pending' ? <button type="button" disabled>Pending</button>
        : <button type="button" onClick={() => handleApply(orgId)}>Join</button>}
    </div>
  );`,
  },
  {
    name: 'the same control, guarded next to itself',
    shouldFlag: false,
    src: `
  const handleApply = async orgId => {
    const res = await fetch(url, { headers: { Authorization: \`Bearer \${token}\` } });
  };
  const view = () => (
    <div>
      {!viewer.signedIn ? <Link href={"/login"}>Sign in to join</Link>
        : <button type="button" onClick={() => handleApply(orgId)}>Join</button>}
    </div>
  );`,
  },
  {
    name: 'a tab strip beside a handler that does authenticate',
    shouldFlag: false,
    src: `
  const switchTab = (id) => {
    setActiveTab(id);
  };
  const save = async () => {
    await fetch(url, { headers: { Authorization: \`Bearer \${token}\` } });
  };
  const view = () => <button type="button" onClick={() => switchTab(t.id)}>Tab</button>;`,
  },
];

const flagsFound = (src) => {
  const handlers = authedHandlers(src);
  let n = 0;
  for (const m of src.matchAll(/on(?:Click|Submit)=\{[^}]*?\b(\w+)\s*\(/g)) {
    if (!handlers.has(m[1])) continue;
    const near = src.slice(Math.max(0, m.index - 220), m.index + 60);
    if (GUARD.test(near)) continue;
    if (enclosedByGuard(src, m.index)) continue;
    n += 1;
  }
  return n;
};

let selfTestFailures = 0;
for (const f of FIXTURES) {
  const found = flagsFound(f.src) > 0;
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
    + ' longer see a fault it was built for. Fix the checker before trusting'
    + ' its count.');
}

for (const line of report) console.log(line);
console.log('');
console.log(`${identity} identity comparison(s) that can be true when signed out`);
console.log(`${statusless} file(s) branching on session data without status`);
console.log(`${unguarded} write control(s) rendered live on a public page`);
console.log(`${identity + statusless + unguarded} live write controls at risk`);

process.exit(identity + statusless + unguarded + selfTestFailures ? 1 : 0);

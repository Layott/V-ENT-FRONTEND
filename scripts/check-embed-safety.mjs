#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Nothing inside a frame on somebody else's website asks for a password, a
 * card or a session, and every embed is drawn through EmbedFrame (P8).
 *
 * CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
 * or put tournament registrations and brackets system under their own website
 * from v-ent." Design 14c, the rules that hold at every level: "money is always
 * taken on V-ENT's own checkout ... never in fields on somebody else's page;
 * signing in uses Sign in with V-ENT in a pop-up, never a password typed into a
 * third-party frame; no token travels in an address."
 *
 * A frame is the one place on V-ENT where the page around it belongs to
 * somebody else, so a field there is a field a stranger's page can overlay,
 * read the shape of, or imitate. Read from src/app/embed and
 * src/components/embed, each file:
 *
 *   1. no password input, no card field (cc-*, card number, CVV), no <form>
 *   2. no session read (useSession, useViewer, getSession, an Authorization
 *      header): a frame on another site has no session of its own to use
 *   3. no token, session or access_token in an address
 *   4. every page under src/app/embed renders a component that draws an
 *      EmbedFrame, which is what sizes it, paints it, counts it and opens
 *      V-ENT links outside the frame
 *
 * Comments are not code. The shared components a widget draws (the bracket,
 * the standings) are not read here; they are public, take token={null} from
 * the widget, and the signed-out catcher holds them.
 *
 * Usage: node scripts/check-embed-safety.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DIRS = ['src/app/embed', 'src/components/embed'];

const RULES = [
  [/type\s*=\s*\{?\s*["'`]password["'`]/, 'a password field inside a frame; signing in happens on V-ENT in a pop-up'],
  [/autoComplete\s*=\s*\{?\s*["'`]cc-|autocomplete\s*=\s*["']cc-|\b(?:cardNumber|card_number|cvv|cvc)\b/i,
    'a card field inside a frame; money is taken on V-ENT\'s own checkout'],
  [/<form\b/, 'a form inside a frame; what a frame offers opens on V-ENT'],
  [/\b(?:useSession|useViewer|getSession)\s*\(|Authorization['"]?\s*:/, 'a session read inside a frame; a frame on another site has no session to use'],
  [/[?&](?:token|session|access_token)=/, 'a token in an address'],
];

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Problems in one embed file, given its path relative to the repo root. */
export function scan(rel, source) {
  const code = withoutComments(source);
  return RULES.filter(([pattern]) => pattern.test(code)).map(([, why]) => `${rel}: ${why}`);
}

/**
 * Problems with one page: it must import a component from components/embed
 * that draws an EmbedFrame. `read(rel)` gives a component's source or null.
 */
export function scanPage(rel, source, read) {
  const code = withoutComments(source);
  const imports = [...code.matchAll(/from\s+['"]@\/components\/embed\/([A-Za-z0-9_-]+)['"]/g)].map((m) => m[1]);
  const framed = imports.some((name) => /<EmbedFrame\b/.test(withoutComments(read(`src/components/embed/${name}.js`) || '')));
  return framed ? [] : [`${rel}: an embed page that draws no EmbedFrame; it would not size, count or keep V-ENT links out of the frame`];
}

function files(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

const relOf = (full) => path.relative(ROOT, full).split(path.sep).join('/');
const readRel = (rel) => {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
};

function selfTest() {
  const one = (rel, source) => scan(rel, source).length;
  const cases = [
    ['caught: a password field', () => one('src/components/embed/A.js', '<input type="password" />'), 1],
    ['caught: a password field in braces', () => one('src/components/embed/A.js', "<input type={'password'} />"), 1],
    ['caught: a card number', () => one('src/components/embed/A.js', '<input autoComplete="cc-number" />'), 1],
    ['caught: a CVV state', () => one('src/components/embed/A.js', 'const [cvv, setCvv] = useState("");'), 1],
    ['caught: a form', () => one('src/components/embed/A.js', '<form onSubmit={go}>'), 1],
    ['caught: a session read', () => one('src/components/embed/A.js', 'const { data } = useSession();'), 1],
    ['caught: a bearer header', () => one('src/components/embed/A.js', "headers: { Authorization: `Bearer ${t}` }"), 1],
    ['caught: a token in an address', () => one('src/app/embed/x/page.js', 'fetch(`${API}/x/?token=${t}`)'), 1],
    ['left alone: a comment about a password', () => one('src/components/embed/A.js',
      '// never a password field here\n/* no <form> either */\nconst a = 1;'), 0],
    ['left alone: a register link', () => one('src/components/embed/A.js',
      '<a href={`${page}/register`} target="_blank" rel="noopener">Register</a>'), 0],
    ['left alone: an https address', () => one('src/components/embed/A.js', "const u = 'https://v-ent.co/embed.js';"), 0],
    ['caught: a page with no frame', () => scanPage('src/app/embed/x/page.js',
      "import Bare from '@/components/embed/Bare';", () => 'export default function Bare() { return <main />; }').length, 1],
    ['left alone: a page through EmbedFrame', () => scanPage('src/app/embed/x/page.js',
      "import Good from '@/components/embed/Good';", () => '<EmbedFrame look={look}>x</EmbedFrame>').length, 0],
    ['caught: a frame only in a comment', () => scanPage('src/app/embed/x/page.js',
      "import Odd from '@/components/embed/Odd';", () => '// <EmbedFrame> one day\nreturn <main />;').length, 1],
  ];
  let failed = 0;
  for (const [name, run, expected] of cases) {
    const got = run();
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${got} of ${expected})`);
  }
  console.log(failed ? `self-test: ${failed} failed` : 'self-test passed');
  if (failed) process.exit(1);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const all = DIRS.flatMap((d) => files(path.join(ROOT, d)));
  const problems = all.flatMap((full) => scan(relOf(full), fs.readFileSync(full, 'utf8')));
  const pages = all.filter((full) => relOf(full).startsWith('src/app/embed/') && /\/page\.js$/.test(relOf(full)));
  for (const full of pages) problems.push(...scanPage(relOf(full), fs.readFileSync(full, 'utf8'), readRel));
  console.log(`embed safety: ${all.length} file(s) read, ${pages.length} page(s), ${problems.length} problem(s)`);
  if (problems.length) {
    for (const p of problems) console.log(`  ${p}`);
    process.exit(1);
  }
}

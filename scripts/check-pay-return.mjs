// Every page reads a payment's return through src/lib/payReturn.js.
//
// Coming back from Paystack or Flutterwave, the reference is in the address
// under one of three names (`reference`, `trxref`, Flutterwave's `tx_ref`) and
// Flutterwave adds `status` and `transaction_id`. On 13 October 2026 seven
// places read those names by hand in three different sets and removed them in
// two: the root layout's verify took `reference` out and left `tx_ref` and
// `status` behind, and took the reference from under the tournament
// registration before it loaded, so a paid card trip came back to the wrong
// step with nothing on the page confirming the payment.
//
// Two rules:
//   1. No file but payReturn.js reads, tests or removes a return parameter by
//      hand (`.get('reference')`, `.delete('tx_ref')`, ...). Comments are
//      ignored: a sentence about `?reference=` is not a reader.
//   2. A page that reads a return confirms it itself, so the layout's verify
//      must leave it alone: its route is in OWN_RETURN_PAGES, or it is named
//      in SHARED below with the reason both may verify.
//
//   node scripts/check-pay-return.mjs              exit 1 on either
//   node scripts/check-pay-return.mjs --self-test  proves it on fixtures
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELPER = 'src/lib/payReturn.js';
const NAMES = ['reference', 'trxref', 'tx_ref', 'transaction_id'];

//: Pages that read a return and are deliberately NOT left to themselves.
const SHARED = {
  'src/app/wallets/page.js':
    'verifies a top-up and refreshes; the layout verifies the same reference and is the one that '
    + 'says what happened. The server counts a reference once, so the second asks and is told it '
    + 'was already counted',
};

//: The source with every comment blanked out, line count kept.
export function withoutComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

const READER = new RegExp(`\\.(get|has|delete|getAll)\\(\\s*['"\`](${NAMES.join('|')})['"\`]\\s*\\)`, 'g');

//: Every hand-read of a return parameter in one file: [{line, text}].
export function handReads(src) {
  const out = [];
  const lines = withoutComments(src).split('\n');
  lines.forEach((line, i) => {
    READER.lastIndex = 0;
    if (READER.test(line)) out.push({ line: i + 1, text: src.split('\n')[i].trim().slice(0, 120) });
  });
  return out;
}

//: The address a page file answers at, with a sample value for each [param].
export function routeOf(file) {
  const rel = file.replace(/\\/g, '/').replace(/^src\/app/, '').replace(/\/page\.js$/, '');
  const parts = rel.split('/').filter((p) => p && !/^\(.*\)$/.test(p))
    .map((p) => (/^\[.*\]$/.test(p) ? 'sample' : p));
  return `/${parts.join('/')}`;
}

const readsReturn = (src) => /from\s+['"]@\/lib\/payReturn['"]/.test(src)
  && /\breturnReference(Here)?\s*\(/.test(withoutComments(src));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
      walk(full, out);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export function check(files, confirmsItsOwnReturn) {
  const reads = [];
  const unowned = [];
  for (const [rel, src] of files) {
    if (rel === HELPER) continue;
    for (const hit of handReads(src)) reads.push({ file: rel, ...hit });
    if (/^src\/app\/.*page\.js$/.test(rel) && readsReturn(src)
        && !confirmsItsOwnReturn(routeOf(rel)) && !SHARED[rel]) {
      unowned.push({ file: rel, route: routeOf(rel) });
    }
  }
  return { reads, unowned };
}

async function loadHelper() {
  const mod = await import(pathToFileURL(path.join(ROOT, HELPER)).href);
  // Read the owning module and say what it holds: a list that came back empty
  // would pass rule 2 for nobody and fail it for everybody, both silently.
  if (!Array.isArray(mod.OWN_RETURN_PAGES) || mod.OWN_RETURN_PAGES.length < 4) {
    throw new Error(`${HELPER}: OWN_RETURN_PAGES holds ${mod.OWN_RETURN_PAGES?.length ?? 'nothing'}, expected 4 or more`);
  }
  return mod;
}

async function selfTest() {
  const { confirmsItsOwnReturn } = await loadHelper();
  const cases = [];
  const expect = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });

  expect('Paystack pair read by hand', handReads("const r = params.get('reference') || params.get('trxref');").length, 1);
  expect('Flutterwave name removed by hand', handReads('url.searchParams.delete("tx_ref");').length, 1);
  expect('transaction id read by hand', handReads('const t = q.get(`transaction_id`);').length, 1);
  expect('the helper is not a hand-read', handReads('const r = returnReference(params);').length, 0);
  expect('a comment naming the parameter', handReads("// Paystack sends params.get('reference') here").length, 0);
  expect('a block comment naming it', handReads("/* url.searchParams.delete('trxref') */ const a = 1;").length, 0);
  expect('a body carrying the reference', handReads('body: JSON.stringify({ reference })').length, 0);
  expect('an unrelated parameter', handReads("const s = params.get('status');").length, 0);
  expect('a URL with // is not a comment', handReads("fetch('https://x.test/a'); p.get('reference')").length, 1);

  expect('route of a slug page', routeOf('src/app/tournaments/[slug]/register/page.js'), '/tournaments/sample/register');
  expect('route drops a group', routeOf('src/app/(admin)/admin/finance/page.js'), '/admin/finance');
  expect('registration confirms its own', confirmsItsOwnReturn('/fr/tournaments/walk-ticket-cup/register'), true);
  expect('old registration address too', confirmsItsOwnReturn('/tournaments/register-tournament'), true);
  expect('ticket confirmation confirms its own', confirmsItsOwnReturn('/events/ticket-confirmed'), true);
  expect('an event page does not', confirmsItsOwnReturn('/events/walk-con-5e6c'), false);
  expect('a register-ish name is not the route', confirmsItsOwnReturn('/tournaments/registered-players'), false);

  const page = "import { returnReference } from '@/lib/payReturn';\nconst r = returnReference(p);";
  expect('a page reading a return on an unowned route',
    check([['src/app/shop/checkout/page.js', page]], confirmsItsOwnReturn).unowned.length, 1);
  expect('the same page on an owned route',
    check([['src/app/events/ticket-confirmed/page.js', page]], confirmsItsOwnReturn).unowned.length, 0);
  expect('a shared page named with its reason',
    check([['src/app/wallets/page.js', page]], confirmsItsOwnReturn).unowned.length, 0);
  expect('a component is not a page',
    check([['src/components/pay/PayShortfall.js', page]], confirmsItsOwnReturn).unowned.length, 0);
  expect('the helper itself is exempt',
    check([[HELPER, "p.get('reference')"]], confirmsItsOwnReturn).reads.length, 0);

  const bad = cases.filter((c) => !c.ok);
  for (const c of bad) console.log(`FAIL ${c.name}: got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`);
  console.log(`pay return self-test: ${cases.length - bad.length}/${cases.length} passed`);
  process.exit(bad.length ? 1 : 0);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const { confirmsItsOwnReturn } = await loadHelper();
  const files = walk(path.join(ROOT, 'src')).map((full) => [
    path.relative(ROOT, full).replace(/\\/g, '/'),
    fs.readFileSync(full, 'utf8'),
  ]);
  const { reads, unowned } = check(files, confirmsItsOwnReturn);
  for (const r of reads) console.log(`${r.file}:${r.line}  reads a return by hand: ${r.text}`);
  for (const u of unowned) {
    console.log(`${u.file}  reads a return at ${u.route}, which the layout's verify also takes: `
      + `add the route to OWN_RETURN_PAGES in ${HELPER}, or name it in SHARED with the reason`);
  }
  console.log(`pay return: ${reads.length} hand read(s), ${unowned.length} page(s) racing the layout `
    + `(${files.length} files, ${Object.keys(SHARED).length} shared by design)`);
  process.exit(reads.length || unowned.length ? 1 : 0);
}

// Run only when called, so the walk tools can import the rules.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * A page that can show "Loading..." for ever.
 *
 * Fourth occurrence of one fault, so it gets a checker. The standing rule:
 * "the second time a class of fault is found, the fix is not finished until a
 * check exists that would have caught it."
 *
 *   August: three admin pages used a bare `await fetch` with no catch, so any
 *           network failure threw, `setLoading(false)` never ran, and the page
 *           spun for ever.
 *   9 September: /admin/settings caught the exception and raised a TOAST. The
 *           toast disappears after a few seconds; `settings` stays null and
 *           `loading` goes false, so the page renders its loading state with
 *           nothing on screen saying why. Worse than the first version,
 *           because it looks handled.
 *
 * What it looks for: a file that FETCHES, shows a LOADING state, and has no
 * error the render can show. All three together are the fault. Any one of them
 * alone is ordinary code.
 *
 *   node scripts/check-spinner-forever.mjs
 *   node scripts/check-spinner-forever.mjs --self-test
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Does this file load something asynchronously? */
const fetches = (src) => /await fetch\(|\bventFetch\(/.test(src);

/**
 * Does it render a loading state a person would sit in front of?
 *
 * Page-level only. Two shapes look like one and are not, and the first
 * version of this checker counted both, which is how 15 of its 42 findings
 * on 12 September were files with no fault in them:
 *
 *   1. A BUTTON spinner. `{loading ? <CircularProgress/> : 'Sign in'}` gates
 *      one control while a request is in flight. The form stays on screen
 *      with its own errors; nobody is stranded.
 *   2. A Suspense FALLBACK. `<Suspense fallback={<p>Loading…</p>}>` is what
 *      React draws until a client component mounts, not a fetch, and it
 *      resolves whether or not the API answers.
 */
// Case matters on the second one: `Loading…` is copy on screen, while
// `ui.loading.challenge` is a dictionary key and matches nothing a person sees.
const LOADING_LINE = {
  test: (line) => /loading\s*(&&|\?)/i.test(line)
    || /\bLoading[.…]/.test(line)
    || /Skeleton|skeletonRow/.test(line),
};
const BUTTON_LINE = /CircularProgress|<button|\bbtn\b|Btn\b|disabled=/i;
const FALLBACK_OPEN = /<Suspense|fallback=/;

const pageLoadingLines = (src) => {
  const lines = src.split('\n');
  const out = [];
  lines.forEach((line, i) => {
    if (!LOADING_LINE.test(line)) return;
    if (BUTTON_LINE.test(line)) return;
    // A value being worked out, not a state being drawn:
    // `const decided = !viewer.loading && ...`.
    if (/^\s*(const|let|var)\s/.test(line)) return;
    // Inside a fallback: the attribute opened on this line or one of the
    // twelve above it, which is as far as a `fallback={<p style={{...}}>`
    // with a multi-line style object runs in this codebase (ten lines on
    // the wallet pages).
    for (let k = Math.max(0, i - 12); k <= i; k += 1) {
      if (FALLBACK_OPEN.test(lines[k])) return;
    }
    out.push(i + 1);
  });
  return out;
};

const showsLoading = (src) => pageLoadingLines(src).length > 0;

/**
 * Is there an error the RENDER can show?
 *
 * A toast does not count, deliberately: it is gone in four seconds and the
 * page behind it is still blank. Neither does a bare `console.error`.
 */
const showsError = (src) => (
  /\{\s*(error|problem|loadError|failed|err)\b[^}]{0,40}&&/i.test(src)
  || /errorText|inlineError|inlineErrorCard|styles\.problem|styles\.error\b/.test(src)
  || /\bErrorState\b|<ErrorCard/.test(src)
  // An early return is the commonest shape in this codebase, and the first
  // version of this checker missed every one of them: it reported 47 files
  // where the real number was far smaller. `if (error) return <p>{error}</p>;`
  || /if\s*\(\s*(error|problem|loadError)\b[^)]*\)\s*return\s*[(<]/i.test(src)
  // And the ternary: `{error ? <div>{error}</div> : null}`. Same thing on
  // screen as `{error && ...}`, and the first version missed it too.
  || /\{\s*(error|problem|loadError)\s*\?/i.test(src)
  // And in the middle of a chain: `{!loading && error && <p>{error}</p>}`.
  // The first shape above needs the error to open the brace, and this one
  // was reported as having no error branch while drawing it on line 265.
  || /&&\s*(error|problem|loadError)\b[^}]{0,40}&&/i.test(src)
);

/**
 * Files that legitimately have no error branch.
 *
 * Each one is a real read, not a guess, and each says why. A checker whose
 * exception list is a shrug is a checker that hides the next instance.
 */
const ALLOWED = new Map([
  // Renders nothing at all when it has nothing: no surface to put an error on,
  // and the page around it is not blocked by it.
  ['src/components/vendor-orders/VendorOrders.js', 'draws nothing when empty; the page behind it is complete'],
]);

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(js|jsx)$/.test(name)) out.push(path);
  }
  return out;
};

function selfTest() {
  const cases = [
    {
      name: 'the real fault: fetches, shows loading, no error on screen',
      src: `const [loading, setLoading] = useState(true);
            try { const r = await fetch(url); } catch { toast.push('failed'); }
            return loading ? <p>Loading…</p> : <Grid />;`,
      expect: true,
    },
    {
      name: 'a toast is not an error state',
      src: `await fetch(url); setLoading(false);
            catch { toast.push(tt('msg.failed', 'Failed')); }
            {loading && <p>Loading…</p>}`,
      expect: true,
    },
    {
      name: 'an inline error the render shows is fine',
      src: `const [error, setError] = useState('');
            try { await fetch(url); } catch { setError('no'); }
            {error && <p className={shared.errorText}>{error}</p>}
            {loading ? <p>Loading…</p> : <Grid />}`,
      expect: false,
    },
    {
      name: 'styles.problem counts too',
      src: `await fetch(url);
            {problem && <p className={styles.problem}>{problem}</p>}
            {loading && <p>Loading…</p>}`,
      expect: false,
    },
    {
      name: 'an early return showing the error, which is the commonest shape here',
      src: `try { await fetch(url); } catch { setError('no'); }
            if (error) return <p className={styles.state}>{error}</p>;
            if (loading) return <p>Loading…</p>;`,
      expect: false,
    },
    {
      name: 'a ternary showing the error counts as well',
      src: `try { await fetch(url); } catch { setError('no'); }
            {error ? <div className={styles.notice}>{error}</div> : null}
            {loading && <p>Loading…</p>}`,
      expect: false,
    },
    {
      name: 'a button spinner gates one control, not the page',
      src: `const [loading, setLoading] = useState(false);
            try { await fetch(url); } catch { setSnackbar('failed'); } finally { setLoading(false); }
            <button type="submit" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : tt('ui.signIn', 'Sign in')}
            </button>`,
      expect: false,
    },
    {
      name: 'a Suspense fallback is React waiting for a component, not a fetch',
      src: `await fetch(url);
            const Page = () => <Suspense fallback={<p style={{
              padding: '2rem'
            }}>{tt('ui.loading', 'Loading…')}</p>}>
              <Inner />
            </Suspense>;`,
      expect: false,
    },
    {
      name: 'a page-level loading line beside a button spinner still counts',
      src: `try { await fetch(url); } catch { toast.push('failed'); }
            if (loading) return <p>Loading…</p>;
            <button disabled={saving}>{saving ? <CircularProgress /> : 'Save'}</button>`,
      expect: true,
    },
    {
      name: 'an error in the middle of a chain is still an error on screen',
      src: `try { await fetch(url); } catch (err) { setError(apiMessage(tt, err, 'k', 'f')); }
            {loading && <p>Loading…</p>}
            {!loading && error && <p className={shared.cardSub}>{error}</p>}`,
      expect: false,
    },
    {
      name: 'no fetch is not this fault',
      src: `const [loading] = useState(true); return loading ? <p>Loading…</p> : <X />;`,
      expect: false,
    },
    {
      name: 'a fetch with no loading state cannot strand anybody',
      src: `await fetch(url).then(r => r.json());`,
      expect: false,
    },
  ];

  let failures = 0;
  for (const one of cases) {
    const hit = fetches(one.src) && showsLoading(one.src) && !showsError(one.src);
    const ok = hit === one.expect;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}: ${one.name}`);
  }
  console.log(failures === 0
    ? `${cases.length} self-test case(s) pass`
    : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

const offenders = [];
let checked = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (ALLOWED.has(rel)) continue;
  const src = readFileSync(file, 'utf8');
  if (!fetches(src) || !showsLoading(src)) continue;
  checked += 1;
  if (!showsError(src)) offenders.push(rel);
}

console.log(`files that fetch and show a loading state: ${checked}`);
if (offenders.length) {
  console.log(`\nCAN SPIN FOR EVER (${offenders.length}):`);
  for (const o of offenders) console.log(`  ${o}`);
  console.log('\nA failed load must say so on the page. A toast is gone in four');
  console.log('seconds and leaves the loading state behind it.');
  // LAST, because check-all reads the last line and the debt ledger takes the
  // number out of it. The endpoint checker recorded a friendly sentence
  // instead of its count for exactly this reason.
  console.log(`${checked} file(s) checked, ${offenders.length} that can spin for ever`);
  process.exit(1);
}
console.log(`${checked} file(s) checked, 0 that can spin for ever`);

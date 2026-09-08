// Every picture on a page, graded by whether a person would actually see it.
//
// Why this exists, and why it refuses to run in a hidden tab
// ----------------------------------------------------------
// Row 185 sat open for weeks on "the file serves 200 as a real PNG but the
// browser still reports naturalWidth 0". It was measured in a Claude-in-Chrome
// tab that was not the focused one. Chrome does not run the lazy-load
// intersection pass for a tab that is not painting, and next/image sets
// loading="lazy" by default, so EVERY image on the page reads naturalWidth 0
// there, including the site's own bundled logo out of /_next/static. Two
// separate sessions chased that reading as if it were a bug.
//
// So the first thing this does is assert `document.hidden === false`. If the
// tab is hidden it exits 2 and reports NOTHING, because a clean run and a
// blind run would otherwise look identical, and a checker whose 0 has two
// meanings is worse than no checker.
//
// The four states, which are four different bugs
// ----------------------------------------------
//   DRAWN            naturalWidth > 2. A person sees it.
//   PLACEHOLDER_1PX  naturalWidth 1 or 2. Decodes perfectly, serves 200, and
//                    draws as nothing. `media/event_banners/t.png` on the
//                    seeded Lagos Anime Con event is a real 1x1, 67 bytes, and
//                    216 of the 217 files in `media/org_logos/` are the same
//                    file left behind by test runs. This is the state that
//                    makes a page look broken while every other check passes.
//   FAILED_DECODE    complete, and naturalWidth 0. The fetch happened and there
//                    was nothing to draw: a 404, or bytes that are not an
//                    image. A crest whose file is not on the box does this, and
//                    Chrome draws its torn-picture glyph with the alt text
//                    spilling out of the circle.
//   NO_SRC           an <img> with no src attribute at all. React drops a null
//                    src, and the browser then resolves the empty URL against
//                    the current document and refetches the PAGE as an image.
//   NEVER_STARTED    not complete. Inconclusive rather than a failure: it may
//                    simply be below the fold, or display:none, so it is
//                    counted and named but does not fail the run.
//
// Usage
// -----
//   node scripts/check-images-drawn.mjs --url /rankings
//   node scripts/check-images-drawn.mjs --url /rankings --endpoint http://localhost:9222
//   node scripts/check-images-drawn.mjs --self-test
//
// The endpoint is a Chrome DevTools port. For the Android emulator, which is
// where a mobile claim has to be proved on this project:
//   adb forward tcp:9222 localabstract:chrome_devtools_remote
// A tab on a real device is genuinely visible, which is the other reason to
// prefer it over a headless desktop tab.

const FAILING = new Set(['PLACEHOLDER_1PX', 'FAILED_DECODE', 'NO_SRC']);

/** How an image ACTUALLY ended up, from the three properties that separate the
 *  cases. Pure, so the self-test can prove every branch without a browser. */
export function gradeImage({ srcAttribute, naturalWidth, complete }) {
  if (!srcAttribute) return 'NO_SRC';
  if (naturalWidth > 2) return 'DRAWN';
  if (naturalWidth > 0) return 'PLACEHOLDER_1PX';
  return complete ? 'FAILED_DECODE' : 'NEVER_STARTED';
}

// ---------------------------------------------------------------------------
// Self-test. Every fixture is a shape this codebase has actually produced.
// ---------------------------------------------------------------------------

const CASES = [
  ['a real organisation crest',
    { srcAttribute: '/media/org_logos/walk-logo.png', naturalWidth: 400, complete: true },
    'DRAWN'],
  ['a profile picture seeded at 100px',
    { srcAttribute: '/media/profile_pictures/demo.png', naturalWidth: 100, complete: true },
    'DRAWN'],
  ['the 1x1 seeded event banner, which serves 200 and draws nothing',
    { srcAttribute: '/media/event_banners/t.png', naturalWidth: 1, complete: true },
    'PLACEHOLDER_1PX'],
  ['a crest whose file is not on the box, the row 204 fault',
    { srcAttribute: '/media/org_logos/this-file-does-not-exist.png', naturalWidth: 0, complete: true },
    'FAILED_DECODE'],
  ['a null src that React dropped, the banner-fallback fault',
    { srcAttribute: '', naturalWidth: 0, complete: true },
    'NO_SRC'],
  ['a lazy image below the fold, which is NOT a fault',
    { srcAttribute: '/media/profile_pictures/demo.png', naturalWidth: 0, complete: false },
    'NEVER_STARTED'],
  ['the display:none mobile header logo, which is NOT a fault',
    { srcAttribute: '/_next/static/media/logo_mark_red.7c453deb.svg', naturalWidth: 0, complete: false },
    'NEVER_STARTED'],
  ['every image in a hidden tab reads like this, which is why the tab is asserted first',
    { srcAttribute: '/_next/static/media/logo_mark_red.7c453deb.svg', naturalWidth: 0, complete: false },
    'NEVER_STARTED'],
];

function selfTest() {
  let bad = 0;
  for (const [name, input, expected] of CASES) {
    const got = gradeImage(input);
    const ok = got === expected;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${got.padEnd(15)} ${name}`);
  }
  // The half that matters as much as the grading: which grades stop a build.
  const shouldFail = ['PLACEHOLDER_1PX', 'FAILED_DECODE', 'NO_SRC'];
  const shouldPass = ['DRAWN', 'NEVER_STARTED'];
  for (const g of shouldFail) {
    if (!FAILING.has(g)) { console.log(`FAIL  ${g} must fail the run`); bad += 1; }
  }
  for (const g of shouldPass) {
    if (FAILING.has(g)) { console.log(`FAIL  ${g} must NOT fail the run`); bad += 1; }
  }
  console.log(bad === 0
    ? `\nself-test: ${CASES.length} cases, all grades correct, both ways`
    : `\nself-test: ${bad} wrong`);
  return bad === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The browser half.
// ---------------------------------------------------------------------------

async function cdp(endpoint, urlMatch) {
  const targets = await fetch(`${endpoint}/json`).then((r) => r.json());
  const target = targets.find((t) => t.type === 'page' && (t.url || '').includes(urlMatch));
  if (!target) {
    console.log(`no open page whose URL contains "${urlMatch}" at ${endpoint}`);
    console.log(targets.filter((t) => t.type === 'page').map((t) => t.url).join('\n'));
    process.exit(1);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    const resolve = waiting.get(msg.id);
    if (resolve) { waiting.delete(msg.id); resolve(msg); }
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  // A backgrounded tab throttles its timers hard enough that Runtime.evaluate
  // simply never answers. Without this the checker HANGS on exactly the case it
  // exists to refuse, which is worse than a wrong answer because nobody waits
  // long enough to find out. A tab that will not answer cannot be measured, and
  // that is reported as such.
  const evaluate = (expression, ms = 20000) => Promise.race([
    new Promise((resolve) => {
      const n = ++id;
      waiting.set(n, (msg) => resolve(msg.result?.result?.value));
      ws.send(JSON.stringify({
        id: n, method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true },
      }));
    }),
    new Promise((resolve) => setTimeout(() => resolve('__TIMED_OUT__'), ms)),
  ]);

  return { url: target.url, evaluate, close: () => ws.close() };
}

async function run(urlMatch, endpoint) {
  const page = await cdp(endpoint, urlMatch);
  console.log('page:', page.url);

  const visibility = await page.evaluate(
    '({hidden: document.hidden, hasFocus: document.hasFocus(),'
    + ' visibilityState: document.visibilityState, w: innerWidth})');
  console.log('visibility:', JSON.stringify(visibility));

  if (visibility === '__TIMED_OUT__') {
    console.log('\nREFUSING TO REPORT. The tab did not answer within 20s, which is what');
    console.log('a backgrounded tab does: its timers are throttled hard enough that the');
    console.log('page never runs the script. Bring it to the front and run this again.');
    page.close();
    return 2;
  }

  if (visibility.hidden !== false) {
    console.log('\nREFUSING TO REPORT. The tab is hidden, so Chrome never runs the');
    console.log('lazy-load pass and every loading="lazy" image reads naturalWidth 0');
    console.log('whatever its real state. Focus the tab, or measure on the Android');
    console.log('emulator over adb forward tcp:9222, and run this again.');
    page.close();
    return 2;
  }

  // Walk the page so images below the fold are asked for, otherwise a real
  // failure hides in the NEVER_STARTED bucket.
  await page.evaluate(`(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 1200));
    return true;
  })()`);

  const found = await page.evaluate(`[...document.images].map(i => ({
    srcAttribute: i.getAttribute('src') || '',
    file: (i.getAttribute('src') || '').split('/').slice(-2).join('/'),
    naturalWidth: i.naturalWidth,
    complete: i.complete,
    alt: i.alt,
    cssW: Math.round(i.getBoundingClientRect().width)
  }))`);
  page.close();

  const graded = found.map((i) => ({ ...i, grade: gradeImage(i) }));
  const count = (g) => graded.filter((i) => i.grade === g).length;

  console.log(`\n${graded.length} images: ${count('DRAWN')} drawn, `
    + `${count('FAILED_DECODE')} failed to decode, `
    + `${count('PLACEHOLDER_1PX')} one-pixel placeholders, `
    + `${count('NO_SRC')} with no src, `
    + `${count('NEVER_STARTED')} not started (below the fold or hidden)`);

  const problems = graded.filter((i) => FAILING.has(i.grade));
  for (const p of problems) {
    console.log(`  ${p.grade.padEnd(15)} ${p.file || '(no src)'}  `
      + `alt="${p.alt}"  drawn at ${p.cssW}px`);
  }

  if (problems.length) {
    console.log(`\n${problems.length} picture(s) a person cannot see.`);
    return 1;
  }
  console.log('\n0 pictures a person cannot see.');
  return 0;
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

if (args.includes('--self-test')) {
  process.exit(selfTest());
} else {
  const urlMatch = flag('--url', null);
  if (!urlMatch) {
    console.log('usage: node scripts/check-images-drawn.mjs --url <part of the URL>');
    console.log('       node scripts/check-images-drawn.mjs --self-test');
    process.exit(1);
  }
  process.exit(await run(urlMatch, flag('--endpoint', 'http://localhost:9222')));
}

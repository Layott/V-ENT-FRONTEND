// A page nobody can find, and nothing can read.
//
// The rule (V-ENT/CLAUDE.md): a feature is not built until it can be found.
// Every public route ships a real title and description, a canonical URL, an
// Open Graph card, hreflang, and a place in the sitemap or the robots disallow
// list. And it is SERVER-rendered, because almost every page here is
// 'use client' and loads in an effect, so anything the client adds is
// invisible to a crawler and to a link preview.
//
// That last part is why this check exists rather than a reading of the rule. A
// page can look completely finished, have a perfect title in the browser tab,
// and still serve HTML with nothing in the head. The failure is invisible from
// the inside.
//
//   node scripts/check-seo.mjs
//
// What it checks, per public route:
//
//   * metadata exists at all, and is not the site-wide default
//   * a detail route (one with a [param]) builds it from the RECORD, via
//     generateMetadata, rather than a constant that says the same thing for
//     every record
//   * the route is named in sitemap.js, or disallowed in robots.js
//
// It cannot judge whether a description is any good. It can tell you there
// isn't one.

import fs from 'node:fs';
import path from 'node:path';

const APP = 'src/app';

// Routes that are deliberately not indexed. Named with the reason, because an
// exemption nobody can read becomes a hole nobody remembers.
const PRIVATE_PREFIXES = [
  ['(admin)', 'the console is disallowed in robots.js'],
  ['api', 'not a page'],
  ['wallets', 'somebody\'s own money'],
  ['settings', 'somebody\'s own account'],
  ['login', 'an action, not content'],
  ['signup', 'an action, not content'],
  ['verify-email', 'an action, not content'],
  ['reset-password', 'an action, not content'],
  ['forgot-password', 'an action, not content'],
  ['reset-email', 'an action, not content'],
  ['claim', 'a single-use token'],
  ['s', 'a short link, which redirects'],
  ['studio', 'a broadcast surface, not a page to find'],
  ['scan', 'a door tool'],
  ['my-stalls', 'your own stalls, orders and the delivery addresses on them'],
  ['check-in', 'a door tool'],
];

const routes = [];

const walk = (dir, segments) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, segments.concat(entry.name));
    } else if (entry.name === 'page.js' || entry.name === 'page.jsx') {
      routes.push({ file: full.split(path.sep).join('/'), segments });
    }
  }
};
walk(APP, []);

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

// Whether a route is listed in the sitemap or disallowed by robots, by the
// SHAPE of the address rather than a substring of it.
//
// This used to ask `sitemap.includes(firstSegment)`. /u/[username], every
// player's profile, has the first segment "u", and sitemap.js contains the
// letter u, so 175 indexable profiles were "listed" while the sitemap named
// none of them (inbox 460, 16 October 2026). The same reading let any detail
// route through whenever its listing page was listed: /teams/[slug] passed on
// the strength of /teams. A route is now listed only when sitemap.js builds a
// path of its exact shape (`/u/${p.username}` for /u/[username]).
const isParam = (seg) => /^\[.+\]$/.test(seg);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every path-looking string or template literal in a source file. */
export function pathLiterals(source) {
  return [...source.matchAll(/[`'"](\/[^`'"\s]*)[`'"]/g)].map((m) => m[1]);
}

/** True when the sitemap source builds an address shaped like `segments`. */
export function listedIn(sitemapSource, segments) {
  const shape = new RegExp('^/' + segments
    .map((seg) => (isParam(seg) ? '\\$\\{[^}]+\\}' : escapeRe(seg))).join('/') + '$');
  return pathLiterals(sitemapSource).some((p) => shape.test(p));
}

/** True when a Disallow pattern in the robots source covers this route. */
export function disallowedIn(robotsSource, segments) {
  const sample = '/' + segments.map((seg) => (isParam(seg) ? 'x-sample' : seg)).join('/');
  return pathLiterals(robotsSource)
    .filter((p) => p !== '/' && !p.startsWith('//'))
    // Robots semantics: a pattern matches from the start, `*` is any run.
    .some((p) => new RegExp('^' + escapeRe(p).replace(/\\\*/g, '.*')).test(sample));
}

if (process.argv.includes('--self-test')) {
  const sm = "entry('/'); entry('/teams'); entry(`/tournaments/${t.slug}`); entry(`/events/${e.slug}/stall/${v.slug}`);";
  const rb = "disallow: ['/admin', '/events/*/manage', '/s/']";
  const cases = [
    ['a player profile is not listed by the letter u', !listedIn(sm, ['u', '[username]'])],
    ['a team page is not listed by its listing page', !listedIn(sm, ['teams', '[slug]'])],
    ['the listing page itself is listed', listedIn(sm, ['teams'])],
    ['the home page is listed', listedIn(sm, [])],
    ['a tournament page is listed by its shape', listedIn(sm, ['tournaments', '[slug]'])],
    ['a nested stall page is listed by its shape', listedIn(sm, ['events', '[slug]', 'stall', '[stall]'])],
    ['an event page is not listed by the stall shape', !listedIn(sm, ['events', '[slug]'])],
    ['a wildcard disallow covers its route', disallowedIn(rb, ['events', '[slug]', 'manage'])],
    ['a disallow does not cover the public event page', !disallowedIn(rb, ['events', '[slug]'])],
    ['a prefix disallow covers what is under it', disallowedIn(rb, ['admin', 'users'])],
    ['the short link folder is disallowed', disallowedIn(rb, ['s', '[code]'])],
  ];
  let bad = 0;
  for (const [name, ok] of cases) {
    if (!ok) { bad += 1; console.log(`FAIL  ${name}`); }
  }
  console.log(`${cases.length - bad}/${cases.length} self-test cases`);
  process.exit(bad ? 1 : 0);
}

const sitemap = read(path.join(APP, 'sitemap.js'));
const robots = read(path.join(APP, 'robots.js'));

const findings = [];
let publicRoutes = 0;

for (const route of routes) {
  // Route groups like (admin) are not URL segments, but they do tell us what
  // this is.
  const real = route.segments.filter((s) => !/^\(.*\)$/.test(s));
  const first = route.segments[0] || '';
  const privateReason = PRIVATE_PREFIXES.find(
    ([p]) => p === first || p === real[0]);
  if (privateReason) continue;

  publicRoutes += 1;

  const dir = path.dirname(route.file);
  const src = read(route.file);
  const layout = read(path.join(dir, 'layout.js'));
  const near = src + layout;

  const hasMetadata = /export\s+(?:const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(near);
  const isDetail = real.some((s) => /^\[.+\]$/.test(s));

  if (!hasMetadata) {
    findings.push({
      file: route.file,
      rule: 'no metadata',
      detail: 'nothing sets a title or description, so this page shares the '
        + 'site-wide default and cannot rank or preview as itself.',
    });
    continue;
  }

  // A route that is NOINDEX will never appear in a search result, so asking it
  // for a per-record title is asking for work nobody will ever see. A manage
  // screen, an edit form, a door list, a private thread and a one-time token
  // are all detail routes and none of them should rank.
  //
  // Without this the checker reported 18 of these and the real answer was 5,
  // which is how a checker becomes a number people scroll past. See
  // `feedback_checker_calibration`.
  // Both spellings: Next's own `robots: { index: false }`, and `noindex: true`
  // given to lib/seo's pageMetadata, which is how most pages here say it. A
  // conditional (`noindex: profile.indexable === false`) is NOT a decision:
  // that page is indexable for almost every record and must be listed.
  const isNoindex = /robots\s*:\s*\{[^}]*index\s*:\s*false/.test(near)
    || /\bnoindex\s*:\s*true\b/.test(near);

  if (isDetail && isNoindex) continue;

  if (isDetail && !/generateMetadata/.test(near)) {
    findings.push({
      file: route.file,
      rule: 'constant metadata on a detail route',
      detail: 'every record on this route would share one title. Build it from '
        + 'the record with generateMetadata.',
    });
  }

  // In the sitemap, or explicitly disallowed. A public page in neither is one
  // nobody will find and nobody decided not to publish.
  const urlPath = '/' + real.map((s) => s.replace(/^\[(.*)\]$/, '$1')).join('/');
  // A page that serves noindex has had the decision made: it will never be
  // in a result, so it belongs in neither list (and a Disallow would hide the
  // noindex from the crawler that has to read it).
  if (!isNoindex && !listedIn(sitemap, real) && !disallowedIn(robots, real)) {
    findings.push({
      file: route.file,
      rule: 'in neither the sitemap nor robots',
      detail: `nothing lists ${urlPath}, and nothing says not to. One of the `
        + 'two has to be a decision somebody made.',
    });
  }
  // The opposite fault: the sitemap says "crawl this" and the page says "do
  // not index me". /partners shipped that way until 16 October 2026.
  if (isNoindex && listedIn(sitemap, real)) {
    findings.push({
      file: route.file,
      rule: 'listed in the sitemap but serves noindex',
      detail: `sitemap.js lists ${urlPath} and the page asks not to be indexed. `
        + 'Take it out of the sitemap, or drop the noindex if it is public.',
    });
  }
}

for (const f of findings) {
  console.log(`${f.file}  ${f.rule}`);
  console.log(`  ${f.detail}`);
  console.log('');
}

console.log(`${publicRoutes} public route(s) checked, ${findings.length} problem(s)`);
process.exit(findings.length ? 1 : 0);

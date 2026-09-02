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
  const stem = real[0] || '';
  if (stem && !sitemap.includes(stem) && !robots.includes(stem)) {
    findings.push({
      file: route.file,
      rule: 'in neither the sitemap nor robots',
      detail: `nothing lists ${urlPath}, and nothing says not to. One of the `
        + 'two has to be a decision somebody made.',
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

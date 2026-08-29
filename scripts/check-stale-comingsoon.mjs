// A ComingSoon page that outlives the thing it apologises for.
//
// /production, /tournaments/production and /tournaments/overlay each told a
// visitor that stream overlays were "designed but not connected to a live
// backend" for as long as the overlays were built, uploaded, bound to live
// tournament data and serving a URL to OBS. Nobody noticed, because a stub
// page looks the same whether it is honest or not.
//
// So: every route that renders ComingSoon is read here. If the code that
// implements it exists on disk, the page is not allowed to say it does not.
//
// Run: node scripts/check-stale-comingsoon.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = join(ROOT, 'src', 'app');

// A route is BUILT when the file that implements it is present. These are the
// files, not a list of names somebody has to remember to tick.
const BUILT_WHEN = {
  '/production': [
    'src/components/tournament-manage/OverlaysPanel.js',
  ],
  '/tournaments/production': [
    'src/components/tournament-manage/OverlaysPanel.js',
  ],
  '/tournaments/overlay': [
    'src/components/tournament-manage/OverlaysPanel.js',
  ],
};

// Phrases that assert a thing does not exist. A stub may say where to go
// instead; it may not say the feature is missing when it is not.
const DENIALS = [
  /not connected to a live backend/i,
  /not connected to a stream/i,
  /is not serving live/i,
  /no backend yet/i,
  /does not exist yet/i,
  /has not been built/i,
  /coming soon/i,
];

function pagesUnder(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pagesUnder(p, out);
    else if (name === 'page.js') out.push(p);
  }
  return out;
}

function routeOf(file) {
  const r = relative(APP, file).split(String.fromCharCode(92)).join('/').replace(/[/]page[.]js$/, '');
  // (admin) and other route groups are not part of the address.
  const cleaned = r.split('/').filter((s) => !/^\(.*\)$/.test(s)).join('/');
  return '/' + cleaned;
}

const problems = [];
let checked = 0;

for (const file of pagesUnder(APP)) {
  const src = readFileSync(file, 'utf8');
  if (!/ComingSoon/.test(src)) continue;
  const route = routeOf(file);
  const markers = BUILT_WHEN[route];
  if (!markers) continue;
  const built = markers.filter((m) => existsSync(join(ROOT, m)));
  if (built.length === 0) continue;
  checked += 1;
  for (const denial of DENIALS) {
    const hit = src.match(denial);
    if (hit) {
      problems.push(
        `${route}: still says "${hit[0]}", but ${built.join(', ')} exists`
      );
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error(p);
  console.error(`${problems.length} stale coming-soon claims`);
  process.exit(1);
}
console.log(`${checked} built routes still rendering ComingSoon, none denies it exists`);
console.log('no stale coming-soon copy');

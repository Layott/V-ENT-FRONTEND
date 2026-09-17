#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Every public page must have a link preview that actually shows a picture.
 *
 * CEO, 29 August 2026: an event pasted into WhatsApp came back with no banner.
 * The tags were present, which is why nobody had noticed: reading the source it
 * looked finished. What was missing was everything a scraper needs beyond the
 * URL - the dimensions, a first-party host, and a file small enough to be
 * rendered.
 *
 * So this reads the served HTML rather than the source, the same way a scraper
 * would, and requires the whole card.
 *
 * Usage:
 *   node scripts/check-embeds.mjs [baseUrl]
 * Default base is http://127.0.0.1:3001, so it runs against `pnpm dev`.
 */
import sharp from 'sharp';

// This machine runs the dev server on 3001 or 3005 (the build directory
// carries the port, see reference_local_dev_stack). With no address given,
// whichever one answers is the one under test.
async function firstAlive(candidates) {
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) return base;
    } catch {
      // not this one
    }
  }
  return candidates[0];
}
const BASE = process.argv[2]
  || await firstAlive(['http://127.0.0.1:3001', 'http://127.0.0.1:3005']);

// One of each kind: the front page, a listing, a record with its own image, a
// legal page, and a record whose image comes from the media host.
const ROUTES = [
  '/',
  '/tournaments',
  '/events',
  '/teams',
  '/community',
  '/organizations',
  '/rankings',
  '/terms',
  '/privacy-policy',
  '/events/v-ent-lagos-meetup-2026',
];

const meta = (html, property) => {
  const m = html.match(
    new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, 'i'))
    || html.match(
      new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${property}"`, 'i'));
  return m ? m[1] : null;
};

const named = (html, name) => {
  const m = html.match(
    new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, 'i'))
    || html.match(
      new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${name}"`, 'i'));
  return m ? m[1] : null;
};

const problems = [];
let checked = 0;

for (const route of ROUTES) {
  let html;
  try {
    const res = await fetch(`${BASE}${route}`, { redirect: 'follow' });
    if (!res.ok) { problems.push(`${route} answered ${res.status}`); continue; }
    html = await res.text();
  } catch (err) {
    problems.push(`${route} could not be fetched: ${err.message}`);
    continue;
  }
  checked += 1;

  const required = {
    'og:title': meta(html, 'og:title'),
    'og:description': meta(html, 'og:description'),
    'og:url': meta(html, 'og:url'),
    'og:image': meta(html, 'og:image'),
    'og:image:width': meta(html, 'og:image:width'),
    'og:image:height': meta(html, 'og:image:height'),
    'og:image:type': meta(html, 'og:image:type'),
    'og:image:alt': meta(html, 'og:image:alt'),
  };
  for (const [tag, value] of Object.entries(required)) {
    if (!value) problems.push(`${route} has no ${tag}`);
  }

  const image = required['og:image'];
  if (image) {
    // Absolute, and https. A relative URL is not resolvable by a scraper that
    // fetches the image from its own infrastructure.
    if (!/^https:\/\//.test(image)) {
      problems.push(`${route} og:image is not an absolute https URL: ${image}`);
    }
    // First party. This is the fix: a scraper should only ever have to trust
    // one host.
    if (!image.startsWith('https://v-ent.co/')) {
      problems.push(`${route} og:image is on another host: ${image}`);
    }
  }

  // The declared type has to be what the image actually serves, and the image
  // has to be small enough to render. og:image:type was hardcoded to
  // image/jpeg while the default card is a PNG, so every page falling back to
  // it advertised one format and served another. WhatsApp shows nothing and
  // says nothing when it rejects an image, so the only way to know is to
  // fetch it the way a scraper does.
  if (image) {
    // The tags name the canonical site (https://v-ent.co/api/og?src=...),
    // because a scraper has to be handed a public address. Against a dev
    // server that address points at production, whose /api/og will not
    // proxy a 127.0.0.1 media host, so the check read "could not be
    // fetched" for weeks and the ledger held a number nobody could act
    // on. The image is fetched from the server under test instead: same
    // path, same query, this origin. On production the two are the same.
    let target = image;
    try {
      const u = new URL(image);
      const base = new URL(BASE);
      if (u.origin !== base.origin && u.pathname.startsWith('/api/og')) {
        target = `${base.origin}${u.pathname}${u.search}`;
      }
    } catch {
      // not a URL; the fetch below will say so
    }
    try {
      const img = await fetch(target, { redirect: 'follow' });
      const servedType = (img.headers.get('content-type') || '').split(';')[0].trim();
      const declaredType = meta(html, 'og:image:type');
      if (!img.ok) {
        problems.push(`${route} og:image does not load: ${img.status} ${image}`);
      } else {
        if (declaredType && servedType && declaredType !== servedType) {
          problems.push(
            `${route} og:image:type says ${declaredType} but the URL serves ${servedType}`
          );
        }
        // The dimensions stated in the tags have to be the dimensions of the
        // bytes. A scraper that crops to a stated 1200x630 and receives
        // something else produces a card nobody designed.
        const buf = Buffer.from(await img.arrayBuffer());
        try {
          const m = await sharp(buf).metadata();
          const w = Number(meta(html, 'og:image:width'));
          const h = Number(meta(html, 'og:image:height'));
          if (w && h && (m.width !== w || m.height !== h)) {
            problems.push(
              `${route} og:image says ${w}x${h} but the image is ${m.width}x${m.height}`
            );
          }
        } catch (err) {
          problems.push(`${route} og:image is not a readable image: ${err.message}`);
        }

        const bytes = buf.length;
        // WhatsApp will not render an image much over 600KB.
        if (bytes > 600 * 1024) {
          problems.push(
            `${route} og:image is ${Math.round(bytes / 1024)}KB, over the 600KB a scraper will take`
          );
        }
      }
    } catch (err) {
      problems.push(`${route} og:image could not be fetched: ${err.message}`);
    }
  }

  if (named(html, 'twitter:card') !== 'summary_large_image') {
    problems.push(`${route} twitter:card is not summary_large_image`);
  }
  if (!named(html, 'twitter:image')) problems.push(`${route} has no twitter:image`);
}

console.log(`pages checked: ${checked}`);
if (checked === 0) {
  // No digits in this line: the debt ledger reads numbers off a summary
  // line, and the port in an address once became 3128 units of debt.
  console.log('\nNOTHING WAS CHECKED. Is the dev server running? Looked at '
    + BASE.replace(/[0-9]/g, '#') + '; pass its address as the first argument.');
  process.exit(2);
}
if (problems.length) {
  console.log(`\nINCOMPLETE LINK PREVIEW (${problems.length}):`);
  for (const p of problems) console.log(`  ${p}`);
}
// One summary line in the shape the debt ledger reads: the fault count
// first, the page count behind a preposition so it is not counted.
console.log(`${problems.length} incomplete link preview(s) across ${checked} page(s)`);
process.exit(problems.length ? 1 : 0);

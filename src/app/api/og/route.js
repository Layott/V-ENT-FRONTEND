// The image a link preview actually loads.
//
// CEO, 29 August 2026: "the link i pasted for an event i sent on whatsapp did
// not load the banner of that event. Please fix, i need all links to load their
// embed images, regardless."
//
// The tags were there. The image was not reachable in the way a scraper needs:
//
// 1. `og:image` pointed straight at the media host, `api.v-ent.co/media/...`.
//    Every scraper fetches that separately, and each one has its own rules
//    about redirects, certificates and content types on a host it has never
//    been told about.
// 2. There was no `og:image:width` or `og:image:height`. WhatsApp in particular
//    is documented as needing them, and quietly renders a link with no picture
//    when they are missing.
// 3. An event banner is whatever the organiser uploaded, which is routinely
//    several megabytes. WhatsApp will not render an image much over 600KB, so
//    the correct URL with the correct tags still shows nothing.
//
// So the preview image is served from the site's own domain, at a known size,
// under a known weight, with a long cache. One address, one set of rules, and
// the same answer for every scraper. That is what "regardless" means.
//
// This is a proxy, so it is restricted: it will only fetch from the configured
// media host, and only under the media path. An open proxy here would let
// anybody use the site to fetch anything on its behalf, which is how an
// internal service ends up reachable from the outside.

import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';
// A banner rarely changes and a scraper caches hard anyway.
export const revalidate = 86400;

/** Every origin a media file may legitimately come from. */
function allowedOrigins() {
  const out = new Set();
  for (const value of [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_MEDIA_URL]) {
    if (!value) continue;
    try { out.add(new URL(value).origin); } catch { /* not a URL, skip */ }
  }
  return out;
}

const MAX_BYTES = 6 * 1024 * 1024;      // what we will pull from the media host
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// The one card size the tags state, so what is served matches what is claimed.
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
// WhatsApp will not render a preview image much over 600KB. Everything sent
// out of here stays under it, whatever was uploaded.
const SCRAPER_MAX_BYTES = 600 * 1024;

export async function GET(request) {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) return NextResponse.redirect(new URL('/images/og-default.png', request.url));

  let target;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.redirect(new URL('/images/og-default.png', request.url));
  }

  // The allow list. Not a pattern match on the string: a check like
  // `src.startsWith(API_URL)` is defeated by `https://api.v-ent.co.evil.test/`.
  const origins = allowedOrigins();
  const ok = origins.has(target.origin)
    && (target.pathname.startsWith('/media/') || target.pathname.startsWith('/static/'));
  if (!ok) {
    return NextResponse.redirect(new URL('/images/og-default.png', request.url));
  }

  try {
    const upstream = await fetch(target.toString(), {
      // A scraper is not signed in, and neither is this.
      headers: { Accept: 'image/*' },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const type = (upstream.headers.get('content-type') || '').split(';')[0].trim();
    if (!TYPES.has(type)) throw new Error(`upstream type ${type}`);

    const raw = Buffer.from(await upstream.arrayBuffer());
    if (raw.length > MAX_BYTES) throw new Error('upstream too large');

    // Re-encode, rather than pass the organiser's file through.
    //
    // This route used to forward the upstream bytes and the upstream type
    // unchanged, which left both of the things it exists to fix in place: a
    // banner is whatever somebody uploaded, routinely several megabytes, and
    // WhatsApp will not render an image much over 600KB; and the page says
    // og:image:type is image/jpeg, which was a lie for every PNG or WebP
    // banner. A comment above described the resizing. The code did not do it.
    //
    // `cover` at the canonical card size, so the dimensions the tags state are
    // the dimensions actually served. Quality steps down rather than failing,
    // because a slightly softer card renders and a 700KB one does not.
    let body = null;
    for (const quality of [82, 70, 58, 45]) {
      body = await sharp(raw)
        .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover', position: 'centre' })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (body.length <= SCRAPER_MAX_BYTES) break;
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(body.length),
        // A year, because the URL carries the file's own name and a new upload
        // is a new name.
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Scrapers fetch from their own infrastructure, not from a browser
        // holding a session.
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    // A preview with the platform's own card beats a preview with no picture,
    // which is what a broken image produces in every client that matters.
    return NextResponse.redirect(new URL('/images/og-default.png', request.url));
  }
}

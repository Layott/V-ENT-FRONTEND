import { headers } from 'next/headers';

// Everything the site says about itself to a crawler or a link preview.
//
// Server-only. Every consumer is a layout, a [slug] route, sitemap.js or
// robots.js - all server components - which is what makes the `next/headers`
// import above legal.
//
// The problem this exists to fix: almost every page here is `'use client'` and
// loads its content in an effect. That means the HTML the server sends is an
// empty shell - no title beyond the site default, no description, no content.
// A person sees the page fill in a moment later; a crawler and a link preview
// see the shell and nothing else. Every tournament and event on the platform
// looked identical to Google.
//
// The fix is not to rewrite those pages as server components. It is to put a
// thin server component in front of each one that fetches the same record and
// returns real metadata, then renders the existing client component underneath.
// The server HTML gains a real title, description, canonical and preview card;
// the interactive page is untouched.

export const SITE = {
  url: 'https://v-ent.co',
  name: 'V-ENT',
  legalName: 'Vermillion Encore',
  // Said plainly, because a description that could describe any platform ranks
  // for nothing. This one names the thing, the place and what you do there.
  tagline: 'Esports tournaments, events and teams, built for Africa',
  description:
    'Run and enter esports tournaments, sell and scan event tickets, build a team and '
    + 'get paid in VENT COINS. Built in Nigeria for players across Africa.',
  twitter: '@ventgg',
  locale: 'en_NG',
};

export const LOCALES = [
  { code: 'en', hreflang: 'en', ogLocale: 'en_NG' },
  { code: 'fr', hreflang: 'fr', ogLocale: 'fr_FR' },
  { code: 'pt', hreflang: 'pt', ogLocale: 'pt_PT' },
];

/**
 * Which language this request is being served in.
 *
 * Set by middleware on a header, because a server component has no other way to
 * know: the prefix has already been rewritten away by the time the route runs.
 */
export function currentLocale() {
  try {
    const value = headers().get(LOCALE_HEADER);
    return LOCALE_CODES.includes(value) ? value : 'en';
  } catch {
    // headers() throws when called outside a request - during a static build,
    // for instance. English is the right answer there.
    return 'en';
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || '';

const LOCALE_HEADER = 'x-vent-locale';
const LOCALE_CODES = LOCALES.map((l) => l.code);

/** `/tournaments/x` in `fr` is `/fr/tournaments/x`. English stays bare. */
const withLocale = (path, locale) => {
  const clean = path?.startsWith('/') ? path : `/${path || ''}`;
  if (!locale || locale === 'en') return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
};

/** Absolute URL for a site-relative path. Crawlers need absolute. */
export const absolute = (path = '/') =>
  `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Language alternates for one path.
 *
 * `/tournaments`, `/fr/tournaments` and `/pt/tournaments` are three real
 * addresses serving the same page in three languages, so each hreflang names
 * its own, and `x-default` names the English one.
 */
export const languageAlternates = (path = '/', locale = 'en') => {
  // Each hreflang points at that language's own address. Three alternates all
  // pointing at one URL - which is what this did before locale prefixes existed
  // - tells a search engine nothing, and the French and Portuguese pages would
  // never rank as French or Portuguese pages.
  const languages = Object.fromEntries(
    LOCALES.map((l) => [l.hreflang, absolute(withLocale(path, l.code))]),
  );
  return {
    // The canonical of a French page is the French URL, not the English one.
    // Pointing it at English would tell Google the French page is a duplicate
    // and should not be indexed at all.
    canonical: absolute(withLocale(path, locale)),
    languages: {
      ...languages,
      // English is what somebody gets when no language matches.
      'x-default': absolute(path),
    },
  };
};

/** Trim a description to something a search result will actually show. */
export const clamp = (text, max = 160) => {
  const clean = String(text || '')
    .replace(/<[^>]*>/g, ' ')       // rules and descriptions are rich text
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
};

/**
 * The metadata object every page returns.
 *
 * `image` is whatever the record already has - a tournament banner, an event
 * poster, a team logo. A shared link showing the actual banner is the single
 * biggest difference between a link that gets clicked and one that does not.
 */
export function buildMetadata({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  publishedTime,
  keywords,
  locale,
}) {
  const lang = locale || currentLocale();
  const url = absolute(withLocale(path, lang));
  const desc = clamp(description || SITE.description);
  const images = image
    ? [{ url: image.startsWith('http') ? image : absolute(image), alt: title }]
    : [{ url: absolute('/images/og-default.png'), alt: SITE.name }];

  return {
    title,
    description: desc,
    keywords,
    alternates: languageAlternates(path, lang),
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: SITE.name,
      type,
      locale: (LOCALES.find((l) => l.code === lang) || LOCALES[0]).ogLocale,
      alternateLocale: LOCALES.filter((l) => l.code !== lang).map((l) => l.ogLocale),
      images,
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: images.map((i) => i.url),
      site: SITE.twitter,
    },
  };
}

/** Metadata for a page that must never be indexed: wallets, settings, admin. */
export const privateMetadata = (title) =>
  buildMetadata({ title, description: SITE.description, noindex: true });

// ---------------------------------------------------------------------------
// Fetching a record for metadata
// ---------------------------------------------------------------------------

/**
 * Read one record on the server, for metadata only.
 *
 * Never throws: a metadata function that throws takes the whole page down, and
 * a missing description is worth far less than a working page. Revalidated
 * rather than cached forever so a rename shows up in search within the hour.
 */
export async function fetchForMetadata(path, { revalidate = 900 } = {}) {
  if (!API) return null;
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    const body = await res.json();
    // A renamed thing answers `moved`; the caller canonicalises to the new URL.
    if (body?.status === 'moved') return { __moved: body?.data?.url || null };
    if (body?.status !== 'success') return null;
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------
//
// JSON-LD rather than microdata, because it does not touch the markup and these
// pages are already dense. Each builder returns null when the record is missing
// the fields that type requires - invalid structured data is penalised, and an
// absent block costs nothing.

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.legalName,
    alternateName: SITE.name,
    url: SITE.url,
    // /images/vent-logo.png does not exist and never did, so the Organization
    // block has been pointing Google at a 404 for as long as it has existed.
    // A structured-data logo that cannot be fetched is dropped, which is why
    // no logo has ever shown beside V-ENT in a search result.
    logo: absolute('/images/logo_mark_red.png'),
    foundingDate: '2023',
    address: { '@type': 'PostalAddress', addressCountry: 'NG' },
    sameAs: [`https://twitter.com/${SITE.twitter.replace('@', '')}`],
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    inLanguage: LOCALES.map((l) => l.code),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbLd(trail) {
  const items = (trail || []).filter((c) => c && c.name);
  if (items.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absolute(crumb.path) } : {}),
    })),
  };
}

/** A tournament is a SportsEvent. Google understands that type; it has no
 *  concept of an esports bracket. */
export function tournamentLd(t, path) {
  if (!t?.tournament_title || !t?.start_date_and_time) return null;
  const prize = Number(t.prize_pool || 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: t.tournament_title,
    description: clamp(t.tournament_description, 300),
    url: absolute(path),
    startDate: t.start_date_and_time,
    ...(t.end_date_and_time ? { endDate: t.end_date_and_time } : {}),
    eventStatus:
      t.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      t.tournament_type === 'physical'
        ? 'https://schema.org/OfflineEventAttendanceMode'
        : t.tournament_type === 'hybrid'
          ? 'https://schema.org/MixedEventAttendanceMode'
          : 'https://schema.org/OnlineEventAttendanceMode',
    location:
      t.tournament_type === 'physical' && t.tournament_location
        ? { '@type': 'Place', name: t.tournament_location,
            address: { '@type': 'PostalAddress', addressLocality: t.tournament_location } }
        : { '@type': 'VirtualLocation', url: absolute(path) },
    ...(t.tournament_banner ? { image: [t.tournament_banner] } : {}),
    ...(t.tournament_creator?.username
      ? { organizer: { '@type': 'Person', name: t.tournament_creator.full_name
          || t.tournament_creator.username } }
      : {}),
    ...(prize > 0 ? { award: `${prize.toLocaleString()} VENT COINS prize pool` } : {}),
    offers: {
      '@type': 'Offer',
      url: absolute(path),
      price: t.entry_fee === 'Paid' ? Number(t.entry_fee_price || 0) : 0,
      priceCurrency: 'NGN',
      availability:
        t.status === 'cancelled' || t.status === 'completed'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      validFrom: t.start_date_and_time,
    },
  };
}

export function eventLd(e, path) {
  const name = e?.name || e?.title;
  if (!name) return null;
  const start = e.start_datetime || e.event_date || e.reg_start_date;
  if (!start) return null;
  const tiers = Array.isArray(e.ticket_tiers) ? e.ticket_tiers : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description: clamp(e.desc || e.description, 300),
    url: absolute(path),
    startDate: start,
    ...(e.end_datetime ? { endDate: e.end_datetime } : {}),
    eventStatus: e.is_active === false
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      e.event_type === 'physical'
        ? 'https://schema.org/OfflineEventAttendanceMode'
        : e.event_type === 'hybrid'
          ? 'https://schema.org/MixedEventAttendanceMode'
          : 'https://schema.org/OnlineEventAttendanceMode',
    location: e.location
      ? { '@type': 'Place', name: e.location,
          address: { '@type': 'PostalAddress', addressLocality: e.location, addressCountry: 'NG' } }
      : { '@type': 'VirtualLocation', url: e.event_link || absolute(path) },
    ...(e.banner ? { image: [e.banner] } : {}),
    ...(e.creator?.username
      ? { organizer: { '@type': 'Person', name: e.creator.full_name || e.creator.username } }
      : {}),
    ...(tiers.length
      ? {
        offers: tiers.map((tier) => ({
          '@type': 'Offer',
          name: tier.name,
          price: Number(tier.price || 0),
          priceCurrency: 'NGN',
          url: absolute(path),
          availability:
            (tier.quantity_remaining ?? 1) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
        })),
      }
      : {}),
  };
}

export function teamLd(team, path) {
  if (!team?.team_name) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.team_name,
    url: absolute(path),
    ...(team.description ? { description: clamp(team.description, 300) } : {}),
    ...(team.team_logo ? { logo: team.team_logo } : {}),
    ...(team.game?.game_title ? { sport: team.game.game_title } : {}),
    ...(team.number_of_members ? { numberOfEmployees: team.number_of_members } : {}),
  };
}

export function personLd(user, path) {
  if (!user?.username) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: user.full_name || user.username,
      alternateName: user.username,
      url: absolute(path),
      ...(user.profile_picture ? { image: user.profile_picture } : {}),
      ...(user.description ? { description: clamp(user.description, 300) } : {}),
      ...(user.country ? { homeLocation: { '@type': 'Place', name: user.country } } : {}),
    },
  };
}

export function orgLd(org, path) {
  if (!org?.org_name) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.org_name,
    url: absolute(path),
    ...(org.bio ? { description: clamp(org.bio, 300) } : {}),
    ...(org.logo ? { logo: org.logo } : {}),
    ...(org.location
      ? { address: { '@type': 'PostalAddress', addressLocality: org.location } }
      : {}),
  };
}

export function discussionLd(thread, path) {
  if (!thread?.title) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: thread.title,
    url: absolute(path),
    ...(thread.body ? { text: clamp(thread.body, 500) } : {}),
    ...(thread.created_at ? { datePublished: thread.created_at } : {}),
    ...(thread.author?.username
      ? { author: { '@type': 'Person', name: thread.author.full_name || thread.author.username } }
      : {}),
    ...(thread.reply_count != null
      ? { commentCount: thread.reply_count }
      : {}),
    ...(thread.upvote_count != null
      ? { interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: thread.upvote_count,
      } }
      : {}),
  };
}

export function faqLd(pairs) {
  const items = (pairs || []).filter((p) => p?.q && p?.a);
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

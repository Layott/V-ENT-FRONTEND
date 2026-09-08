import { LOCALES, absolute } from '@/lib/seo';

// The sitemap is generated from what is actually live, not hand-maintained.
//
// A hand-written list goes stale the first week and then quietly lies: it keeps
// offering tournaments that finished in March and never mentions the one that
// opened this morning. This asks the API and builds the list each time it is
// revalidated.
//
// Only public things go in. Wallets, settings, admin and anything behind a
// login are excluded here as well as being noindex, because a sitemap is a
// positive claim that a URL is worth crawling.

const API = process.env.NEXT_PUBLIC_API_URL || '';

export const revalidate = 3600;   // an hour; content here does not change by the minute

async function readList(path) {
  if (!API) return [];
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate } });
    if (!res.ok) return [];
    const body = await res.json();
    if (body?.status !== 'success') return [];
    const data = body.data ?? {};
    if (Array.isArray(data)) return data;
    // The list endpoints return grouped shapes ({featured, new, by_game}) as
    // often as flat ones, so flatten whatever arrays are present and de-dupe.
    const out = [];
    const seen = new Set();
    for (const value of Object.values(data)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        const key = item?.slug || item?.id || item?.tournament_id || item?.event_id;
        if (key && !seen.has(key)) { seen.add(key); out.push(item); }
      }
    }
    return out;
  } catch {
    return [];
  }
}

// One row per language.
//
// A page that exists in three languages is three addresses, and a sitemap that
// names only the English one leaves the other two to be found by luck. Each row
// also carries the full alternates set, which is what tells a search engine the
// three are the same page rather than three thin duplicates.
const entry = (path, { changeFrequency = 'weekly', priority = 0.5, lastModified } = {}) => {
  const withLocale = (p, code) => (code === 'en'
    ? p
    : (p === '/' ? `/${code}` : `/${code}${p}`));
  const alternates = {
    languages: Object.fromEntries(
      LOCALES.map((l) => [l.hreflang, absolute(withLocale(path, l.code))]),
    ),
  };
  return LOCALES.map((l) => ({
    url: absolute(withLocale(path, l.code)),
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency,
    // The English page is the one to rank first when everything else is equal.
    priority: l.code === 'en' ? priority : Math.max(0.1, priority - 0.1),
    alternates,
  }));
};

export default async function sitemap() {
  // Pages that exist regardless of content.
  const staticPages = [
    entry('/', { changeFrequency: 'daily', priority: 1 }),
    entry('/tournaments', { changeFrequency: 'hourly', priority: 0.9 }),
    entry('/events', { changeFrequency: 'hourly', priority: 0.9 }),
    entry('/teams', { changeFrequency: 'daily', priority: 0.8 }),
    entry('/organizations', { changeFrequency: 'daily', priority: 0.7 }),
    entry('/community', { changeFrequency: 'hourly', priority: 0.7 }),
    entry('/rankings', { changeFrequency: 'daily', priority: 0.6 }),
    // Modules that are announced but not open yet. They are listed because
    // each one says plainly what it will be and when, and somebody searching
    // for "V-ENT shop" should reach that rather than nothing at all. Low
    // priority: they are promises, not content.
    entry('/anime', { changeFrequency: 'monthly', priority: 0.3 }),
    entry('/marketplace', { changeFrequency: 'monthly', priority: 0.3 }),
    entry('/shop', { changeFrequency: 'monthly', priority: 0.3 }),
    entry('/wager', { changeFrequency: 'monthly', priority: 0.2 }),
    entry('/partners', { changeFrequency: 'monthly', priority: 0.4 }),
    // What V-ENT costs, and where to say what is wrong. Both are things
    // somebody searches for by name before they commit to a platform.
    entry('/pricing', { changeFrequency: 'monthly', priority: 0.6 }),
    entry('/feedback', { changeFrequency: 'monthly', priority: 0.3 }),
    // The API reference is how an integrator finds V-ENT at all, so it is worth
    // more in search than the application form it points at.
    entry('/partners/docs', { changeFrequency: 'monthly', priority: 0.5 }),
    entry('/login', { changeFrequency: 'yearly', priority: 0.3 }),
    entry('/signup', { changeFrequency: 'yearly', priority: 0.4 }),
    entry('/privacy-policy', { changeFrequency: 'yearly', priority: 0.2 }),
    entry('/terms', { changeFrequency: 'yearly', priority: 0.2 }),
  ];

  const [tournaments, events, teams, clubs, organizations, plans] = await Promise.all([
    readList('/tournament/get-all-tournaments/'),
    readList('/event/get-all-events/'),
    readList('/team/get-all-teams/'),
    readList('/club/list/'),
    readList('/organization/list/'),
    readList('/billing/plans/public/'),
  ]);

  const tournamentPages = tournaments
    .filter((t) => t?.slug && !t.is_draft)
    .map((t) => entry(`/tournaments/${t.slug}`, {
      changeFrequency: 'daily',
      priority: 0.8,
      lastModified: t.updated_at || t.start_date_and_time || t.start_date,
    }));

  const eventPages = events
    .filter((e) => e?.slug && e.is_active !== false)
    .map((e) => entry(`/events/${e.slug}`, {
      changeFrequency: 'daily',
      priority: 0.8,
      lastModified: e.last_updated || e.event_date,
    }));

  // The run of show, where an organiser has published one. Its own address
  // rather than a fragment of the event page, because it is a document people
  // search for by name ("rivalry series run of show") and share on its own.
  // Only `public` sheets carry the flag; a link only one is unlisted by
  // definition and must never reach a sitemap.
  const runOfShowPages = [
    ...tournaments
      .filter((t) => t?.slug && !t.is_draft && t.has_run_of_show)
      .map((t) => entry(`/tournaments/${t.slug}/run-of-show`, {
        changeFrequency: 'daily',
        priority: 0.5,
      })),
    ...events
      .filter((e) => e?.slug && e.is_active !== false && e.has_run_of_show)
      .map((e) => entry(`/events/${e.slug}/run-of-show`, {
        changeFrequency: 'daily',
        priority: 0.5,
      })),
  ];

  const teamPages = teams
    .filter((t) => t?.slug)
    .map((t) => entry(`/teams/${t.slug}`, { changeFrequency: 'weekly', priority: 0.6 }));

  // Clubs are withdrawn (CEO, 7 September 2026), so there is nothing at
  // /community/club to find. Listing a route that 404s is worse than listing
  // nothing.
  const clubPages = [];

  const orgPages = organizations
    .filter((o) => o?.slug)
    .map((o) => entry(`/organizations/${o.slug}`, {
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  // A membership an organiser sells. Public and worth finding: somebody
  // deciding whether to join is exactly the reader a search result reaches,
  // and the endpoint only ever returns plans that are actually public.
  const planPages = plans
    .filter((p) => p?.slug)
    .map((p) => entry(`/plans/${p.slug}`, {
      changeFrequency: 'weekly',
      priority: 0.5,
      lastModified: p.updated_at,
    }));

  // entry() returns one row per language, so the lists arrive nested.
  return [...staticPages, ...tournamentPages, ...eventPages, ...runOfShowPages,
          ...teamPages, ...clubPages, ...orgPages, ...planPages].flat();
}

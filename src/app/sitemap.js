import { SITE, absolute } from '@/lib/seo';

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

const entry = (path, { changeFrequency = 'weekly', priority = 0.5, lastModified } = {}) => ({
  url: absolute(path),
  lastModified: lastModified ? new Date(lastModified) : new Date(),
  changeFrequency,
  priority,
});

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
    entry('/login', { changeFrequency: 'yearly', priority: 0.3 }),
    entry('/signup', { changeFrequency: 'yearly', priority: 0.4 }),
    entry('/privacy-policy', { changeFrequency: 'yearly', priority: 0.2 }),
  ];

  const [tournaments, events, teams] = await Promise.all([
    readList('/tournament/get-all-tournaments/'),
    readList('/event/get-all-events/'),
    readList('/team/get-all-teams/'),
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

  const teamPages = teams
    .filter((t) => t?.slug)
    .map((t) => entry(`/teams/${t.slug}`, { changeFrequency: 'weekly', priority: 0.6 }));

  return [...staticPages, ...tournamentPages, ...eventPages, ...teamPages];
}

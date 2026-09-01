import { redirect } from 'next/navigation';
import {
  buildMetadata, eventMetadata, fetchForMetadata, tournamentMetadata,
} from '@/lib/seo';
import ShortLinkMissing from './ShortLinkMissing';

// `/s/k7m2qp` - a shortened ticket link.
//
// CEO, 1 September: "add an option for people to be able to shorten their
// ticket links, so you create very short versions of the ticket links."
//
// A server component, so the redirect happens before anything is painted. A
// client-side version would send a blank page, wait for React, wait for the
// fetch and only then move, which somebody arriving from a printed flyer reads
// as a dead link, and which a link preview cannot follow at all.
//
// The backend answers with the path rather than redirecting itself. It is the
// only side that knows a token, and this is the only side that knows what a
// frontend URL is. Same division as a renamed slug answering `{status:'moved'}`.

export const dynamic = 'force-dynamic';

const resolve = (token) => (token
  ? fetchForMetadata(`/s/${encodeURIComponent(token)}/`, { revalidate: 0 })
  : Promise.resolve(null));

/** The path a short link points at, or null when it points nowhere safe. */
const safeTarget = (data) => {
  const target = data?.target;
  // Checked here as well as at the API. An open redirect is worth refusing
  // twice, and this is the side that actually performs the navigation.
  if (!target || !target.startsWith('/') || target.startsWith('//')
      || target.startsWith('/\\')) return null;
  return target;
};

/** `/events/lagos-anime-con?tab=tickets` -> `['events', 'lagos-anime-con']`. */
const partsOf = (target) => target.split('?')[0].split('/').filter(Boolean);

// A short link has to describe where it GOES, not itself.
//
// CEO, 1 September, with a screenshot of the paste: the link previewed as
// "Short link - Opening a V-ENT link" over the house logo, rather than the
// event's own name and picture.
//
// An unfurler reads the address it is handed. Some follow the redirect and some
// stop at the first response, and the ones that follow may still keep the tags
// they read first. The only version that is right in every client is the short
// URL carrying the destination's own title, description and image - which is
// also why the builders live in `lib/seo` and are shared with the `[slug]`
// routes rather than copied. Two copies would drift, and the copy that drifted
// would be the one nobody looks at.
//
// The canonical still points at the record's real address, so the two do not
// compete in search.
export async function generateMetadata({ params }) {
  const token = String(params?.token || '').trim();
  const target = safeTarget(await resolve(token));

  const generic = buildMetadata({
    title: 'Short link',
    description: 'Opening a V-ENT link.',
    path: `/s/${token}`,
    noindex: true,
  });
  if (!target) return generic;

  const [section, slug] = partsOf(target);
  if (section === 'events' && slug) {
    const raw = await fetchForMetadata(`/event/view-event/${encodeURIComponent(slug)}/`);
    const e = raw?.__moved ? raw : (raw?.event || raw);
    return e ? eventMetadata(e, slug) : generic;
  }
  if (section === 'tournaments' && slug) {
    const t = await fetchForMetadata(`/tournament/view-tournament/${encodeURIComponent(slug)}/`);
    return t ? tournamentMetadata(t, slug) : generic;
  }
  return generic;
}

export default async function ShortLinkPage({ params }) {
  const token = String(params?.token || '').trim();
  const target = safeTarget(await resolve(token));
  if (target) redirect(target);

  return <ShortLinkMissing token={token} />;
}

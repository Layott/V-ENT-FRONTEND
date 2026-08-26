import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbLd, buildMetadata, clamp, fetchForMetadata, tournamentLd,
} from '@/lib/seo';
import TournamentBySlugClient from './TournamentBySlugClient';

// `/tournaments/naija-free-fire-weekly-12`.
//
// A server component, deliberately. The page underneath is `'use client'` and
// loads the tournament in an effect, so the HTML the server sends carries no
// title, no description and no content - every tournament looked identical to
// a crawler and every shared link previewed as the generic site card. This
// wrapper fetches the same record on the server purely to describe it, then
// renders the interactive page underneath untouched.

export const revalidate = 900;

const load = (slug) =>
  fetchForMetadata(`/tournament/view-tournament/${encodeURIComponent(slug)}/`);

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const t = await load(slug);

  if (!t) {
    return buildMetadata({
      title: 'Tournament not found',
      description: 'This tournament does not exist, or it is no longer listed.',
      path: `/tournaments/${slug}`,
      noindex: true,
    });
  }

  // Renamed. Point the canonical at the address it lives at now so a rename
  // does not split ranking between the old URL and the new one.
  if (t.__moved) {
    return buildMetadata({
      title: 'Tournament moved',
      description: 'This tournament has been renamed.',
      path: t.__moved,
      noindex: true,
    });
  }

  const game = t.game ? `${t.game} ` : '';
  const prize = Number(t.prize_pool || 0);
  const when = t.start_date_and_time
    ? new Date(t.start_date_and_time).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    : null;

  // Written to be read in a search result, so it leads with what somebody is
  // deciding: the game, the date, what it pays, what it costs to enter.
  const description = clamp(
    t.tournament_description
    || [
      `${game}tournament${when ? ` on ${when}` : ''}.`,
      prize > 0 ? `${prize.toLocaleString()} VENT COINS prize pool.` : null,
      t.entry_fee === 'Paid'
        ? `Entry ${Number(t.entry_fee_price || 0).toLocaleString()} VC.`
        : 'Free to enter.',
      t.max_participants ? `${t.current_participants || 0} of ${t.max_participants} places taken.` : null,
    ].filter(Boolean).join(' '),
  );

  return buildMetadata({
    title: t.tournament_title,
    description,
    path: `/tournaments/${t.slug || slug}`,
    image: t.tournament_banner || t.tournament_logo,
    type: 'article',
    keywords: [t.game, t.game_mode, 'esports tournament', 'Nigeria', t.format_label]
      .filter(Boolean).join(', '),
    // A draft is not published, and a cancelled tournament should stop ranking.
    noindex: Boolean(t.is_draft) || t.status === 'cancelled',
  });
}

const TournamentBySlug = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const t = await load(slug);

  // Renamed: send the browser to the current address before rendering, so the
  // address bar is right on the very first paint rather than correcting itself
  // a moment later.
  if (t?.__moved) redirect(t.__moved);

  const path = `/tournaments/${t?.slug || slug}`;

  return (
    <>
      <JsonLd
        data={[
          tournamentLd(t, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Tournaments', path: '/tournaments' },
            { name: t?.tournament_title || 'Tournament', path },
          ]),
        ]}
      />
      <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
        <TournamentBySlugClient slug={slug} />
      </Suspense>
    </>
  );
};

export default TournamentBySlug;

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbLd, buildMetadata, clamp, fetchForMetadata, tournamentLd,
  tournamentMetadata,
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
  // Shared with the short-link route, so both addresses describe the same
  // tournament the same way.
  return tournamentMetadata(await load(slug), slug);
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

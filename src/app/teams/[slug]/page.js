import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbLd, buildMetadata, clamp, fetchForMetadata, teamLd,
} from '@/lib/seo';
import TeamBySlugClient from './TeamBySlugClient';

// `/teams/lagos-rangers`. Server component, for the reason set out in the
// tournament route: the interactive page loads in an effect, so without this
// the crawler and the link preview both get an empty shell.

export const revalidate = 900;

const load = (slug) => fetchForMetadata(`/team/view-team/${encodeURIComponent(slug)}/`);

const pick = (data) => (data?.__moved ? data : (data?.team || data));

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const team = pick(await load(slug));

  if (!team) {
    return buildMetadata({
      title: 'Team not found',
      description: 'This team does not exist, or it is no longer listed.',
      path: `/teams/${slug}`,
      noindex: true,
    });
  }
  if (team.__moved) {
    return buildMetadata({
      title: 'Team moved',
      description: 'This team has been renamed.',
      path: team.__moved,
      noindex: true,
    });
  }

  const game = team.game?.game_title || team.game;
  const description = clamp(
    team.description
    || [
      `${team.team_name}${game ? `, a ${game} team` : ''} on V-ENT.`,
      team.number_of_members ? `${team.number_of_members} members.` : null,
      team.region || team.country ? `Based in ${team.region || team.country}.` : null,
    ].filter(Boolean).join(' '),
  );

  return buildMetadata({
    title: team.team_name,
    description,
    path: `/teams/${team.slug || slug}`,
    image: team.team_banner || team.team_logo,
    type: 'profile',
    keywords: [game, 'esports team', team.region || team.country, 'Nigeria']
      .filter(Boolean).join(', '),
  });
}

const TeamBySlug = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const team = pick(await load(slug));

  if (team?.__moved) redirect(team.__moved);

  const path = `/teams/${team?.slug || slug}`;

  return (
    <>
      <JsonLd
        data={[
          teamLd(team, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Teams', path: '/teams' },
            { name: team?.team_name || 'Team', path },
          ]),
        ]}
      />
      <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
        <TeamBySlugClient slug={slug} />
      </Suspense>
    </>
  );
};

export default TeamBySlug;

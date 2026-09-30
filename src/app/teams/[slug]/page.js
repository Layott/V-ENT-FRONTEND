import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, fetchRecordForMetadata, normaliseTeam, teamLd, teamMetadata } from '@/lib/seo';
import TeamBySlugClient from './TeamBySlugClient';
import { toSlugAddress } from '@/lib/slugAddress';

// `/teams/lagos-rangers`. Server component, for the reason set out in the
// tournament route: the interactive page loads in an effect, so without this
// the crawler and the link preview both get an empty shell.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/team/view-team/${encodeURIComponent(slug)}/`);

const pick = normaliseTeam;

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  await toSlugAddress(slug, pick(raw), '/teams', await props.searchParams);
  return teamMetadata(raw, slug);
}

const TeamBySlug = async props => {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const team = pick(await load(slug));

  if (team?.__moved) redirect(team.__moved);
  // Opened by its number: the address bar gets the name (inbox 381).
  await toSlugAddress(slug, team, '/teams', await props.searchParams);

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

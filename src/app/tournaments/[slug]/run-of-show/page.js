import { Suspense } from 'react';
import RunOfShowScreen from '@/components/run-of-show/RunOfShowScreen';
import { buildMetadata, clamp, fetchForMetadata, privateMetadata } from '@/lib/seo';

// `/tournaments/rivalry-series-s2/run-of-show`
//
// The same page on the other thing V-ENT runs, built in the same commit. A
// document that exists for an event and not for a tournament is a feature half
// the platform does not have, which is the fault this route exists to avoid
// rather than to fix later.

export const revalidate = 300;

const load = (slug) => fetchForMetadata(
  `/tournament/${encodeURIComponent(slug)}/run-of-show/`, { revalidate: 300 });

const sheetOf = (data) => data?.sheet || null;

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const sheet = sheetOf(await load(slug));
  if (!sheet || sheet.visibility !== 'public') {
    return privateMetadata('Run of show');
  }
  const name = sheet.owner?.name || sheet.name || 'Run of show';
  const days = (sheet.days || []).length;
  const cues = (sheet.days || []).reduce((n, d) => n + (d.items || []).length, 0);
  return buildMetadata({
    title: `${name}: run of show`,
    description: clamp(sheet.subtitle
      || `The minute by minute running order for ${name}: ${cues} cues across ${days} ${days === 1 ? 'day' : 'days'}, with the times, who owns each one and how long it runs.`),
    path: `/tournaments/${slug}/run-of-show`,
    type: 'article',
  });
}

const TournamentRunOfShow = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const sheet = sheetOf(await load(slug));

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <RunOfShowScreen
        sheet={sheet}
        kind="tournament"
        ownerRef={slug}
        sharePath={sheet ? `/tournaments/${slug}/run-of-show` : ''}
      />
    </Suspense>
  );
};

export default TournamentRunOfShow;

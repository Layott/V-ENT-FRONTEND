import { Suspense } from 'react';
import RunOfShowScreen from '@/components/run-of-show/RunOfShowScreen';
import { buildMetadata, clamp, fetchForMetadata, privateMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
import { recordCopy } from '@/lib/seoRecordCopy';

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

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const sheet = sheetOf(await load(slug));
  if (!sheet || sheet.visibility !== 'public') {
    return privateMetadata('run-of-show');
  }
  const locale = await currentLocale();
  const { t, n } = recordCopy(locale);
  const name = sheet.owner?.name || sheet.name || privateTitle('run-of-show', locale);
  const days = (sheet.days || []).length;
  const cues = (sheet.days || []).reduce((sum, d) => sum + (d.items || []).length, 0);
  return buildMetadata({
    locale,
    title: t('runOfShow.title', { name }),
    description: clamp(sheet.subtitle
      || n('runOfShow.days', days, { name, cues: n('runOfShow.cues', cues) })),
    path: `/tournaments/${slug}/run-of-show`,
    type: 'article',
  });
}

const TournamentRunOfShow = async props => {
  const params = await props.params;
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

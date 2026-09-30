import { Suspense } from 'react';
import RunOfShowScreen from '@/components/run-of-show/RunOfShowScreen';
import { buildMetadata, clamp, fetchForMetadata, privateMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
import { recordCopy } from '@/lib/seoRecordCopy';

// `/events/rivalry-series-season-2/run-of-show`
//
// A server component, so a public run of show is in the HTML rather than
// arriving after the JavaScript does. That matters more here than on most
// pages: this address is shared into WhatsApp groups, and a link preview and a
// search crawler both read the served markup and nothing else.
//
// A run sheet that is private or link only answers 404 to this unauthenticated
// fetch, which is correct: it must not be described in a preview, and it must
// not be indexed. The screen underneath then asks again with the viewer's own
// token, which is how the organiser sees their own unpublished sheet here.

export const revalidate = 300;

const load = (slug) => fetchForMetadata(
  `/event/${encodeURIComponent(slug)}/run-of-show/`, { revalidate: 300 });

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
    path: `/events/${slug}/run-of-show`,
    type: 'article',
  });
}

const EventRunOfShow = async props => {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const sheet = sheetOf(await load(slug));

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <RunOfShowScreen
        sheet={sheet}
        kind="event"
        ownerRef={slug}
        sharePath={sheet ? `/events/${slug}/run-of-show` : ''}
      />
    </Suspense>
  );
};

export default EventRunOfShow;

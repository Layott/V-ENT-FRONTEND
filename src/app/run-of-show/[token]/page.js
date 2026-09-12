import { Suspense } from 'react';
import RunOfShowScreen from '@/components/run-of-show/RunOfShowScreen';
import { fetchForMetadata, privateMetadata } from '@/lib/seo';

// `/run-of-show/<token>` - the address an organiser sends to their crew.
//
// Short and root mounted for the same reason the overlay and short link routes
// are: it is pasted into a WhatsApp group and read off a phone, and every
// character of a path is a character somebody has to look past.
//
// **Never indexed, whatever the sheet's visibility.** A link only sheet is
// unlisted by definition, and a public one already has a findable address on
// its event. Two indexed addresses for the same document is the duplicate that
// splits its own ranking, so this one is always noindex.

export const revalidate = 0;

export function generateMetadata() {
  return privateMetadata('Run of show');
}

const SharedRunOfShow = async ({ params }) => {
  const token = decodeURIComponent(params.token);
  const data = await fetchForMetadata(
    `/run-of-show/${encodeURIComponent(token)}/`, { revalidate: 0 });

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <RunOfShowScreen
        sheet={data?.sheet || null}
        token={token}
        sharePath={data?.sheet ? `/run-of-show/${token}` : ''}
      />
    </Suspense>
  );
};

export default SharedRunOfShow;

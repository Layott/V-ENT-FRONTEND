import { Suspense } from 'react';
import ServedSummary from '@/components/seo/ServedSummary';
import { fetchRecordForMetadata, threadMetadata } from '@/lib/seo';
import { ThreadInner } from '../page';

// `/community/thread/name-of-the-thread` - the thread addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
//
// A server component, the same shape as the organisation profile: the served
// HTML carries the thread's title as its h1 and the description its layout
// gives a search result, while the thread underneath loads. The record is the
// one the layout already fetched (the same request, answered once).
const load = (slug) => fetchRecordForMetadata(`/thread/${encodeURIComponent(slug)}/`);

const ThreadBySlug = async props => {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  const described = await threadMetadata(raw, slug);

  return (
    <Suspense fallback={<ServedSummary title={described?.title} description={described?.description} />}>
      <ThreadInner slug={slug} />
    </Suspense>
  );
};

export default ThreadBySlug;

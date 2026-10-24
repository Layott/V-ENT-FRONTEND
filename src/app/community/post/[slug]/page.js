import { Suspense } from 'react';
import ServedSummary from '@/components/seo/ServedSummary';
import { fetchRecordForMetadata, postMetadata } from '@/lib/seo';
import { PostInner } from '../page';

// `/community/post/name-of-the-post` - the post addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
//
// A server component, the same shape as the organisation profile: the served
// HTML carries the post's opening words as its h1 and the description its layout
// gives a search result, while the post underneath loads. The record is the one
// the layout already fetched (the same request, answered once).
const load = (slug) => fetchRecordForMetadata(`/post/${encodeURIComponent(slug)}/`);

const PostBySlug = async props => {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  const described = await postMetadata(raw, slug);

  return (
    <Suspense fallback={<ServedSummary title={described?.title} description={described?.description} />}>
      <PostInner slug={slug} />
    </Suspense>
  );
};

export default PostBySlug;

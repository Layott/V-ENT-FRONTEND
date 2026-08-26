'use client';

import { Suspense } from 'react';
import { PostInner } from '../page';

// `/community/post/name-of-the-thing` - the post addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const PostBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <PostInner slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default PostBySlug;

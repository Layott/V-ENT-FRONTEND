'use client';

import { Suspense } from 'react';
import { ThreadInner } from '../page';

// `/community/thread/name-of-the-thing` - the thread addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const ThreadBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ThreadInner slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default ThreadBySlug;

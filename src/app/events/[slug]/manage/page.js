'use client';

import { Suspense } from 'react';
import { ManageEventContent } from '../../manage/page';

// `/events/name-of-the-thing/manage` - the event addressed by name rather than
// by a number in a query string. The old `?id=` address still resolves, because
// links already shared have to keep working.
const ManageEventBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ManageEventContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default ManageEventBySlug;

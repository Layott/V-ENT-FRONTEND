'use client';

import { Suspense } from 'react';
import { AttendeesContent } from '../../attendees/page';

// `/events/name-of-the-thing/attendees` - the event addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const AttendeesBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <AttendeesContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default AttendeesBySlug;

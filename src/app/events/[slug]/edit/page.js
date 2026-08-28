'use client';

import { Suspense } from 'react';
import { EditEventContent } from '../../edit-event/page';

// `/events/name-of-the-thing/edit` - the event addressed by name rather than by
// a number in a query string. The old `?id=` address still resolves, because
// links already shared have to keep working.
const EditEventBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <EditEventContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default EditEventBySlug;

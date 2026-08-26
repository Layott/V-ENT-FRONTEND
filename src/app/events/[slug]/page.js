'use client';

import { Suspense } from 'react';
import { ViewEventContent } from '../view-event/page';

// `/events/anime-night-lagos`. The query-string address still works.
const EventBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ViewEventContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default EventBySlug;

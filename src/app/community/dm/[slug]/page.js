'use client';

import { Suspense } from 'react';
import { DmInner } from '../page';

// `/community/dm/name-of-the-thing` - the conversation addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const DmBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <DmInner slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default DmBySlug;

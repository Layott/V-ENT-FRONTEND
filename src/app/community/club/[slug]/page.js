'use client';

import { Suspense } from 'react';
import { ClubInner } from '../page';

// `/community/club/name-of-the-thing` - the club addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const ClubBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ClubInner slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default ClubBySlug;

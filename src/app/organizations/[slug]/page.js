'use client';

import { Suspense } from 'react';
import { OrgProfileContent } from '../org-profile/page';

// `/organizations/name-of-the-thing` - the organization addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const OrgProfileBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <OrgProfileContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default OrgProfileBySlug;

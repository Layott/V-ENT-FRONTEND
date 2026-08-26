'use client';

import { Suspense } from 'react';
import { ManageOrgContent } from '../../manage/page';

// `/organizations/name-of-the-thing/manage` - the organization addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const ManageOrgBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ManageOrgContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default ManageOrgBySlug;

'use client';

import { Suspense } from 'react';
import { ManageContent } from '../../my-tournaments/manage/page';

// `/tournaments/naija-weekly/manage` - the organiser tools for one tournament.
const TournamentManageBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ManageContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default TournamentManageBySlug;

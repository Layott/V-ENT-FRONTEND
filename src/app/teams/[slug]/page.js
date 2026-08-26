'use client';

import { Suspense } from 'react';
import { TeamProfileContent } from '../team-profile/page';

// `/teams/lagos-rangers`. The query-string address still works.
const TeamBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <TeamProfileContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default TeamBySlug;

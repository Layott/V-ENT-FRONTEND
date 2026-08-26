'use client';

import { Suspense } from 'react';
import { ViewTournamentContent } from '../view-tournament/page';

// `/tournaments/naija-free-fire-weekly-12` - the same page, addressed by its
// name. The old `/tournaments/view-tournament?id=25` still works, because links
// already shared must keep resolving.
const TournamentBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ViewTournamentContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default TournamentBySlug;

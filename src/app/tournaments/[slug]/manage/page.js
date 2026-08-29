'use client';

import { Suspense } from 'react';
import { ManageContent } from '../../manage/page';

// `/tournaments/naija-weekly/manage` - the organiser console for one tournament.
//
// It used to render the thin Actions page from `my-tournaments/manage`, while
// the console with Match Control, Brackets, Production, Reminders and Player
// stats sat at `/tournaments/manage?id=N` with nothing linking to it. Two
// screens for one tournament, and the half an organiser could reach was the
// smaller half. The Actions page is now the console's first tab.
const TournamentManageBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ManageContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default TournamentManageBySlug;

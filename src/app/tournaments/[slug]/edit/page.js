'use client';

import { Suspense } from 'react';
import { EditTournamentContent } from '../../edit-tournament/page';

// `/tournaments/name-of-the-thing/edit` - the tournament addressed by name
// rather than by a number in a query string. One builder, two addresses: the
// older `?id=` form still resolves, because links already shared have to keep
// working.
const EditTournamentBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <EditTournamentContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default EditTournamentBySlug;

'use client';

import { Suspense } from 'react';
import { RegisterTournamentContent } from '../../register-tournament/page';

// `/tournaments/naija-weekly/register` - registering for a tournament by its name.
const TournamentRegisterBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <RegisterTournamentContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default TournamentRegisterBySlug;

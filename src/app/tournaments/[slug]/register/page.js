'use client';

import { Suspense, use } from 'react';
import { RegisterTournamentContent } from '../../register-tournament/page';

// `/tournaments/naija-weekly/register` - registering for a tournament by its name.
const TournamentRegisterBySlug = props => {
  const params = use(props.params);

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <RegisterTournamentContent slug={decodeURIComponent(params.slug)} />
    </Suspense>
  );
};

export default TournamentRegisterBySlug;

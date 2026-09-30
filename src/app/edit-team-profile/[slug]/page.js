'use client';

import { Suspense, use } from 'react';
import { EditTeamProfileContent } from '../page';

// `/edit-team-profile/lagos-rangers`.
const EditTeamBySlug = props => {
  const params = use(props.params);

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <EditTeamProfileContent slug={decodeURIComponent(params.slug)} />
    </Suspense>
  );
};

export default EditTeamBySlug;

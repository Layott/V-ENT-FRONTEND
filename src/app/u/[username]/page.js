'use client';

import { Suspense } from 'react';
import { UserProfileContent } from '../../user-profile/page';

// `/u/temi` - a person's profile at their username, which is the readable,
// stable address for a person and the one they would give somebody.
const ProfileByUsername = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <UserProfileContent slug={decodeURIComponent(params.username)} />
  </Suspense>
);

export default ProfileByUsername;

'use client';

// The interactive half of `/u/<username>`.
//
// Split out so the route itself can be a server component and describe the
// person in the HTML it sends. This renders exactly what it always did.

import { UserProfileContent } from '../../user-profile/page';

export default function ProfileClient({ username }) {
  return <UserProfileContent slug={username} />;
}

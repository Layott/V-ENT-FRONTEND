'use client'

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => (
  <ComingSoon
    phase="Phase 5"
    title="Anime hub"
    blurb="Manga reading, AMV galleries and co-watch rooms are part of a later phase. Nothing here is live yet."
    alternatives={[
      { href: "/tournaments", label: "Tournaments" },
      { href: "/events", label: "Events" },
    ]}
  />
);

export default Page;

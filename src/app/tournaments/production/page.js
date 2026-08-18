'use client'

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => (
  <ComingSoon
    phase="Milestone 2"
    title="Production panel"
    blurb="Live match control for broadcasts is part of the production milestone and is not connected to a stream yet."
    alternatives={[
      { href: "/tournaments/my-tournaments", label: "My tournaments" },
    ]}
  />
);

export default Page;

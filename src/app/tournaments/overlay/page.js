'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => {
  return <ComingSoon phase="Milestone 2" title="Stream overlay" blurb="The OBS browser-source overlay is part of the production milestone and is not serving live match data yet." alternatives={[{
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;
'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => {
  return <ComingSoon phase="Milestone 2" title="Production hub" blurb="Stream overlays, scene configuration and the OBS pipeline are part of the production milestone. The panels are designed but not connected to a live backend." alternatives={[{
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;
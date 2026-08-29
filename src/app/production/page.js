'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// Stream overlays are BUILT. They are not built here: an overlay belongs to one
// tournament, so it lives on that tournament's own console, under Production.
// This route kept telling visitors the feature did not exist for as long as it
// did exist, which is worse than saying nothing. It now says where to go.
const Page = () => {
  return <ComingSoon phase="Live now" title="Production hub" blurb="Production is run from a tournament rather than from one hub. Open a tournament you run, then the Production tab: upload a designer's HTML overlay, bind it to live standings and rosters, and copy the URL you paste into OBS." alternatives={[{
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;

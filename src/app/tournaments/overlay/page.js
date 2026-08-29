'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// Stream overlays are BUILT. They are not built here: an overlay belongs to one
// tournament, so it lives on that tournament's own console, under Production.
// This route kept telling visitors the feature did not exist for as long as it
// did exist, which is worse than saying nothing. It now says where to go.
const Page = () => {
  return <ComingSoon phase="Live now" title="Stream overlay" blurb="An overlay is driven by one tournament's live data, so it is uploaded on that tournament's console under Production. You get back a URL to paste into an OBS browser source, and the page fills itself from the standings, the rosters and the scores as they change." alternatives={[{
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;

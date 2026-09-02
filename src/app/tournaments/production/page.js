'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// Stream overlays are BUILT. They are not built here: an overlay belongs to one
// tournament, so it lives on that tournament's own console, under Production.
// This route kept telling visitors the feature did not exist for as long as it
// did exist, which is worse than saying nothing. It now says where to go.
const Page = () => {
  return <ComingSoon phase="Live now" title="Production panel" blurb="The studio and the overlays belong to one tournament, so they live on that tournament's console under Production: start a broadcast, copy a URL per graphic into OBS or vMix, put each on air from the console, or upload an overlay of your own. The production page lists everything you run." alternatives={[{
    href: "/production",
    label: "Production"
  }, {
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;

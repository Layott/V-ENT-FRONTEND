'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// Stream overlays are BUILT. They are not built here: an overlay belongs to one
// tournament, so it lives on that tournament's own console, under Production.
// This route kept telling visitors the feature did not exist for as long as it
// did exist, which is worse than saying nothing. It now says where to go.
const Page = () => {
  return <ComingSoon phase="Live now" title="Production panel" blurb="Match control and the broadcast tools belong to one tournament, so they live on that tournament's console rather than on an address of their own. Open a tournament you run and choose Production." alternatives={[{
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;

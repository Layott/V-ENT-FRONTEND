'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => {
  return <ComingSoon phase="Phase 4" title="Marketplace" blurb="Player-to-player listings, offers and escrow are still being built." alternatives={[{
    href: "/wallets",
    label: "Wallet"
  }, {
    href: "/tournaments",
    label: "Tournaments"
  }]} />;
};
export default Page;
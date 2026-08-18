'use client'

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => (
  <ComingSoon
    phase="Phase 3"
    title="V-ENT Shop"
    blurb="The official store - merch, gear and VENT COIN bundles - is still being built."
    alternatives={[
      { href: "/wallets", label: "Wallet" },
    ]}
  />
);

export default Page;

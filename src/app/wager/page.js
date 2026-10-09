'use client'

import ComingSoon from '@/components/coming-soon/ComingSoon';

// This module has no backend yet. It used to render hardcoded sample content,
// which was indistinguishable from real data. The designed layout is preserved
// in docs/wip/ and returns when the API lands.
const Page = () => (
  <ComingSoon
    module="wager"
    alternatives={[
      { href: "/tournaments", label: "Tournaments" },
      { href: "/wallets", label: "Wallet" },
    ]}
  />
);

export default Page;

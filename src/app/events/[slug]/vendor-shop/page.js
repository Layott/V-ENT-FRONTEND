'use client';

import { Suspense } from 'react';
import { VendorShopContent } from '../../vendor-shop/page';

// `/events/name-of-the-thing/vendor-shop` - the event addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
const VendorShopBySlug = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <VendorShopContent slug={decodeURIComponent(params.slug)} />
  </Suspense>
);

export default VendorShopBySlug;

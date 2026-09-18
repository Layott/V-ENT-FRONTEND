'use client';

import { VendorStallContent } from '../../../vendor-shop/vendor/page';

// The same stall screen the query address renders, given the event and the
// stall by name. One builder, two addresses: the screen cannot drift between
// them because there is only one of it.
export default function StallBySlugClient({ eventSlug, stallSlug }) {
  return <VendorStallContent eventSlug={eventSlug} stallSlug={stallSlug} />;
}

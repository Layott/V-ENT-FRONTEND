import { Suspense } from 'react';
import ServedSummary from '@/components/seo/ServedSummary';
import { VendorShopContent } from '../../vendor-shop/page';
import { generateMetadata as describe } from './layout';

// `/events/name-of-the-thing/vendor-shop` - the event addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
//
// A server component since inbox 517, so the served HTML carries the shop's
// name as its h1 and the description its layout gives a search result while
// the shop underneath loads.
const VendorShopBySlug = async props => {
  const params = await props.params;
  const described = await describe(props);

  return (
    <Suspense fallback={<ServedSummary title={described?.title} description={described?.description} />}>
      <VendorShopContent slug={decodeURIComponent(params.slug)} />
    </Suspense>
  );
};

export default VendorShopBySlug;

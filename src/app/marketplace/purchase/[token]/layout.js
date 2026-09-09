import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// An order: what somebody bought, from whom, for how much. Personal by
// definition, so noindex, and in the robots disallow list as well.
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('marketplace-purchase', locale),
    noindex: true,
    // The token is not in the path here: an address that carries somebody's
    // order id has no business in a canonical link.
    path: '/marketplace/purchase',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

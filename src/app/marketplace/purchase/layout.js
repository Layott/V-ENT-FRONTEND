import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// An order: what somebody bought, from whom, for how much. Personal by
// definition, so noindex, and in the robots disallow list as well.
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('marketplace-purchase', locale),
    noindex: true,
    path: '/marketplace/purchase',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

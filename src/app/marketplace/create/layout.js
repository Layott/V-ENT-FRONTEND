import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// Personal, or behind a login. Titled so the browser tab is not blank, and
// noindex because it is of no use in a search result. It is in the robots
// disallow list for the same reason.
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('marketplace-create', locale),
    noindex: true,
    path: '/marketplace/create',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

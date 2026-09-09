import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// An action, not a page anybody should reach from a search result. Titled so
// the browser tab is not blank, and noindex for the same reason the wallet is.
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('logout', locale),
    noindex: true,
    path: '/logout',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

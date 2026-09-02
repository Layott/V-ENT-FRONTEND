import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// A list of what the signed-in person runs, with a way into each console.
// Titled so the browser tab is not blank, and noindex because it is of no use
// in a search result.
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('production', locale),
    noindex: true,
    path: '/production',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

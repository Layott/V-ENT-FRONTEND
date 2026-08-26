import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// Personal, or behind a login. Titled so the browser tab is not blank, and
// noindex because it is of no use in a search result.
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('edit-team-profile', locale),
    noindex: true,
    path: '/edit-team-profile',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

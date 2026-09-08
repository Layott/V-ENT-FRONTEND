import { buildMetadata, currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// Somebody's own memberships and their payment history. Titled so the browser
// tab is not blank, and noindex because it is of no use in a search result and
// would rank a redirect.
//
// The plan pages themselves live at /plans/<name> and ARE public and indexed:
// a price behind a sign-in wall cannot be shared and cannot be read by the one
// person who most needs to see it.

export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({
    title: privateTitle('memberships', locale),
    noindex: true,
    path: '/memberships',
    locale,
  });
}

export default function Layout({ children }) {
  return children;
}

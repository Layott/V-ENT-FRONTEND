import { privateMetadata } from '@/lib/seo';

// Personal, or behind a login. Titled so the browser tab is not blank, and
// noindex because it is no use in a search result.
// Per request rather than a static const, so the locale is known.
export async function generateMetadata() {
  return privateMetadata('Settings');
}

export default function Layout({ children }) {
  return children;
}

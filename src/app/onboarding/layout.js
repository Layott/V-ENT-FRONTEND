import { privateMetadata } from '@/lib/seo';

// Personal, or behind a login. Titled so the browser tab is not blank, and
// noindex because it is no use in a search result.
export const metadata = privateMetadata('Get set up');

export default function Layout({ children }) {
  return children;
}

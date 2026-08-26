import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Search V-ENT',
  description: 'Search tournaments, events, teams and players across V-ENT.',
  path: '/search',
});

export default function Layout({ children }) {
  return children;
}

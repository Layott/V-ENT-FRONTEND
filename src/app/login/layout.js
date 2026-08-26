import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Sign in',
  description: 'Sign in to V-ENT to enter tournaments, buy event tickets and manage your team.',
  path: '/login',
});

export default function Layout({ children }) {
  return children;
}

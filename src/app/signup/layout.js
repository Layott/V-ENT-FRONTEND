import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Create an account',
  description: 'Create a free V-ENT account to enter esports tournaments, buy event tickets, build a team and get paid in VENT COINS.',
  path: '/signup',
});

export default function Layout({ children }) {
  return children;
}

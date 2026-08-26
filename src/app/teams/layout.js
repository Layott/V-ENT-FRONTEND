import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Esports teams',
  description: 'Find a team to join or scout your next opponent. Rosters, the games they play, the tournaments they have entered and how they finished.',
  path: '/teams',
});

export default function Layout({ children }) {
  return children;
}

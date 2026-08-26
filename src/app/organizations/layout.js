import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Esports organizations',
  description: 'The brands that field teams and run tournaments on V-ENT. See who they back, what they run and how to reach them.',
  path: '/organizations',
});

export default function Layout({ children }) {
  return children;
}

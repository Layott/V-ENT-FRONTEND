import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Player and team rankings',
  description: 'Who is actually winning. Rankings built from real tournament results on V-ENT, by game and by region.',
  path: '/rankings',
});

export default function Layout({ children }) {
  return children;
}

import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Privacy policy',
  description: 'What V-ENT collects, why, how long it is kept and how to get it deleted.',
  path: '/privacy-policy',
});

export default function Layout({ children }) {
  return children;
}

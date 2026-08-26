import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Gaming and anime events, with tickets',
  description: 'Find gaming conventions, anime meetups, LAN parties and watch parties across Africa. Buy tickets, get a QR code, and show it at the door.',
  path: '/events',
});

export default function Layout({ children }) {
  return children;
}

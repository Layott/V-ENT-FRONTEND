import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
// generateMetadata, not a static `metadata` const.
//
// A const is evaluated once, at build time, where there is no request and so no
// language - every locale page canonicalised to the English URL, which tells a
// search engine the translated page is a duplicate not worth indexing. This
// runs per request, so buildMetadata() can read the locale middleware set.
export async function generateMetadata() {
  return buildMetadata({
  title: 'Gaming and anime events, with tickets',
  description: 'Find gaming conventions, anime meetups, LAN parties and watch parties across Africa. Buy tickets, get a QR code, and show it at the door.',
  path: '/events',
  });
}

export default function Layout({ children }) {
  return children;
}

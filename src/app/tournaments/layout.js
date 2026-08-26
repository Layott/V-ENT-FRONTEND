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
  title: 'Esports tournaments in Nigeria and across Africa',
  description: 'Browse open esports tournaments, see prize pools in VENT COINS, check entry fees and register your team or yourself. Free Fire, PUBG Mobile, FIFA and more.',
  path: '/tournaments',
  });
}

export default function Layout({ children }) {
  return children;
}

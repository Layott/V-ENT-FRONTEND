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
  title: 'Player and team rankings',
  description: 'Who is actually winning. Rankings built from real tournament results on V-ENT, by game and by region.',
  path: '/rankings',
  });
}

export default function Layout({ children }) {
  return children;
}

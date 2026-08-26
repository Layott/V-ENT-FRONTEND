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
  title: 'Community: posts, forums, clubs and scrims',
  description: 'Talk to other players, argue about the meta in the forums, join a club for your game and find a team to scrim against.',
  path: '/community',
  });
}

export default function Layout({ children }) {
  return children;
}

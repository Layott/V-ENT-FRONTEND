import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Community: posts, forums, clubs and scrims',
  description: 'Talk to other players, argue about the meta in the forums, join a club for your game and find a team to scrim against.',
  path: '/community',
});

export default function Layout({ children }) {
  return children;
}

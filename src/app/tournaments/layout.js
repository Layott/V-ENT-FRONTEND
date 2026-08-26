import { buildMetadata } from '@/lib/seo';

// Metadata for this section. It lives in a layout because the page itself is a
// client component, and a client component cannot export `metadata`.
export const metadata = buildMetadata({
  title: 'Esports tournaments in Nigeria and across Africa',
  description: 'Browse open esports tournaments, see prize pools in VENT COINS, check entry fees and register your team or yourself. Free Fire, PUBG Mobile, FIFA and more.',
  path: '/tournaments',
});

export default function Layout({ children }) {
  return children;
}

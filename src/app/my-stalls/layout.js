// The page itself is a client component and cannot export metadata, so the
// title and the noindex live here. Somebody's own stalls and orders: gated,
// in the robots disallow list, and titled so the tab says what it is
// rather than the site's default line (walk, 18 September 2026).
export const metadata = {
  title: 'My stalls',
  robots: { index: false, follow: false },
};

export default function GatedLayout({ children }) {
  return children;
}

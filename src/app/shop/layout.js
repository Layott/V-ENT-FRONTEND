// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Shop',
  description: 'The V-ENT shop: merchandise and gear for players and teams.',
  alternates: { canonical: 'https://v-ent.co/shop' },
  openGraph: {
    title: 'Shop',
    description: 'The V-ENT shop: merchandise and gear for players and teams.',
    url: 'https://v-ent.co/shop',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop',
    description: 'The V-ENT shop: merchandise and gear for players and teams.',
  },
};

export default function Layout({ children }) {
  return children;
}

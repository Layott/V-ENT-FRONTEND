// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Marketplace',
  description: 'The V-ENT marketplace, where players buy and sell within the community.',
  alternates: { canonical: 'https://v-ent.co/marketplace' },
  openGraph: {
    title: 'Marketplace',
    description: 'The V-ENT marketplace, where players buy and sell within the community.',
    url: 'https://v-ent.co/marketplace',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace',
    description: 'The V-ENT marketplace, where players buy and sell within the community.',
  },
};

export default function Layout({ children }) {
  return children;
}

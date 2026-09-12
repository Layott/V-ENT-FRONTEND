// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every route carries its own, per the SEO
// rule in CLAUDE.md.
//
// NOINDEX: this is one person's own screen. It is of no use in a search
// result and indexing it would rank a redirect to the login page.

export const metadata = {
  title: 'My list',
  description: 'Where you got to in every comic, what you follow, and what you have paid for.',
  alternates: { canonical: 'https://v-ent.co/anime/my-list' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'My list',
    description: 'Where you got to in every comic, what you follow, and what you have paid for.',
    url: 'https://v-ent.co/anime/my-list',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My list',
    description: 'Where you got to in every comic, what you follow, and what you have paid for.',
  },
};

export default function Layout({ children }) {
  return children;
}

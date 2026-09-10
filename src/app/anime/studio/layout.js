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
  title: 'Your comics',
  description: 'Upload chapters, decide what they cost, and write to the people reading them.',
  alternates: { canonical: 'https://v-ent.co/anime/studio' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Your comics',
    description: 'Upload chapters, decide what they cost, and write to the people reading them.',
    url: 'https://v-ent.co/anime/studio',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your comics',
    description: 'Upload chapters, decide what they cost, and write to the people reading them.',
  },
};

export default function Layout({ children }) {
  return children;
}

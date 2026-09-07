// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Clubs',
  description: 'Clubs on V-ENT: groups of players who talk, organise and play together.',
  alternates: { canonical: 'https://v-ent.co/community/club' },
  openGraph: {
    title: 'Clubs',
    description: 'Clubs on V-ENT: groups of players who talk, organise and play together.',
    url: 'https://v-ent.co/community/club',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clubs',
    description: 'Clubs on V-ENT: groups of players who talk, organise and play together.',
  },
};

export default function Layout({ children }) {
  return children;
}

// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Team',
  description: 'A team on V-ENT: its players, the tournaments it has entered, and its record.',
  alternates: { canonical: 'https://v-ent.co/teams/team-profile' },
  openGraph: {
    title: 'Team',
    description: 'A team on V-ENT: its players, the tournaments it has entered, and its record.',
    url: 'https://v-ent.co/teams/team-profile',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Team',
    description: 'A team on V-ENT: its players, the tournaments it has entered, and its record.',
  },
};

export default function Layout({ children }) {
  return children;
}

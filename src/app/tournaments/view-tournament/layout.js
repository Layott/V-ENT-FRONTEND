// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Tournament',
  description: 'A tournament on V-ENT: the format, who is playing, the bracket and the prizes.',
  alternates: { canonical: 'https://v-ent.co/tournaments/view-tournament' },
  openGraph: {
    title: 'Tournament',
    description: 'A tournament on V-ENT: the format, who is playing, the bracket and the prizes.',
    url: 'https://v-ent.co/tournaments/view-tournament',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tournament',
    description: 'A tournament on V-ENT: the format, who is playing, the bracket and the prizes.',
  },
};

export default function Layout({ children }) {
  return children;
}

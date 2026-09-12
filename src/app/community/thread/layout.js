// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Discussions',
  description: 'Discussions from the V-ENT community: tactics, results, teams and events.',
  alternates: { canonical: 'https://v-ent.co/community/thread' },
  openGraph: {
    title: 'Discussions',
    description: 'Discussions from the V-ENT community: tactics, results, teams and events.',
    url: 'https://v-ent.co/community/thread',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discussions',
    description: 'Discussions from the V-ENT community: tactics, results, teams and events.',
  },
};

export default function Layout({ children }) {
  return children;
}

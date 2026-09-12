// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Wager',
  description: 'Wagering on V-ENT. Not open yet; this page says where it has got to.',
  alternates: { canonical: 'https://v-ent.co/wager' },
  openGraph: {
    title: 'Wager',
    description: 'Wagering on V-ENT. Not open yet; this page says where it has got to.',
    url: 'https://v-ent.co/wager',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wager',
    description: 'Wagering on V-ENT. Not open yet; this page says where it has got to.',
  },
};

export default function Layout({ children }) {
  return children;
}

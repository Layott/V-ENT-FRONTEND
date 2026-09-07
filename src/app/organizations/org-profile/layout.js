// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Organisation',
  description: 'An organisation on V-ENT: the tournaments and events it runs, and its teams.',
  alternates: { canonical: 'https://v-ent.co/organizations/org-profile' },
  openGraph: {
    title: 'Organisation',
    description: 'An organisation on V-ENT: the tournaments and events it runs, and its teams.',
    url: 'https://v-ent.co/organizations/org-profile',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organisation',
    description: 'An organisation on V-ENT: the tournaments and events it runs, and its teams.',
  },
};

export default function Layout({ children }) {
  return children;
}

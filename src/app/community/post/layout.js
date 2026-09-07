// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Posts',
  description: 'What players on V-ENT are posting about their matches, teams and events.',
  alternates: { canonical: 'https://v-ent.co/community/post' },
  openGraph: {
    title: 'Posts',
    description: 'What players on V-ENT are posting about their matches, teams and events.',
    url: 'https://v-ent.co/community/post',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Posts',
    description: 'What players on V-ENT are posting about their matches, teams and events.',
  },
};

export default function Layout({ children }) {
  return children;
}

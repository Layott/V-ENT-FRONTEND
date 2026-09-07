// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Anime',
  description: 'Anime on V-ENT: what is coming, and the community around it.',
  alternates: { canonical: 'https://v-ent.co/anime' },
  openGraph: {
    title: 'Anime',
    description: 'Anime on V-ENT: what is coming, and the community around it.',
    url: 'https://v-ent.co/anime',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anime',
    description: 'Anime on V-ENT: what is coming, and the community around it.',
  },
};

export default function Layout({ children }) {
  return children;
}

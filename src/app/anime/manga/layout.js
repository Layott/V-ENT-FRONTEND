// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every route carries its own, per the SEO
// rule in CLAUDE.md.

export const metadata = {
  title: 'Comics',
  description: 'Manga, manhwa and webcomics uploaded by people on V-ENT. Search by genre, rating and status.',
  alternates: { canonical: 'https://v-ent.co/anime/manga' },
  openGraph: {
    title: 'Comics',
    description: 'Manga, manhwa and webcomics uploaded by people on V-ENT. Search by genre, rating and status.',
    url: 'https://v-ent.co/anime/manga',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comics',
    description: 'Manga, manhwa and webcomics uploaded by people on V-ENT. Search by genre, rating and status.',
  },
};

export default function Layout({ children }) {
  return children;
}

// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every route carries its own, per the SEO
// rule in CLAUDE.md.

export const metadata = {
  title: 'Reading rooms',
  description: 'Rooms where people read the same comic at the same time on V-ENT, with the pages in step and a chat beside them.',
  alternates: { canonical: 'https://v-ent.co/anime/rooms' },
  openGraph: {
    title: 'Reading rooms',
    description: 'Rooms where people read the same comic at the same time on V-ENT, with the pages in step and a chat beside them.',
    url: 'https://v-ent.co/anime/rooms',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reading rooms',
    description: 'Rooms where people read the same comic at the same time on V-ENT, with the pages in step and a chat beside them.',
  },
};

export default function Layout({ children }) {
  return children;
}

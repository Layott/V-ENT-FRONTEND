// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every route carries its own, per the SEO
// rule in CLAUDE.md.

export const metadata = {
  title: 'Character battles',
  description: 'Nominate an anime character, score their strength, speed, intelligence, durability and technique, and the average of every vote decides who wins.',
  alternates: { canonical: 'https://v-ent.co/anime/battles' },
  openGraph: {
    title: 'Character battles',
    description: 'Nominate an anime character, score their strength, speed, intelligence, durability and technique, and the average of every vote decides who wins.',
    url: 'https://v-ent.co/anime/battles',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Character battles',
    description: 'Nominate an anime character, score their strength, speed, intelligence, durability and technique, and the average of every vote decides who wins.',
  },
};

export default function Layout({ children }) {
  return children;
}

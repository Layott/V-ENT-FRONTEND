// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Stall',
  description: 'A stall at a V-ENT event, and what it sells.',
  alternates: { canonical: 'https://v-ent.co/events/vendor-shop/vendor' },
  openGraph: {
    title: 'Stall',
    description: 'A stall at a V-ENT event, and what it sells.',
    url: 'https://v-ent.co/events/vendor-shop/vendor',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stall',
    description: 'A stall at a V-ENT event, and what it sells.',
  },
};

export default function Layout({ children }) {
  return children;
}

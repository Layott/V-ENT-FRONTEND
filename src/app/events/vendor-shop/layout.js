// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Stalls',
  description: 'The stalls trading at this event, and what each of them sells.',
  alternates: { canonical: 'https://v-ent.co/events/vendor-shop' },
  openGraph: {
    title: 'Stalls',
    description: 'The stalls trading at this event, and what each of them sells.',
    url: 'https://v-ent.co/events/vendor-shop',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stalls',
    description: 'The stalls trading at this event, and what each of them sells.',
  },
};

export default function Layout({ children }) {
  return children;
}

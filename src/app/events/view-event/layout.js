// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
export const metadata = {
  title: 'Event',
  description: 'An event on V-ENT: what is on, where it is, and how to get a ticket.',
  alternates: { canonical: 'https://v-ent.co/events/view-event' },
  openGraph: {
    title: 'Event',
    description: 'An event on V-ENT: what is on, where it is, and how to get a ticket.',
    url: 'https://v-ent.co/events/view-event',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Event',
    description: 'An event on V-ENT: what is on, where it is, and how to get a ticket.',
  },
};

export default function Layout({ children }) {
  return children;
}

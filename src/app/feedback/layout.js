// The page is a client component and cannot export metadata, so it lives here.
export const metadata = {
  title: 'Send feedback',
  description: 'Tell us what broke, what confused you, or what is missing. No account needed.',
  alternates: { canonical: 'https://v-ent.co/feedback' },
  openGraph: {
    title: 'Send feedback',
    description: 'Tell us what broke, what confused you, or what is missing.',
    url: 'https://v-ent.co/feedback',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Send feedback',
    description: 'Tell us what broke, what confused you, or what is missing.',
  },
};

export default function FeedbackLayout({ children }) {
  return children;
}

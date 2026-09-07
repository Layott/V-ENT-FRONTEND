// The page is a client component and cannot export metadata, so it lives here.
export const metadata = {
  title: 'Pricing',
  description: 'V-ENT is free to use today. What will cost money later, what stays free, and the one thing we will never do.',
  alternates: { canonical: 'https://v-ent.co/pricing' },
  openGraph: {
    title: 'Pricing',
    description: 'V-ENT is free to use today. What will cost money later, and what stays free.',
    url: 'https://v-ent.co/pricing',
    siteName: 'V-ENT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing',
    description: 'V-ENT is free to use today. What will cost money later, and what stays free.',
  },
};

export default function PricingLayout({ children }) {
  return children;
}

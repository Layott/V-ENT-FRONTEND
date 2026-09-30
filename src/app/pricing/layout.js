import { buildMetadata, currentLocale } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';
// The page is a client component and cannot export metadata, so it lives here.
// In the reader's language, with the language alternates and share cards
// built by buildMetadata; this was one English const for every reader
// (inbox 375).
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({ ...sectionCopy('pricing', locale), path: '/pricing', locale });
}

export default function PricingLayout({ children }) {
  return children;
}

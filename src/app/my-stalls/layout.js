import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
// The page itself is a client component and cannot export metadata, so the
// title and the noindex live here. Somebody's own stalls and orders: gated,
// in the robots disallow list, and titled so the tab says what it is
// rather than the site's default line (walk, 18 September 2026).
// In the reader's language: a const is evaluated once, with no request
// and so no language, and every reader got the English title (inbox 375).
export async function generateMetadata() {
  const locale = currentLocale();
  return {
    title: privateTitle('my-stalls', locale),
    robots: { index: false, follow: false },
  };
}

export default function GatedLayout({ children }) {
  return children;
}

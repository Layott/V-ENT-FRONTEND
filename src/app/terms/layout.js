import { buildMetadata, currentLocale } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';

// Same reasoning as the privacy policy's layout: a function rather than a
// const, because a const is evaluated once at build time where there is no
// request and therefore no language.
export async function generateMetadata() {
  const locale = currentLocale();
  const copy = sectionCopy('terms', locale);
  return buildMetadata({ ...copy, path: '/terms', locale });
}

export default function Layout({ children }) {
  return children;
}

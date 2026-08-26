import { buildMetadata, currentLocale } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';

// Metadata for this section, in whichever language the request is being served.
// It lives in a layout because the page is a client component and a client
// component cannot export `metadata`; it is a function rather than a const
// because a const is evaluated once at build time, where there is no request
// and therefore no language.
export async function generateMetadata() {
  const locale = currentLocale();
  const copy = sectionCopy('rankings', locale);
  return buildMetadata({ ...copy, path: '/rankings', locale });
}

export default function Layout({ children }) {
  return children;
}

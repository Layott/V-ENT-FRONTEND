import { buildMetadata, currentLocale } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';

// Metadata for this section, in whichever language the request is being served.
// It lives in a layout because the page is a client component and a client
// component cannot export `metadata`; it is a function rather than a const
// because a const is evaluated once at build time, where there is no request
// and therefore no language.
export async function generateMetadata() {
  const locale = await currentLocale();
  const copy = sectionCopy('search', locale);
  // noindex (inbox 461, 16 October 2026): search results: a page per query, which Google asks sites not to have indexed. It told search engines to
  // index it, with itself as the canonical, which is a thin copy competing
  // with the real page.
  return buildMetadata({ ...copy, path: '/search', locale, noindex: true });
}

export default function Layout({ children }) {
  return children;
}

import { buildMetadata, currentLocale } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';

// /circuits, described in the language the request is served in (P5). A
// layout because the page is a client component and cannot export metadata.
export async function generateMetadata() {
  const locale = await currentLocale();
  const copy = sectionCopy('circuits', locale);
  return buildMetadata({ ...copy, path: '/circuits', locale });
}

export default function Layout({ children }) {
  return children;
}

import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
// The page itself is a client component and cannot export metadata, so the
// noindex lives here.
//
// This URL carries a ticket code. Indexing one would put somebody's admission
// in a search result, so it is excluded here as well as in robots.js: a
// disallow asks a crawler not to fetch the page, and this tells anything that
// fetched it anyway not to keep it.
// In the reader's language: a const is evaluated once, with no request
// and so no language, and every reader got the English title (inbox 375).
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('events/check-in/[code]', locale),
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function CheckInLayout({ children }) {
  return children;
}

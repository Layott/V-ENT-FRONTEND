import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// This route only looks public. It carries a one-time token, somebody's own
// invitation, a private conversation, a sign-in hand-off or a browser source,
// so it is noindex here as well as disallowed in robots.js: a disallow asks a
// crawler not to fetch it, and this tells anything that fetched it anyway not
// to keep it.
// In the reader's language: a const is evaluated once, with no request
// and so no language, and every reader got the English title (inbox 375).
export async function generateMetadata() {
  const locale = currentLocale();
  return {
    title: privateTitle('community/thread/[slug]', locale),
    robots: { index: false, follow: false },
  };
}

export default function Layout({ children }) {
  return children;
}

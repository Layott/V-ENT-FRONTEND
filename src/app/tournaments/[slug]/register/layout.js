import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
// The page itself is a client component and cannot export metadata, so the
// noindex lives here.
//
// This route is for somebody signed in and doing something, so it has nothing to offer a search result and should not appear in one.
//
// The house rule allows exactly two states for a route: public with real
// metadata, or noindex AND in the robots disallow list. There is no third
// option, and this route was in it.
export async function generateMetadata() {
  // Titled in the reader's language: this said 'Manage' or 'Register' in
  // English to everybody (walk, 29 September 2026).
  const locale = await currentLocale();
  return {
    title: privateTitle('register', locale),
    robots: { index: false, follow: false },
  };
}

export default function GatedLayout({ children }) {
  return children;
}

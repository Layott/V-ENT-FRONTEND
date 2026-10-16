import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// The page is a client component and cannot export metadata, so the noindex
// lives here. Somebody's own invitations: nothing for a search result
// (inbox 455). Also in the robots disallow list.
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('invitations', locale),
    robots: { index: false, follow: false },
  };
}

export default function InvitationsLayout({ children }) {
  return children;
}

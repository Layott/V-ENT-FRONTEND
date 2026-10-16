import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// One invitation, opened from its emailed link (inbox 455). Its token is the
// only thing that finds it, so it is never indexed.
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('invitations/token', locale),
    robots: { index: false, follow: false },
  };
}

export default function InvitationLayout({ children }) {
  return children;
}

import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// A studio's own games, their secrets and their keys: behind a sign-in and of
// no use in a search result. Noindex here and disallowed in robots.js, the
// only two states a route may have. The public guide for studios is
// /partners/docs, which is what an integrator searches for.
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('partners/studios', locale),
    robots: { index: false, follow: false },
  };
}

export default function StudiosLayout({ children }) {
  return children;
}

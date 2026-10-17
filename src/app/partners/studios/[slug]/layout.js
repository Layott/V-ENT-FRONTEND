import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// One studio game's settings: its secret, its keys, its webhooks. Private,
// so noindex here as well as disallowed in robots.js (`/partners/studios`).
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('partners/studios', locale),
    robots: { index: false, follow: false },
  };
}

export default function StudioGameLayout({ children }) {
  return children;
}

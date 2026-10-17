import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// Typing a code a game showed you, to link that game account to your V-ENT
// account. An action for somebody signed in, of no use in a search result:
// noindex here and disallowed in robots.js.
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('link-game', locale),
    robots: { index: false, follow: false },
  };
}

export default function LinkGameLayout({ children }) {
  return children;
}

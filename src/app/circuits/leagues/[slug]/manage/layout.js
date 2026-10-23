import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// Running a league is for somebody signed in and doing something: never
// indexed, and disallowed in robots.js (/circuits/*/manage). Overrides the
// public league's metadata from the layout above it.
export async function generateMetadata() {
  const locale = await currentLocale();
  return {
    title: privateTitle('manage', locale),
    robots: { index: false, follow: false },
  };
}

export default function GatedLayout({ children }) {
  return children;
}

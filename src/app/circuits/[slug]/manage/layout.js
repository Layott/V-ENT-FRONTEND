import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';

// The organiser screen is for somebody signed in and doing something: never
// indexed, and in the robots disallow list (the house rule allows public with
// real metadata, or noindex and disallowed; nothing in between). This
// overrides the public circuit's metadata from the layout above it.
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

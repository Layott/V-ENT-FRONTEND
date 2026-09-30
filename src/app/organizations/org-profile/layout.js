import { buildMetadata, currentLocale } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';
// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every public route carries its own, per
// the SEO rule in CLAUDE.md.
// In the reader's language, with the language alternates and share cards
// built by buildMetadata; this was one English const for every reader
// (inbox 375).
export async function generateMetadata() {
  const locale = currentLocale();
  return buildMetadata({ ...sectionCopy('organizations/org-profile', locale), path: '/organizations/org-profile', locale });
}

export default function Layout({ children }) {
  return children;
}

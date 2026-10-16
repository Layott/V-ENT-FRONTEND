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
  const locale = await currentLocale();
  // noindex (inbox 461, 16 October 2026): the old ?id= address of an event; it forwards to /events/<slug>, which is the page to rank. It told search engines to
  // index it, with itself as the canonical, which is a thin copy competing
  // with the real page.
  return buildMetadata({ ...sectionCopy('events/view-event', locale), path: '/events/view-event', locale, noindex: true });
}

export default function Layout({ children }) {
  return children;
}

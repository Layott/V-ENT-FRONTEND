import { currentLocale } from '@/lib/seo';
import { privateTitle } from '@/lib/seoCopy';
import { recordCopy } from '@/lib/seoRecordCopy';
// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// A description that could describe any page ranks for nothing, so this one
// says what is actually on this page. Every route carries its own, per the SEO
// rule in CLAUDE.md.
//
// NOINDEX: this is one person's own screen. It is of no use in a search
// result and indexing it would rank a redirect to the login page.

// In the reader's language: a const is evaluated once, with no request
// and so no language, and every reader got the English title (inbox 375).
export async function generateMetadata() {
  const locale = await currentLocale();
  const title = privateTitle('anime/my-list', locale);
  const description = recordCopy(locale).t('private.animeList');
  return {
    title,
    description,
    alternates: { canonical: 'https://v-ent.co/anime/my-list' },
    robots: { index: false, follow: false },
    openGraph: { title, description, url: 'https://v-ent.co/anime/my-list', siteName: 'V-ENT', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function Layout({ children }) {
  return children;
}

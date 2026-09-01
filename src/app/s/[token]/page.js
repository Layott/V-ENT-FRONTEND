import { redirect } from 'next/navigation';
import { buildMetadata, fetchForMetadata } from '@/lib/seo';
import ShortLinkMissing from './ShortLinkMissing';

// `/s/k7m2qp` - a shortened ticket link.
//
// CEO, 1 September: "add an option for people to be able to shorten their
// ticket links, so you create very short versions of the ticket links."
//
// A server component, so the redirect happens before anything is painted. A
// client-side version would send a blank page, wait for React, wait for the
// fetch and only then move, which somebody arriving from a printed flyer reads
// as a dead link, and which a link preview cannot follow at all.
//
// The backend answers with the path rather than redirecting itself. It is the
// only side that knows a token, and this is the only side that knows what a
// frontend URL is. Same division as a renamed slug answering `{status:'moved'}`.

export const dynamic = 'force-dynamic';

// Never indexed. These are addresses for sharing, not pages: indexing one would
// put a second URL in search results for a page that already has its own, which
// splits the ranking between the two.
export const metadata = buildMetadata({
  title: 'Short link',
  description: 'Opening a V-ENT link.',
  path: '/s',
  noindex: true,
});

export default async function ShortLinkPage({ params }) {
  const token = String(params?.token || '').trim();
  // No revalidate. A link that has been switched off has to stop working now,
  // and a cached answer would keep it alive for the length of the window.
  const data = token
    ? await fetchForMetadata(`/s/${encodeURIComponent(token)}/`, { revalidate: 0 })
    : null;

  const target = data?.target;
  // Checked here as well as at the API. An open redirect is worth refusing
  // twice, and this is the side that actually performs the navigation.
  if (target && target.startsWith('/') && !target.startsWith('//')
      && !target.startsWith('/\\')) {
    redirect(target);
  }

  return <ShortLinkMissing token={token} />;
}

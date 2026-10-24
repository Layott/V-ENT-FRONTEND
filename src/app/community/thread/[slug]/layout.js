import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, currentLocale, fetchRecordForMetadata, threadLd, threadMetadata } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';
import { toSlugAddress } from '@/lib/slugAddress';

// `/community/thread/name-of-the-thread`: a forum thread, which is public content.
//
// This layout used to carry the boilerplate written for the private token
// routes beside it: a generic title and noindex on every thread. Those routes
// only look public and need that treatment. A thread is what somebody searches
// for, and the forum links to every one, so it is described here from its own
// record, in the reader's language, with its DiscussionForumPosting JSON-LD,
// the same way an organisation profile is. Replying still needs an account, and
// the reply box says so.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/thread/${encodeURIComponent(slug)}/`);
const pick = (data) => (data?.__moved || data?.__failed ? data : (data?.thread || data));

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  await toSlugAddress(slug, pick(raw), '/community/thread');
  return threadMetadata(raw, slug);
}

export default async function Layout(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const thread = pick(await load(slug));
  if (thread?.__moved) redirect(thread.__moved);
  // Opened by its number: the address bar gets the name.
  await toSlugAddress(slug, thread, '/community/thread');
  const path = `/community/thread/${thread?.slug || slug}`;
  const locale = await currentLocale();

  return (
    <>
      <JsonLd
        data={[
          threadLd(thread, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: sectionCopy('community/thread', locale)?.title, path: '/community' },
            { name: thread?.title, path },
          ]),
        ]}
      />
      {props.children}
    </>
  );
}

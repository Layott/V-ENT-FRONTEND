import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, clamp, currentLocale, fetchRecordForMetadata, postLd, postMetadata } from '@/lib/seo';
import { sectionCopy } from '@/lib/seoCopy';
import { toSlugAddress } from '@/lib/slugAddress';

// `/community/post/name-of-the-post`: a feed post, which is public content.
//
// This layout used to carry the boilerplate written for the private token
// routes beside it: a generic title and noindex on every post. Those routes
// only look public and need that treatment. A post is public and is what
// somebody shares, so it is described here from its own record, in the reader's
// language, with its SocialMediaPosting JSON-LD, the same way an organisation
// profile is. Commenting still needs an account, and the box says so.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/post/${encodeURIComponent(slug)}/`);
const pick = (data) => (data?.__moved || data?.__failed ? data : (data?.post || data));

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  await toSlugAddress(slug, pick(raw), '/community/post');
  return postMetadata(raw, slug);
}

export default async function Layout(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const post = pick(await load(slug));
  if (post?.__moved) redirect(post.__moved);
  // Opened by its number: the address bar gets the name.
  await toSlugAddress(slug, post, '/community/post');
  const path = `/community/post/${post?.slug || slug}`;
  const locale = await currentLocale();

  return (
    <>
      <JsonLd
        data={[
          postLd(post, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: sectionCopy('community/post', locale)?.title, path: '/community' },
            { name: clamp(post?.body, 70), path },
          ]),
        ]}
      />
      {props.children}
    </>
  );
}

import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, fetchRecordForMetadata, orgLd, orgMetadata } from '@/lib/seo';

// `/organizations/avalanche-gaming`: an organisation's public profile.
//
// Until 30 September 2026 this layout said the route "only looks public",
// carried the boilerplate written for token routes, and marked every
// organisation noindex with the title "Organisation", while sitemap.js listed
// each one for crawling. Two opposite instructions, and the page lost: no
// organisation profile could be found in a search. An organisation page is
// content (the hard rule: public by default, gate the action), so it is
// described here from its own record, in the reader's language, with its
// Organization JSON-LD. The manage screen underneath stays private in robots.js.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/organization/${encodeURIComponent(slug)}/`);
const pick = (data) => (data?.__moved || data?.__failed ? data : (data?.organization || data));

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  return orgMetadata(await load(slug), slug);
}

export default async function Layout(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const org = pick(await load(slug));
  if (org?.__moved) redirect(org.__moved);
  const path = `/organizations/${org?.slug || slug}`;

  return (
    <>
      <JsonLd
        data={[
          orgLd(org, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Organizations', path: '/organizations' },
            { name: org?.name || 'Organization', path },
          ]),
        ]}
      />
      {props.children}
    </>
  );
}

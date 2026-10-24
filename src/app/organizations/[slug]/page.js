import { Suspense } from 'react';
import ServedSummary from '@/components/seo/ServedSummary';
import { orgMetadata, fetchRecordForMetadata } from '@/lib/seo';
import { OrgProfileContent } from '../org-profile/page';

// `/organizations/name-of-the-thing` - the organization addressed by name rather than by a number in a query
// string. The old `?id=` address still resolves, because links already shared
// have to keep working.
//
// A server component since inbox 517, so the served HTML carries the
// organisation's name as its h1 and the description its layout gives a search
// result, while the profile underneath loads. The record is the one the layout
// already fetched (the same request, answered once).
const load = (slug) => fetchRecordForMetadata(`/organization/${encodeURIComponent(slug)}/`);
const pick = (data) => (data?.__moved || data?.__failed ? data : (data?.organization || data));

const OrgProfileBySlug = async props => {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  const org = pick(raw);
  const described = await orgMetadata(raw, slug);

  return (
    <Suspense fallback={<ServedSummary title={org?.name} description={described?.description} />}>
      <OrgProfileContent slug={slug} />
    </Suspense>
  );
};

export default OrgProfileBySlug;

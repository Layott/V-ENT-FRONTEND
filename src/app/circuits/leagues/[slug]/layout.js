import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, fetchRecordForMetadata, leagueLd, leagueMetadata } from '@/lib/seo';
import { toSlugAddress } from '@/lib/slugAddress';

// `/circuits/leagues/naija-fc-league`: a league's public page (P5d), every
// division of its season with who goes up and down.
//
// The same server layout as a circuit's page: it reads the league to describe
// it and to publish its divisions as an ItemList, sends a renamed league to
// its new address before the first paint, and renders the client page
// underneath. The organiser screen under it is noindex (manage/layout.js) and
// in robots.js through /circuits/*/manage.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/circuits/leagues/${encodeURIComponent(slug)}/`);

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const data = await load(slug);
  await toSlugAddress(slug, data?.league, '/circuits/leagues', await props.searchParams);
  return leagueMetadata(data, slug);
}

export default async function Layout(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const data = await load(slug);
  if (data?.__moved) redirect(data.__moved);
  await toSlugAddress(slug, data?.league, '/circuits/leagues', await props.searchParams);
  const path = `/circuits/leagues/${data?.league?.slug || slug}`;
  return (
    <>
      <JsonLd
        data={[
          leagueLd(data, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Circuits', path: '/circuits' },
            { name: data?.league?.name || 'League', path },
          ]),
        ]}
      />
      {props.children}
    </>
  );
}

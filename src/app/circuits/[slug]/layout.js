import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, circuitLd, circuitMetadata, fetchRecordForMetadata } from '@/lib/seo';
import { toSlugAddress } from '@/lib/slugAddress';

// `/circuits/naija-fc-season-1`: a circuit's public page (P5).
//
// A server layout in front of the client page, as every record page here
// has: it reads the circuit on the server to describe it (title, description,
// canonical, hreflang, preview card) and to publish its ranking as an
// ItemList, then renders the page underneath untouched. A renamed circuit is
// sent to its new address before the first paint. The organiser screen under
// it overrides this with noindex (manage/layout.js) and is in robots.js.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/circuits/${encodeURIComponent(slug)}/`);

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const data = await load(slug);
  await toSlugAddress(slug, data?.circuit, '/circuits', await props.searchParams);
  return circuitMetadata(data, slug);
}

export default async function Layout(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const data = await load(slug);
  if (data?.__moved) redirect(data.__moved);
  // Any other form of the address goes to the circuit's own name.
  await toSlugAddress(slug, data?.circuit, '/circuits', await props.searchParams);
  const path = `/circuits/${data?.circuit?.slug || slug}`;
  return (
    <>
      <JsonLd
        data={[
          circuitLd(data, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Circuits', path: '/circuits' },
            { name: data?.circuit?.name || 'Circuit', path },
          ]),
        ]}
      />
      {props.children}
    </>
  );
}

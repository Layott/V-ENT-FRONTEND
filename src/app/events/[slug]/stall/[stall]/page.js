import { Suspense } from 'react';
import { buildMetadata, clamp, fetchRecordForMetadata, unavailableMetadata } from '@/lib/seo';
import StallBySlugClient from './StallBySlugClient';

// `/events/lagos-anime-con/stall/suya-corner` - one stall at one event, by
// name. It was `/events/vendor-shop/vendor?event=..&vendor=..` with a static
// title ("Stall") and ONE canonical for every stall on the platform, so a
// crawler read every stall as a duplicate of one page (walk, 18 September
// 2026). The record describes the page now; the query address still resolves.

export const revalidate = 900;

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const stall = decodeURIComponent(params.stall);
  const path = `/events/${slug}/stall/${stall}`;
  const got = await fetchRecordForMetadata(
    `/event/${encodeURIComponent(slug)}/vendor/${encodeURIComponent(stall)}/`);
  if (got?.__failed) return unavailableMetadata(stall, path);
  const vendor = got?.vendor || null;
  if (!vendor) {
    return buildMetadata({
      title: 'Stall not found',
      description: 'This stall does not exist, or it has closed.',
      path,
      noindex: true,
    });
  }
  const eventData = await fetchRecordForMetadata(
    `/event/view-event/${encodeURIComponent(slug)}/`);
  const eventName = eventData?.event?.name || eventData?.name || '';
  const products = Array.isArray(vendor.products) ? vendor.products : [];
  const sells = products.slice(0, 4).map((p) => p.name).filter(Boolean).join(', ');
  const title = eventName ? `${vendor.name} at ${eventName}` : vendor.name;
  const description = clamp(
    vendor.description
    || (sells ? `${vendor.name} sells ${sells}${eventName ? ` at ${eventName}` : ''}. Order before you arrive and collect at the booth.`
      : `${vendor.name}${eventName ? ` at ${eventName}` : ''}${vendor.booth ? `, booth ${vendor.booth}` : ''}. What they sell and how to order.`),
    155);
  const open = vendor.status === 'approved' || vendor.status === 'live';
  return buildMetadata({
    title,
    description,
    path,
    image: vendor.banner || vendor.logo || null,
    noindex: !open,
  });
}

export default async function StallBySlugPage(props) {
  const params = await props.params;
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <StallBySlugClient
        eventSlug={decodeURIComponent(params.slug)}
        stallSlug={decodeURIComponent(params.stall)}
      />
    </Suspense>
  );
}

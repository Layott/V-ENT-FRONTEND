import { Suspense } from 'react';
import { buildMetadata, clamp, fetchRecordForMetadata, unavailableMetadata, missingMetadata, currentLocale } from '@/lib/seo';
import StallBySlugClient from './StallBySlugClient';
import { recordCopy } from '@/lib/seoRecordCopy';

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
  if (!vendor) return missingMetadata('stall', path);
  const locale = await currentLocale();
  const { t } = recordCopy(locale);
  const eventData = await fetchRecordForMetadata(
    `/event/view-event/${encodeURIComponent(slug)}/`);
  const eventName = eventData?.event?.name || eventData?.name || '';
  const products = Array.isArray(vendor.products) ? vendor.products : [];
  const sells = products.slice(0, 4).map((p) => p.name).filter(Boolean).join(', ');
  const vars = { stall: vendor.name, event: eventName, items: sells };
  const title = eventName ? t('stall.at', vars) : vendor.name;
  const description = clamp(
    vendor.description
    || (sells ? t(eventName ? 'stall.sellsAt' : 'stall.sells', vars)
      : t(eventName ? 'stall.plainAt' : 'stall.plain', vars)),
    155);
  const open = vendor.status === 'approved' || vendor.status === 'live';
  return buildMetadata({
    title,
    description,
    path,
    locale,
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

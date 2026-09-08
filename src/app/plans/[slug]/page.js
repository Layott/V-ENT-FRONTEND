import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import {
  SITE, absolute, breadcrumbLd, buildMetadata, clamp, currentLocale,
  fetchForMetadata,
} from '@/lib/seo';
import PlanPageClient from './PlanPageClient';

// `/plans/inner-circle` - one membership an organiser sells.
//
// A server component, for the same reason the tournament route is one: the
// page underneath is `'use client'` and loads in an effect, so the HTML the
// server sends would carry no title, no price and no description. Every plan
// would look identical to a crawler and every shared link would preview as the
// generic site card.
//
// Public, deliberately. A price behind a sign-in wall cannot rank, cannot be
// shared and cannot be read by somebody deciding whether to join, which is the
// whole audience for this page. Subscribing is the action, and that is gated.

export const revalidate = 900;

const load = (slug) => fetchForMetadata(`/billing/plan/${encodeURIComponent(slug)}/`);

const priceSentence = (plan) => {
  if (!plan) return '';
  if (plan.is_free) return 'Free to join.';
  const per = plan.interval === 'yearly' ? 'a year' : 'a month';
  // Said plainly and once, with both units, because a badge reading "5 VC"
  // assumes the reader knows what a VENT COIN is. A model reading this page
  // needs the number and the unit in the same sentence.
  //
  // en-NG explicitly, not the reader's locale: this string is the English
  // description and metadata is built on the server, where there is no reader
  // to ask. `toLocaleString()` with no argument would take the SERVER's
  // language, which is the fault check-datetime exists for.
  const ngn = Number(plan.price_ngn || 0).toLocaleString('en-NG');
  return `${plan.price_vc} VENT COINS ${per}, which is ${ngn} NGN.`;
};

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const locale = currentLocale();
  const plan = await load(slug);

  if (!plan || plan.__moved) {
    return buildMetadata({
      title: 'Membership not found',
      description: 'This membership does not exist, or it is no longer offered.',
      path: `/plans/${slug}`,
      noindex: true,
      locale,
    });
  }

  const seller = plan.seller?.name || SITE.name;
  return buildMetadata({
    title: `${plan.name} - membership from ${seller}`,
    description: clamp(
      `${plan.tagline || plan.description || `A membership from ${seller} on V-ENT.`} `
      + priceSentence(plan),
    ),
    path: `/plans/${plan.slug || slug}`,
    type: 'website',
    // A draft is not offered to anybody, so it is not offered to a crawler
    // either. It cannot be reached without being the organiser, and this is
    // the belt to that brace.
    noindex: plan.status !== 'public',
    locale,
  });
}

/** schema.org, built from real fields or not at all. Invalid structured data
 *  is penalised; an absent block costs nothing. */
const planLd = (plan, path) => {
  if (!plan?.name || plan.status !== 'public') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: plan.name,
    description: plan.tagline || plan.description || undefined,
    serviceType: 'Membership',
    url: absolute(path),
    provider: plan.seller?.name
      ? { '@type': 'Organization', name: plan.seller.name }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: plan.price_ngn,
      priceCurrency: 'NGN',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.price_ngn,
        priceCurrency: 'NGN',
        billingDuration: 1,
        billingIncrement: 1,
        unitCode: plan.interval === 'yearly' ? 'ANN' : 'MON',
      },
    },
  };
};

const PlanBySlug = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const plan = await load(slug);

  // Renamed: send the browser to the current address before rendering, so the
  // address bar is right on the first paint rather than correcting itself a
  // moment later.
  if (plan?.__moved) redirect(plan.__moved);

  const path = `/plans/${plan?.slug || slug}`;

  return (
    <>
      <JsonLd
        data={[
          planLd(plan, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            ...(plan?.seller?.org_slug
              ? [{ name: plan.seller.name,
                   path: `/organizations/${plan.seller.org_slug}` }]
              : []),
            { name: plan?.name || 'Membership', path },
          ]),
        ]}
      />
      <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
        <PlanPageClient slug={slug} />
      </Suspense>
    </>
  );
};

export default PlanBySlug;

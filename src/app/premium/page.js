import JsonLd from '@/components/seo/JsonLd';
import {
  SITE, absolute, breadcrumbLd, buildMetadata, clamp, currentLocale,
  fetchForMetadata,
} from '@/lib/seo';
import PremiumClient from './PremiumClient';

// `/premium` - what V-ENT premium is, what it costs, and how to switch it on.
//
// A server component, because the page underneath is `'use client'` and loads
// in an effect: the HTML a crawler or a link preview receives would otherwise
// carry no title, no price and no list of what is included.
//
// Public and indexed, deliberately. A price behind a sign-in wall cannot rank,
// cannot be shared, and cannot be read by the person deciding whether to pay,
// who is the entire audience for this page. Buying is the action, and that is
// what is gated.

export const revalidate = 900;

const load = () => fetchForMetadata('/auth/premium/offer/');

const priceSentence = (offer) => {
  if (!offer?.on_sale) {
    return 'Premium is not on sale yet. Tell us you want it and we will say when it is.';
  }
  // Both units in one sentence: a number reading "25 VC" assumes the reader
  // knows what a VENT COIN is. en-NG explicitly rather than the reader's
  // locale, because metadata is built on the server where there is no reader
  // to ask, and a bare toLocaleString would take the SERVER's language.
  const vc = Number(offer.price_vc_monthly || 0);
  const ngn = (vc * 1000).toLocaleString('en-NG');
  return `${vc} VENT COINS a month, which is ${ngn} NGN.`;
};

export async function generateMetadata() {
  const locale = currentLocale();
  const offer = await load();

  const features = (offer?.features || []).map((f) => f.name).slice(0, 3);
  const what = features.length
    ? `Includes ${features.join(', ')}.`
    : '';

  return buildMetadata({
    title: 'V-ENT premium',
    description: clamp(
      `What a V-ENT premium subscription switches on for an organiser. `
      + `${priceSentence(offer)} ${what}`,
    ),
    path: '/premium',
    type: 'website',
    locale,
  });
}

/** schema.org, from the real price or not at all. An Offer with no price is
 *  invalid structured data, and invalid structured data is penalised, so a
 *  premium that is not on sale publishes the service without one. */
const premiumLd = (offer) => {
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'V-ENT premium',
    serviceType: 'Subscription',
    url: absolute('/premium'),
    provider: { '@type': 'Organization', name: SITE.name },
    description: (offer?.features || [])
      .map((f) => f.name).join('. ') || undefined,
  };
  if (!offer?.on_sale) return base;
  const ngn = Number(offer.price_vc_monthly || 0) * 1000;
  return {
    ...base,
    offers: {
      '@type': 'Offer',
      price: ngn,
      priceCurrency: 'NGN',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: ngn,
        priceCurrency: 'NGN',
        billingDuration: 1,
        billingIncrement: 1,
        unitCode: 'MON',
      },
    },
  };
};

const PremiumPage = async () => {
  const offer = await load();
  return (
    <>
      <JsonLd data={premiumLd(offer)} />
      <JsonLd data={breadcrumbLd([
        { name: 'V-ENT', path: '/' },
        { name: 'Premium', path: '/premium' },
      ])} />
      <PremiumClient />
    </>
  );
};

export default PremiumPage;

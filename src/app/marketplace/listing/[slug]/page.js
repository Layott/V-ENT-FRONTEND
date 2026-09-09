import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { absolute, breadcrumbLd, buildMetadata, clamp, fetchForMetadata } from '@/lib/seo';
import ListingClient from './ListingClient';

// `/marketplace/listing/league-coaching-plat-and-below`.
//
// A server component, for the reason every detail route here is one: the page
// underneath is `'use client'` and loads in an effect, so the HTML a crawler
// or a link preview receives would otherwise carry no title, no description
// and no picture.
//
// While Vermillion City is CLOSED the fetch answers 503, `fetchForMetadata`
// returns null, and this renders a noindex page with the module's own name.
// That is the behaviour the gate asks for: nothing of a closed marketplace is
// indexable, and it happens because the switch is off rather than because
// somebody remembered to add a route to a list.

export const revalidate = 300;

const load = (slug) =>
  fetchForMetadata(`/marketplace/listings/${encodeURIComponent(slug)}/`);

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const data = await load(slug);
  const listing = data?.listing;

  if (!listing) {
    // Closed, gone, or renamed. None of the three should be indexed, and none
    // of them should claim to describe a listing.
    return buildMetadata({
      title: 'Vermillion City',
      description: 'Listings between people on V-ENT.',
      path: `/marketplace/listing/${slug}`,
      noindex: true,
    });
  }

  const price = listing.price
    ? `${listing.price.toLocaleString()} VENT COINS`
    : 'Open to offers';

  return buildMetadata({
    // The facts in the markup rather than only in the layout, because the
    // reader is increasingly a model rather than a person with eyes.
    title: `${listing.title}, ${price}`,
    description: clamp(
      listing.description
        || `${listing.title}. ${price}, from ${listing.seller?.name || 'a V-ENT seller'} on Vermillion City.`,
      160),
    path: `/marketplace/listing/${listing.slug || slug}`,
    image: listing.cover || undefined,
    type: 'article',
  });
}

const ListingPage = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const data = await load(slug);

  // Renamed: correct the address before the first paint rather than after it.
  if (data?.__moved) redirect(data.__moved);

  const listing = data?.listing;
  const path = `/marketplace/listing/${listing?.slug || slug}`;

  return (
    <>
      {listing && (
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              // A service listing is a Service; everything else is a Product.
              // Saying Product about an hour of coaching is the kind of wrong
              // structured data that is worse than none.
              '@type': listing.kind === 'service' ? 'Service' : 'Product',
              name: listing.title,
              description: listing.description || undefined,
              url: absolute(path),
              image: listing.cover || undefined,
              offers: listing.price ? {
                '@type': 'Offer',
                price: listing.price,
                priceCurrency: 'VENT',
                availability: listing.status === 'active'
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              } : undefined,
              aggregateRating: listing.seller_record?.rating ? {
                '@type': 'AggregateRating',
                ratingValue: listing.seller_record.rating,
                reviewCount: listing.seller_record.reviews,
              } : undefined,
            },
            breadcrumbLd([
              { name: 'Home', path: '/' },
              { name: 'Vermillion City', path: '/marketplace' },
              { name: listing.title, path },
            ]),
          ]}
        />
      )}
      <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
        <ListingClient slug={slug} />
      </Suspense>
    </>
  );
};

export default ListingPage;

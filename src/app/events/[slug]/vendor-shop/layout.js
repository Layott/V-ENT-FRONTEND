import { buildMetadata, clamp, fetchForMetadata } from '@/lib/seo';

// `/events/lagos-anime-con/vendor-shop` - the stalls trading at one event.
//
// Built from the RECORD rather than from a constant, because every event's
// stalls would otherwise share one title and one description, and a page that
// says the same thing about every event ranks for none of them. Same shape the
// event route itself uses; `fetchForMetadata` is the shared loader so a second
// address for the same event cannot drift from the first.

export const revalidate = 900;

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const data = await fetchForMetadata(
    `/event/view-event/${encodeURIComponent(slug)}/`);
  const event = data?.event || data || {};
  const name = event?.name || '';

  const title = name ? `Stalls at ${name}` : 'Stalls';
  const description = name
    ? clamp(`Everyone trading at ${name}${event?.location ? `, ${event.location}` : ''}. `
            + 'What each stall sells, and how to order before you arrive.', 155)
    : 'The stalls trading at this event, and what each of them sells.';

  return buildMetadata({
    title,
    description,
    path: `/events/${slug}/vendor-shop`,
    image: event?.banner || event?.logo || null,
  });
}

export default function VendorShopLayout({ children }) {
  return children;
}

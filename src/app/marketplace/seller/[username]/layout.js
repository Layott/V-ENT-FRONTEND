import { buildMetadata, clamp, fetchForMetadata } from '@/lib/seo';

// A seller's record is PUBLIC, and deliberately so: it is the page a buyer
// reads before deciding to trust a stranger with coins, and a trust page
// nobody can reach from a search is a trust page that does not do its job.
//
// While Vermillion City is closed the fetch answers 503 and this falls back to
// a noindex page with no claims on it. That happens because the switch is off
// rather than because somebody remembered to add a route to a list.

export async function generateMetadata({ params }) {
  const username = decodeURIComponent(params.username);
  const data = await fetchForMetadata(
    `/marketplace/sellers/${encodeURIComponent(username)}/`);
  const seller = data?.seller;

  if (!seller) {
    return buildMetadata({
      title: 'Vermillion City',
      description: 'Listings between people on V-ENT.',
      path: `/marketplace/seller/${username}`,
      noindex: true,
    });
  }

  const sales = seller.sales || 0;
  const rating = seller.rating ? `, rated ${seller.rating} out of 5` : '';

  return buildMetadata({
    // The facts in the title, because that is what somebody is checking.
    title: `${seller.name || username} on Vermillion City`,
    description: clamp(
      `${seller.name || username} has completed ${sales} sales on V-ENT${rating}. See what they are selling in Vermillion City.`,
      160),
    path: `/marketplace/seller/${username}`,
    image: seller.avatar || undefined,
    type: 'profile',
  });
}

export default function Layout({ children }) {
  return children;
}

import { buildMetadata, clamp, fetchForMetadata, currentLocale } from '@/lib/seo';
import { recordCopy } from '@/lib/seoRecordCopy';

// A seller's record is PUBLIC, and deliberately so: it is the page a buyer
// reads before deciding to trust a stranger with coins, and a trust page
// nobody can reach from a search is a trust page that does not do its job.
//
// While Vermillion City is closed the fetch answers 503 and this falls back to
// a noindex page with no claims on it. That happens because the switch is off
// rather than because somebody remembered to add a route to a list.

export async function generateMetadata(props) {
  const params = await props.params;
  const username = decodeURIComponent(params.username);
  const data = await fetchForMetadata(
    `/marketplace/sellers/${encodeURIComponent(username)}/`);
  const seller = data?.seller;
  const locale = await currentLocale();
  const { t, n } = recordCopy(locale);

  if (!seller) {
    return buildMetadata({
      title: t('market.title'),
      description: t('market.description'),
      path: `/marketplace/seller/${username}`,
      noindex: true,
      locale,
    });
  }

  const name = seller.name || username;
  return buildMetadata({
    locale,
    // The facts in the title, because that is what somebody is checking.
    title: t('seller.title', { name }),
    description: clamp(
      [n('seller.sales', seller.sales || 0, { name }),
        seller.rating ? t('seller.rated', { rating: seller.rating }) : null,
        t('seller.see')].filter(Boolean).join(' '),
      160),
    path: `/marketplace/seller/${username}`,
    image: seller.avatar || undefined,
    type: 'profile',
  });
}

export default function Layout({ children }) {
  return children;
}

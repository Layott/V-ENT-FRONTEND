import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbLd, buildMetadata, clamp, currentLocale, fetchRecordForMetadata,
  unavailableMetadata,
} from '@/lib/seo';
import BattleClient from './BattleClient';

// `/anime/battles/<slug>` - one character battle.
//
// Public and indexed: an argument about who would win is exactly the thing
// somebody searches for by name, and the page is readable without an account.
// Voting is the action, and that is what is gated.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/anime/battles/${encodeURIComponent(slug)}/`);

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const locale = currentLocale();
  const battle = await load(slug);

  if (battle?.__failed) return unavailableMetadata(slug, `/anime/battles/${slug}`);
  if (!battle || battle.__moved || !battle.title) {
    return buildMetadata({
      title: 'Battle not found',
      description: 'This battle does not exist.',
      path: `/anime/battles/${slug}`,
      noindex: true,
      locale,
    });
  }

  const names = (battle.characters || []).map(c => c.name).slice(0, 4);
  return buildMetadata({
    title: battle.title,
    description: clamp(
      `${battle.description || 'A V-ENT character battle.'} `
      + (names.length ? `${names.join(', ')}. ` : '')
      + 'Scored on strength, speed, intelligence, durability and technique.'),
    path: `/anime/battles/${battle.slug || slug}`,
    type: 'website',
    locale,
  });
}

const BattlePage = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const battle = await load(slug);
  return (
    <>
      <JsonLd data={breadcrumbLd([
        { name: 'V-ENT', path: '/' },
        { name: 'Anime', path: '/anime' },
        { name: 'Battles', path: '/anime/battles' },
        { name: battle?.title || 'Battle',
          path: `/anime/battles/${battle?.slug || slug}` },
      ])} />
      <BattleClient slug={slug} />
    </>
  );
};

export default BattlePage;

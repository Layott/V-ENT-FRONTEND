import JsonLd from '@/components/seo/JsonLd';
import {
  SITE, absolute, breadcrumbLd, buildMetadata, clamp, currentLocale,
  fetchForMetadata,
} from '@/lib/seo';
import SeriesClient from './SeriesClient';

// `/anime/manga/<slug>` - one comic.
//
// A server component over the client page, for the same reason the tournament
// route is one: the page underneath loads in an effect, so the HTML a crawler
// or a link preview receives would carry no title, no author and no synopsis,
// and every comic would look identical in a search result.
//
// While the module is CLOSED the API answers 503 and there is nothing to
// describe. The metadata says so and marks the page noindex rather than
// publishing a title for something nobody can open.

export const revalidate = 900;

const load = (slug) => fetchForMetadata(`/anime/series/${encodeURIComponent(slug)}/`);

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const locale = currentLocale();
  const series = await load(slug);

  if (!series || series.__moved || !series.title) {
    return buildMetadata({
      title: 'Comic not found',
      description: 'This comic does not exist, or it is not published.',
      path: `/anime/manga/${slug}`,
      noindex: true,
      locale,
    });
  }

  const author = series.author?.username || SITE.name;
  return buildMetadata({
    title: `${series.title} by ${author}`,
    description: clamp(
      `${series.synopsis || `A ${series.kind_label || 'comic'} by ${author} on V-ENT.`} `
      + `${series.chapters} chapters.`),
    path: `/anime/manga/${series.slug || slug}`,
    image: series.cover || undefined,
    type: 'website',
    locale,
  });
}

/** schema.org, from real fields or not at all. Invalid structured data is
 *  penalised; an absent block costs nothing. */
const comicLd = (series, path) => {
  if (!series?.title) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ComicSeries',
    name: series.title,
    description: series.synopsis || undefined,
    url: absolute(path),
    image: series.cover || undefined,
    author: series.author?.username
      ? { '@type': 'Person', name: series.author.username }
      : undefined,
    numberOfEpisodes: series.chapters || undefined,
    genre: (series.genres || []).length ? series.genres : undefined,
    aggregateRating: series.rating
      ? {
        '@type': 'AggregateRating',
        ratingValue: series.rating,
        ratingCount: series.ratings,
        bestRating: 5,
        worstRating: 1,
      }
      : undefined,
  };
};

const SeriesPage = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const series = await load(slug);
  const path = `/anime/manga/${series?.slug || slug}`;

  return (
    <>
      <JsonLd data={comicLd(series, path)} />
      <JsonLd data={breadcrumbLd([
        { name: 'V-ENT', path: '/' },
        { name: 'Anime', path: '/anime' },
        { name: series?.title || 'Comic', path },
      ])} />
      <SeriesClient slug={slug} />
    </>
  );
};

export default SeriesPage;

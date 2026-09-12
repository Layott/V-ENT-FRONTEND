import JsonLd from '@/components/seo/JsonLd';
import {
  absolute, breadcrumbLd, buildMetadata, clamp, currentLocale, fetchRecordForMetadata,
  unavailableMetadata,
} from '@/lib/seo';
import ReaderClient from './ReaderClient';

// `/anime/read/<chapter>` - one chapter of a comic.
//
// A server component over the client reader, so a shared link previews as the
// chapter rather than as the generic site card, and so the title in a search
// result names the comic rather than the word "Read".
//
// NOINDEX, deliberately, and it is the one anime route that is. A chapter is
// the paid thing: indexing the page that draws it would rank an address whose
// content most readers are refused, and the SERIES page is the one worth
// finding. The comic, its synopsis and its chapter list are all there.

export const revalidate = 900;

const load = (slug) => fetchRecordForMetadata(`/anime/chapters/${encodeURIComponent(slug)}/`);

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  const locale = currentLocale();
  const chapter = await load(slug);

  if (chapter?.__failed) return unavailableMetadata(slug, `/anime/read/${slug}`);
  if (!chapter || chapter.__moved || !chapter.series_title) {
    return buildMetadata({
      title: 'Chapter not found',
      description: 'This chapter does not exist, or it is not published.',
      path: `/anime/read/${slug}`,
      noindex: true,
      locale,
    });
  }

  return buildMetadata({
    title: `${chapter.series_title} chapter ${chapter.number}`,
    description: clamp(
      `${chapter.title || `Chapter ${chapter.number}`} of ${chapter.series_title}`
      + ` on V-ENT. ${chapter.pages} pages.`),
    path: `/anime/read/${chapter.slug || slug}`,
    noindex: true,
    locale,
  });
}

const ChapterPage = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const chapter = await load(slug);

  return (
    <>
      <JsonLd data={breadcrumbLd([
        { name: 'V-ENT', path: '/' },
        { name: 'Anime', path: '/anime' },
        { name: chapter?.series_title || 'Comic',
          path: `/anime/manga/${chapter?.series || ''}` },
      ])} />
      <ReaderClient slug={slug} />
    </>
  );
};

export default ChapterPage;

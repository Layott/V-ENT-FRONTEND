import JsonLd from '@/components/seo/JsonLd';
import { absolute, breadcrumbLd, buildMetadata, clamp, currentLocale, fetchRecordForMetadata, unavailableMetadata, missingMetadata } from '@/lib/seo';
import ReaderClient from './ReaderClient';
import { recordCopy } from '@/lib/seoRecordCopy';

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

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const locale = await currentLocale();
  const chapter = await load(slug);

  if (chapter?.__failed) return unavailableMetadata(slug, `/anime/read/${slug}`);
  if (!chapter || chapter.__moved || !chapter.series_title) {
    return missingMetadata('chapter', `/anime/read/${slug}`);
  }

  const { t, n } = recordCopy(locale);
  const series = chapter.series_title;
  return buildMetadata({
    title: t('chapter.title', { series, number: chapter.number }),
    description: clamp(
      `${t('chapter.of', { chapter: chapter.title || t('chapter.untitled', { number: chapter.number }), series })} `
      + n('chapter.pages', chapter.pages || 0)),
    path: `/anime/read/${chapter.slug || slug}`,
    noindex: true,
    locale,
  });
}

const ChapterPage = async props => {
  const params = await props.params;
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

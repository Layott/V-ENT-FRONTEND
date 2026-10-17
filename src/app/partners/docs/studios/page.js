import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, buildMetadata, fetchForMetadata, currentLocale } from '@/lib/seo';
import { recordCopy } from '@/lib/seoRecordCopy';
import StudioDocsClient from './StudioDocsClient';

// `/partners/docs/studios` - the guide a game studio reads before connecting a
// game (bracket structure design, section 14, item 8: "public documentation
// in en, fr and pt, in the sitemap, with a sandbox and test keys").
//
// A server component, like the API reference beside it: a studio finds this by
// searching, and a page that loads in an effect sends a crawler nothing.
//
// The tables (events, delivery types, signature headers, schema keywords,
// expression names and functions, retry schedule) come from GET /api/v1/studio/,
// never typed here, so the guide cannot drift from what the server does.

export const revalidate = 3600;

export async function generateMetadata() {
  const locale = await currentLocale();
  const { t } = recordCopy(locale);
  return buildMetadata({
    title: t('docs.studios.title'),
    description: t('docs.studios.description'),
    path: '/partners/docs/studios',
    locale,
  });
}

export default async function StudioDocsPage() {
  const catalogue = await fetchForMetadata('/api/v1/studio/');
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: 'Partners', path: '/partners' },
          { name: 'API documentation', path: '/partners/docs' },
          { name: 'Game studios', path: '/partners/docs/studios' },
        ])}
      />
      <StudioDocsClient catalogue={catalogue} />
    </>
  );
}

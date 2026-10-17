import JsonLd from '@/components/seo/JsonLd';
import { absolute, breadcrumbLd, buildMetadata, clamp, currentLocale } from '@/lib/seo';
import { recordCopy } from '@/lib/seoRecordCopy';
import { EXPLAINERS, EXPLAINER_KEYS } from '@/lib/explainers';
import FormatsClient from './FormatsClient';

// `/formats` - how every tournament format works (inbox 476, CEO 16 October
// 2026: "we'll need a video explainer for all these bracket/format systems, so
// users can easily understand").
//
// The help page the design names: every format the platform runs, each with
// its explainer and its three sentences. A server component so a crawler, a
// link preview and a model asking "how does a Swiss tournament work" receive
// the title, the description and every format's three sentences in the HTML,
// not an animation they cannot watch. Public and indexed.

export async function generateMetadata() {
  const locale = await currentLocale();
  const copy = recordCopy(locale);
  return buildMetadata({
    title: copy.t('formats.title'),
    description: clamp(copy.t('formats.what')),
    path: '/formats',
    type: 'website',
    locale,
  });
}

/** The formats as a schema.org ItemList, in the order the page shows them,
 *  each described by its three sentences. English: structured data is read by
 *  machines, and the English words are the canonical ones. */
const formatsLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'How each tournament format works on V-ENT',
  itemListOrder: 'https://schema.org/ItemListUnordered',
  numberOfItems: EXPLAINER_KEYS.length,
  itemListElement: EXPLAINER_KEYS.map((key, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: EXPLAINERS[key].title,
    description: EXPLAINERS[key].lines.join(' '),
    url: absolute(`/formats#${key.replace(/_/g, '-')}`),
  })),
});

const FormatsPage = () => (
  <>
    <JsonLd data={formatsLd()} />
    <JsonLd data={breadcrumbLd([
      { name: 'V-ENT', path: '/' },
      { name: 'Tournaments', path: '/tournaments' },
      { name: 'Formats', path: '/formats' },
    ])} />
    <FormatsClient />
  </>
);

export default FormatsPage;

import JsonLd from '@/components/seo/JsonLd';
import { absolute, breadcrumbLd, buildMetadata, clamp, currentLocale } from '@/lib/seo';
import { recordCopy } from '@/lib/seoRecordCopy';
import { ROADMAP } from '@/lib/roadmap';
import RoadmapClient from './RoadmapClient';

// `/roadmap` - what V-ENT opens next, in order (inbox 421, CEO 8 October 2026:
// "put something there that will show what we want to build in the future").
//
// A server component so a crawler, a link preview and a model asking "what is
// V-ENT building" all receive the title, the description and the list itself in
// the HTML, rather than an empty shell that fills in from a script.
// Public and indexed: a roadmap nobody can find tells nobody anything.

export async function generateMetadata() {
  const locale = await currentLocale();
  const copy = recordCopy(locale);
  return buildMetadata({
    title: copy.t('roadmap.title'),
    description: clamp(copy.t('roadmap.what')),
    path: '/roadmap',
    type: 'website',
    locale,
  });
}

/** The modules as a schema.org ItemList, in the order they open. Built from
 *  the same list the page draws. English names: structured data is read by
 *  machines, and the English list is the canonical one. */
const roadmapLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'What is coming to V-ENT',
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  numberOfItems: ROADMAP.length,
  itemListElement: ROADMAP.map((m, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: m.title[1],
    description: m.blurb[1],
    url: absolute(m.href),
  })),
});

const RoadmapPage = () => (
  <>
    <JsonLd data={roadmapLd()} />
    <JsonLd data={breadcrumbLd([
      { name: 'V-ENT', path: '/' },
      { name: 'Roadmap', path: '/roadmap' },
    ])} />
    <RoadmapClient />
  </>
);

export default RoadmapPage;

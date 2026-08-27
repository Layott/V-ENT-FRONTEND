import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, buildMetadata, fetchForMetadata } from '@/lib/seo';
import DocsClient from './DocsClient';

// `/partners/docs` - the V-ENT API reference.
//
// This page did not exist, and `GET /api/v1/` has been telling every integrator
// to read it: `"documentation": "https://v-ent.co/partners/docs"`. Anybody who
// followed that link got a 404, which is the worst possible first impression for
// a platform asking other companies to build against it.
//
// A server component, for the same reason the tournament page is one: an
// integrator finds this by searching, and a `'use client'` page that loads in an
// effect sends a crawler nothing.
//
// **The endpoint and scope tables are fetched from the API itself**, not typed
// out here. Documentation that is maintained by hand drifts from the thing it
// describes, and API documentation that lies is worse than none. If a scope is
// added tomorrow it appears here without anybody editing this file.

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMetadata({
    title: 'V-ENT API and Sign in with V-ENT',
    description:
      'Build on V-ENT: read tournaments, events, teams, players and rankings '
      + 'through the partner API, and let people sign in to your site with their '
      + 'V-ENT account.',
    path: '/partners/docs',
  });
}

export default async function PartnerDocsPage() {
  // Both are public catalogues on the API host, so this needs no key. If either is down the page
  // still renders - it just falls back to saying so rather than inventing a
  // table, because a wrong endpoint list costs an integrator an afternoon.
  const [index, sso] = await Promise.all([
    fetchForMetadata('/api/v1/'),
    fetchForMetadata('/partners/sso/metadata/'),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: 'Partners', path: '/partners' },
          { name: 'API documentation', path: '/partners/docs' },
        ])}
      />
      <DocsClient index={index} sso={sso} />
    </>
  );
}

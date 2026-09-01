import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbLd, buildMetadata, clamp, eventLd, eventMetadata, fetchForMetadata,
} from '@/lib/seo';
import EventBySlugClient from './EventBySlugClient';

// `/events/lagos-anime-con`. Server component so the event is described in the
// HTML rather than after the JavaScript runs - see the note in the tournament
// route for why that mattered.

export const revalidate = 900;

const load = (slug) => fetchForMetadata(`/event/view-event/${encodeURIComponent(slug)}/`);

const pick = (data) => (data?.__moved ? data : (data?.event || data));

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug);
  // One builder, shared with the short-link route, so a second address for this
  // event describes it identically. See `eventMetadata` for why.
  return eventMetadata(pick(await load(slug)), slug);
}

const EventBySlug = async ({ params }) => {
  const slug = decodeURIComponent(params.slug);
  const raw = await load(slug);
  const e = pick(raw);

  if (e?.__moved) redirect(e.__moved);

  const path = `/events/${e?.slug || slug}`;

  return (
    <>
      <JsonLd
        data={[
          eventLd(e, path),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Events', path: '/events' },
            { name: e?.name || e?.title || 'Event', path },
          ]),
        ]}
      />
      <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
        <EventBySlugClient slug={slug} />
      </Suspense>
    </>
  );
};

export default EventBySlug;

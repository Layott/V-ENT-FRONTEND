import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbLd, buildMetadata, clamp, eventLd, fetchForMetadata,
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
  const raw = await load(slug);
  const e = pick(raw);

  if (!e) {
    return buildMetadata({
      title: 'Event not found',
      description: 'This event does not exist, or it is no longer listed.',
      path: `/events/${slug}`,
      noindex: true,
    });
  }
  if (e.__moved) {
    return buildMetadata({
      title: 'Event moved',
      description: 'This event has been renamed.',
      path: e.__moved,
      noindex: true,
    });
  }

  const when = e.event_date || e.start_datetime;
  const dateLabel = when
    ? new Date(when).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    : null;
  const tiers = Array.isArray(e.ticket_tiers) ? e.ticket_tiers : [];
  const cheapest = tiers.length
    ? Math.min(...tiers.map((t) => Number(t.price || 0)))
    : Number(e.entry_fee || 0);

  const description = clamp(
    e.desc || e.description
    || [
      `${e.event_type === 'physical' ? 'In person' : e.event_type === 'hybrid' ? 'In person and online' : 'Online'} event${dateLabel ? ` on ${dateLabel}` : ''}.`,
      e.location ? `${e.location}.` : null,
      cheapest > 0 ? `Tickets from ${cheapest.toLocaleString()} NGN.` : 'Free to attend.',
    ].filter(Boolean).join(' '),
  );

  return buildMetadata({
    title: e.name || e.title,
    description,
    path: `/events/${e.slug || slug}`,
    image: e.banner || e.logo,
    type: 'article',
    keywords: [e.game?.game_title || e.game, 'gaming event', e.location, 'Nigeria']
      .filter(Boolean).join(', '),
    noindex: e.is_active === false,
  });
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

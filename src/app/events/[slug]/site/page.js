import { redirect } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import EventSite from '@/components/event-site/EventSite';
import { eventLd, eventMetadata, fetchRecordForMetadata } from '@/lib/seo';

// `/events/<slug>/site`: the event's own website (inbox 360). The same event
// as `/events/<slug>`, drawn without V-ENT's app around it, in the organiser's
// colour, theme, layout and sections. Its canonical is the event page, so the
// two never compete in a search.
//
// Unpublished, it sends people to the event page; `?preview=1` shows it
// anyway, marked as a preview and never indexed, so an organiser can see it
// before they publish.

// Read fresh on every request: an organiser presses Publish and opens the
// address straight away, and a cached record from a minute earlier still
// says unpublished and sends them to the event page instead.
export const dynamic = 'force-dynamic';

const load = (slug) => fetchRecordForMetadata(`/event/view-event/${encodeURIComponent(slug)}/`, { revalidate: 0 });
const pick = (data) => (data?.__moved ? data : (data?.event || data));

export async function generateMetadata(props) {
  const { slug: raw } = await props.params;
  const { preview } = await props.searchParams;
  const slug = decodeURIComponent(raw);
  const e = pick(await load(slug));
  // Decided here as well as in the page: metadata is resolved first, so a
  // redirect from here is a real 307, while one from the page arrives after
  // the response has started and reaches a crawler as a 200.
  if (e && !e.__failed && !e.__moved && !e.site?.enabled && !preview) {
    redirect(`/events/${encodeURIComponent(e.slug || slug)}`);
  }
  const meta = await eventMetadata(e, slug, { path: `/events/${slug}/site` });
  return preview || !e?.site?.enabled ? { ...meta, robots: { index: false, follow: false } } : meta;
}

export default async function EventSitePage(props) {
  const { slug: raw } = await props.params;
  const { preview } = await props.searchParams;
  const slug = decodeURIComponent(raw);
  const e = pick(await load(slug));

  if (e?.__moved) redirect(`${e.__moved.replace(/\/$/, '')}/site`);
  if (!e || e.__failed) redirect(`/events/${encodeURIComponent(slug)}`);
  if (!e.site?.enabled && !preview) redirect(`/events/${encodeURIComponent(e.slug || slug)}`);

  return (
    <>
      <JsonLd data={[eventLd(e, `/events/${e.slug || slug}`)]} />
      <EventSite event={e} preview={!e.site?.enabled} />
    </>
  );
}

import { redirect } from 'next/navigation';
import { eventMetadata, fetchRecordForMetadata } from '@/lib/seo';
import EmbedEvent from '@/components/embed/EmbedEvent';

// `/embed/events/<slug>`: an event's tickets inside somebody else's website
// (inbox 360). Framable from anywhere (next.config.mjs, nginx /embed/), never
// indexed, and it links out to V-ENT for the checkout.

// Short: the tickets are fetched live in the frame; only the colours and
// the words can be up to half a minute old.
export const revalidate = 30;

const load = (slug) => fetchRecordForMetadata(`/event/view-event/${encodeURIComponent(slug)}/`, { revalidate: 30 });
const pick = (data) => (data?.__moved ? data : (data?.event || data));

export async function generateMetadata(props) {
  const { slug: raw } = await props.params;
  const slug = decodeURIComponent(raw);
  const meta = await eventMetadata(pick(await load(slug)), slug);
  return { ...meta, robots: { index: false, follow: false } };
}

export default async function EmbedEventPage(props) {
  const { slug: raw } = await props.params;
  const slug = decodeURIComponent(raw);
  const e = pick(await load(slug));
  // A renamed event keeps its embed working: the retired slug answers with
  // the new address, and the frame follows it.
  if (e?.__moved) redirect(e.__moved.replace(/\/events\//,'/embed/events/'));
  return <EmbedEvent slug={e?.slug || slug} initial={e?.__failed ? null : e} failed={!!e?.__failed} />;
}

import { notFound, redirect } from 'next/navigation';
import { fetchRecordForMetadata, tournamentMetadata } from '@/lib/seo';
import { WIDGETS, carryQuery, readLook } from '@/lib/embedLook';
import EmbedTournamentWidget from '@/components/embed/EmbedTournamentWidget';

// `/embed/tournaments/<slug>/<widget>`: one part of a tournament inside
// somebody else's website (P8, inbox 480): its bracket, its standings, its
// schedule or its path. The card, with registration, is the bare address one
// level up.
//
// CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
// or put tournament registrations and brackets system under their own website
// from v-ent."
//
// Framable (the middleware writes the frame policy), never indexed: the page a
// search should find is the tournament itself, and the canonical says so.

// The name and the look are read on the server; the widget itself fetches
// live in the frame and keeps itself current.
export const revalidate = 30;

const load = (slug) => fetchRecordForMetadata(`/tournament/view-tournament/${encodeURIComponent(slug)}/`, { revalidate: 30 });
const pick = (data) => (data?.__moved ? data : (data?.tournament || data));
const isWidget = (widget) => WIDGETS.includes(widget) && widget !== 'card';

export async function generateMetadata(props) {
  const { slug: raw, widget } = await props.params;
  if (!isWidget(widget)) return { robots: { index: false, follow: false } };
  const slug = decodeURIComponent(raw);
  const meta = await tournamentMetadata(pick(await load(slug)), slug);
  return { ...meta, robots: { index: false, follow: false } };
}

export default async function EmbedTournamentWidgetPage(props) {
  const { slug: raw, widget } = await props.params;
  if (!isWidget(widget)) notFound();
  const searchParams = await props.searchParams;
  const slug = decodeURIComponent(raw);
  const t = pick(await load(slug));
  if (t?.__moved) {
    redirect(`${t.__moved.replace(/\/tournaments\//, '/embed/tournaments/')}/${widget}${carryQuery(searchParams)}`);
  }
  return <EmbedTournamentWidget widget={widget} slug={t?.slug || slug}
                                initial={t?.__failed ? null : t} failed={!!t?.__failed}
                                look={readLook(searchParams, t?.event?.site)} />;
}

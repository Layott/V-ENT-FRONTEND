import { redirect } from 'next/navigation';
import { fetchRecordForMetadata, tournamentMetadata } from '@/lib/seo';
import { carryQuery, readLook } from '@/lib/embedLook';
import EmbedTournament from '@/components/embed/EmbedTournament';

// `/embed/tournaments/<slug>`: a tournament's card inside somebody else's
// website (inbox 360). Registering opens on V-ENT in a pop-up or a new tab.
// The other widgets (bracket, standings, schedule) live one level down, in
// [widget]/page.js (P8).

// Short: the card is read on the server, so places taken can be up to
// half a minute old; registering happens on V-ENT and reads it fresh.
export const revalidate = 30;

const load = (slug) => fetchRecordForMetadata(`/tournament/view-tournament/${encodeURIComponent(slug)}/`, { revalidate: 30 });
const pick = (data) => (data?.__moved ? data : (data?.tournament || data));

export async function generateMetadata(props) {
  const { slug: raw } = await props.params;
  const slug = decodeURIComponent(raw);
  const meta = await tournamentMetadata(pick(await load(slug)), slug);
  return { ...meta, robots: { index: false, follow: false } };
}

export default async function EmbedTournamentPage(props) {
  const { slug: raw } = await props.params;
  const searchParams = await props.searchParams;
  const slug = decodeURIComponent(raw);
  const t = pick(await load(slug));
  // A renamed tournament keeps its embed working, in the look it was given
  // and under the name embed.js sizes it by.
  if (t?.__moved) redirect(t.__moved.replace(/\/tournaments\//, '/embed/tournaments/') + carryQuery(searchParams));
  // The tournament's event website colours are its own look; the snippet
  // may change them for this one placement.
  const look = readLook(searchParams, t?.event?.site);
  return <EmbedTournament slug={t?.slug || slug} initial={t?.__failed ? null : t}
                          failed={!!t?.__failed} look={look} />;
}

// What every circuit screen says the same way (P5): regions, who is ranked,
// a tournament's state in the circuit, and the one request helper.
//
// Every call names its whole address (`${API}/circuits/<slug>/tiers/`), so
// tools/endpoint-callers.py can see which screen calls which door.

export const API = process.env.NEXT_PUBLIC_API_URL;

/** The regions a circuit can be in: vent_auth/regions.py ORDER, in that order. */
export const REGIONS = [
  ['West Africa', 'circuit.region.westAfrica'],
  ['East Africa', 'circuit.region.eastAfrica'],
  ['North Africa', 'circuit.region.northAfrica'],
  ['Central Africa', 'circuit.region.centralAfrica'],
  ['Southern Africa', 'circuit.region.southernAfrica'],
  ['Europe', 'circuit.region.europe'],
  ['North America', 'circuit.region.northAmerica'],
  ['South America', 'circuit.region.southAmerica'],
  ['Asia', 'circuit.region.asia'],
  ['Middle East', 'circuit.region.middleEast'],
  ['Oceania', 'circuit.region.oceania'],
];

/** A region in the reader's language; '' is everywhere. */
export function regionWord(tt, region) {
  if (!region) return tt('circuit.region.everywhere', 'Everywhere');
  const found = REGIONS.find(([name]) => name === region);
  return found ? tt(found[1], found[0]) : region;
}

export function entrantWord(tt, entrant) {
  return entrant === 'team' ? tt('circuit.entrant.team', 'Teams') : tt('circuit.entrant.player', 'Players');
}

/** "1 Oct 2026 to 20 Dec 2026", or one end, or nothing. */
export function seasonDates(tt, circuit, formatDate) {
  const from = circuit?.starts_on ? formatDate(circuit.starts_on) : null;
  const to = circuit?.ends_on ? formatDate(circuit.ends_on) : null;
  if (from && to) return tt('circuit.datesRange', '{from} to {to}').replace('{from}', from).replace('{to}', to);
  if (from) return tt('circuit.datesFrom', 'From {from}').replace('{from}', from);
  if (to) return tt('circuit.datesUntil', 'Until {to}').replace('{to}', to);
  return '';
}

/** A request to a circuit door. {ok, status, answer}; never throws. */
export async function request(url, { method = 'GET', token, body } = {}) {
  try {
    const res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const answer = await res.json().catch(() => ({}));
    return { ok: res.ok && answer?.status === 'success', status: res.status, answer };
  } catch {
    return { ok: false, status: 0, answer: null };
  }
}

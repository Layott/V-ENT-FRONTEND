// Every timezone there is, grouped and labelled with its current offset.
//
// CEO, 7 September 2026: "hopefully all time zones are represented".
//
// They were not. The picker held eleven hand-typed entries - Lagos, Accra,
// Nairobi, Johannesburg, Cairo, London, New York, Los Angeles, Tokyo,
// Singapore and UTC - so anybody in Abidjan, Kinshasa, Casablanca, Dhaka,
// Sao Paulo or Auckland could not say where they were. On a platform whose
// whole point is that a reader in Accra sees their own clock, a picker that
// cannot name their country is the setting failing at the first step.
//
// ## Why the offset is in the label
//
// "Africa/Abidjan" tells somebody nothing about what time it is there.
// "Africa/Abidjan (UTC+00:00)" lets them recognise their own without knowing
// the IANA naming scheme, and it is the number they are actually choosing.
//
// The offset is computed from TODAY, so a zone on summer time shows its
// summer offset. That is the honest answer to "what is my offset" asked now,
// and it is the only one a static table could get wrong twice a year.
//
// ## Why grouped
//
// Four hundred options in one list is a scroll, not a choice. Grouped by
// region, Africa first because the platform is Africa-first, and with the
// reader's own detected zone pinned at the very top so the common case is one
// tap rather than a hunt.

// The fallback, for a browser without `Intl.supportedValuesOf` (Safari before
// 15.4, and anything embedded). Deliberately wider than the old shortlist and
// spread across every continent, so even the degraded case is usable.
const FALLBACK = [
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers',
  'Africa/Cairo', 'Africa/Casablanca', 'Africa/Dakar', 'Africa/Dar_es_Salaam',
  'Africa/Douala', 'Africa/Harare', 'Africa/Johannesburg', 'Africa/Kampala',
  'Africa/Khartoum', 'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Lagos',
  'Africa/Luanda', 'Africa/Lusaka', 'Africa/Maputo', 'Africa/Nairobi',
  'Africa/Tunis', 'America/Bogota', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Sao_Paulo', 'America/Toronto', 'Asia/Dhaka', 'Asia/Dubai',
  'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Kolkata', 'Asia/Karachi',
  'Asia/Manila', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Melbourne', 'Australia/Perth',
  'Australia/Sydney', 'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Dublin',
  'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London', 'Europe/Madrid',
  'Europe/Moscow', 'Europe/Paris', 'Europe/Rome', 'Europe/Warsaw',
  'Pacific/Auckland', 'UTC',
];

/** Every zone this browser knows, or the fallback list. */
export function allTimezones() {
  try {
    const list = Intl.supportedValuesOf?.('timeZone');
    if (Array.isArray(list) && list.length) {
      // `supportedValuesOf` omits plain UTC on some engines, and it is the
      // one choice somebody may deliberately want.
      return list.includes('UTC') ? list : ['UTC', ...list];
    }
  } catch {
    // Fall through.
  }
  return FALLBACK;
}

/** The browser's guess at where the reader is, or '' if it will not say. */
export function detectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * A zone's offset from UTC right now, in minutes.
 *
 * Worked out by asking `Intl` for the same instant twice, once in the zone and
 * once in UTC, and subtracting. There is no API that returns this directly,
 * and parsing the short name ("WAT", "GMT+1") is unreliable because the same
 * abbreviation means different things in different places.
 */
export function offsetMinutes(zone, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at).reduce((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
    // `hour` comes back as "24" at midnight on some engines.
    const hour = parts.hour === '24' ? '00' : parts.hour;
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(hour), Number(parts.minute), Number(parts.second),
    );
    return Math.round((asUTC - at.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/** "+01:00", "-05:00", "+00:00". */
export function offsetLabel(zone, at = new Date()) {
  const mins = offsetMinutes(zone, at);
  const sign = mins < 0 ? '-' : '+';
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** The city out of an IANA id: "Africa/Dar_es_Salaam" -> "Dar es Salaam". */
export function cityOf(zone) {
  const tail = String(zone).split('/').slice(1).join(' / ');
  return (tail || zone).replace(/_/g, ' ');
}

/** "Lagos (UTC+01:00)", or "UTC (UTC+00:00)" for the bare one. */
export function zoneLabel(zone, at = new Date()) {
  return `${cityOf(zone)} (UTC${offsetLabel(zone, at)})`;
}

// Africa first: this platform is Africa-first, and a Nigerian organiser
// should not scroll past three continents to find Lagos.
const REGION_ORDER = [
  'Africa', 'America', 'Europe', 'Asia', 'Australia', 'Pacific',
  'Atlantic', 'Indian', 'Antarctica', 'Arctic', 'Other',
];

const regionOf = (zone) => {
  const head = String(zone).split('/')[0];
  return REGION_ORDER.includes(head) ? head : 'Other';
};

/**
 * The picker's contents: `[{ region, zones: [{ id, label, offset }] }]`.
 *
 * `pinned` (the reader's detected zone, and whatever they already have saved)
 * goes into a group of its own at the top, and still appears in its own
 * region below, so somebody scanning by continent is not confused by a gap.
 */
export function timezoneGroups({ pinned = [], at = new Date() } = {}) {
  const zones = allTimezones();
  const known = new Set(zones);
  const byRegion = new Map();

  for (const id of zones) {
    const region = regionOf(id);
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push({ id, label: zoneLabel(id, at), offset: offsetMinutes(id, at) });
  }

  const groups = REGION_ORDER
    .filter((r) => byRegion.has(r))
    .map((region) => ({
      region,
      zones: byRegion.get(region).sort((a, b) => a.label.localeCompare(b.label)),
    }));

  // A saved zone this browser has never heard of still has to be selectable,
  // or opening settings silently changes the setting to whatever is first.
  const top = [];
  const seen = new Set();
  for (const id of pinned) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    top.push({ id, label: zoneLabel(id, at), offset: offsetMinutes(id, at) });
    if (!known.has(id)) known.add(id);
  }

  return top.length ? [{ region: 'Yours', zones: top }, ...groups] : groups;
}

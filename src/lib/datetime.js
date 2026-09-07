// Times belong to a moment, not to a string.
//
// A `datetime-local` input hands back "2026-09-04T10:00" with no timezone in
// it. That string was being sent to the API as-is, and the server - which runs
// on UTC - had no choice but to read it as 10:00 UTC. An organiser in Lagos
// typing 10:00 got an event that actually started at 11:00 their time, and
// every attendee saw the wrong hour.
//
// So the browser converts before sending: it knows which zone the person typed
// in, and nothing else does. Going the other way, an ISO string carrying an
// offset renders in whatever zone the reader is in, which is what makes the
// same moment read correctly in Lagos, Accra and London.

/** A datetime-local value, as the instant the person meant, in ISO with offset.
 *
 *  `new Date("2026-09-04T10:00")` is parsed as LOCAL time by every browser,
 *  which is exactly the reading we want, and toISOString then states that same
 *  instant in UTC.
 */
export function localInputToISO(value) {
  if (!value) return value;
  // Already carries a zone (ends in Z, or +hh:mm / -hh:mm): leave it alone.
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

/** An ISO string as the value a datetime-local input wants, in the reader's zone. */
export function isoToLocalInput(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}` + `T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/** Convert every datetime-local field in a payload before it is sent. */
export function withLocalDatesAsISO(payload, fields) {
  const out = {
    ...payload
  };
  fields.forEach(field => {
    if (out[field]) out[field] = localInputToISO(out[field]);
  });
  return out;
}

// ---------------------------------------------------------------------------
// The display half: one timing model for the whole site
// ---------------------------------------------------------------------------
//
// CEO, 6 September 2026: "the timing model should be across the entire site,
// people in ghana, should be seeing all set timings in their own times.
// everything that has to do with dates and timing shiuld pickk it from that
// timing model."
//
// The half above already gets INPUT right: what an organiser typed in Lagos is
// converted to an instant before it is sent. Reading was the half still done by
// hand in 260 places, and done two ways that are both wrong:
//
//   new Date(iso).toLocaleDateString()          <- the BROWSER's language
//   new Date(iso).toLocaleDateString('en-GB')   <- somebody else's language
//
// The first is the subtle one. Passing no locale, or `undefined`, does not mean
// "the default"; it means whatever language the browser is set to, which on a
// Portuguese reader's phone is Portuguese no matter what they chose on the
// site, and on an English phone stays English no matter what they chose. The
// zone was always right by accident, because `toLocale*` uses the reader's own
// zone; the words never were.
//
// So everything here takes `appLocale()` for the words and the reader's own
// zone for the clock, and there is one place to change if that ever has to
// move.
//
// ## The venue clock, which is a real exception and not an oversight
//
// A physical event opens its doors at the VENUE's clock. Somebody in Accra
// reading "10:00" for a Lagos event and turning up at their own 10:00 is an
// hour late, and an audience that misses the start blames the platform. So the
// reader sees their own time AND the zone it is in - `withZone` - and anything
// that must state the venue's own clock asks for it explicitly with `inZone`.
// The rule is not "always the viewer's zone", it is "always a zone the reader
// can see", and the viewer's is the sensible default.

import { appLocale } from './appLocale';
import { appDateFormat, appTimezone } from './appRegion';

/**
 * The zone dates should be read in.
 *
 * A SAVED preference first, then the browser's guess, then nothing. Somebody
 * in Lagos opening the site from an airport in Doha still wants Lagos time,
 * because that is where their tournament is, and the browser cannot know that.
 * Until they choose, the browser is the best guess available.
 *
 * The setting used to be saved and read by nothing at all, so choosing a zone
 * in Settings changed no date on the site. CEO, 7 September: "do these work?"
 */
export function viewerZone() {
  const chosen = appTimezone();
  if (chosen) return chosen;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function asDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Every formatter here goes through this, so there is one set of decisions. */
function render(value, options, { zone, fallback = '-' } = {}) {
  const parsed = asDate(value);
  if (parsed === null) return fallback;
  try {
    return parsed.toLocaleString(appLocale(), {
      ...options,
      // An explicit zone wins - that is the venue clock, and it must, or
      // somebody reads a Lagos door time in their own zone and arrives late.
      // Otherwise the reader's: their saved preference, or the browser's guess.
      timeZone: zone || viewerZone(),
    });
  } catch {
    // An invalid zone from bad data must never take a page down with it.
    return parsed.toLocaleString(appLocale(), options);
  }
}

/** A date and a time together: "4 Sept 2026, 10:00". */
export function formatDateTime(value, opts) {
  return render(value, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }, opts);
}

/**
 * A date on its own: "4 Sept 2026", or the order the reader asked for.
 *
 * The three settings are ORDERS, not format strings, and each maps to a real
 * locale that already writes dates that way. That matters: `Intl` knows the
 * separators, the numerals and the direction for every language V-ENT speaks,
 * and hand-assembling "DD/MM/YYYY" from parts throws all of that away the
 * moment somebody reads the site in a language that does not use Latin digits.
 *
 * With no preference set, the reader's own language decides, which is the
 * behaviour every date on the site had before and still has by default.
 */
const DATE_ORDER = {
  'DD/MM/YYYY': { locale: 'en-GB', numeric: true },
  'MM/DD/YYYY': { locale: 'en-US', numeric: true },
  'YYYY-MM-DD': { locale: 'en-CA', numeric: true },
};

export function formatDate(value, opts) {
  const chosen = DATE_ORDER[appDateFormat()];
  if (!chosen) {
    return render(value, {
      day: 'numeric', month: 'short', year: 'numeric',
    }, opts);
  }
  const parsed = asDate(value);
  if (parsed === null) return (opts && opts.fallback) || '-';
  try {
    return parsed.toLocaleDateString(chosen.locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: (opts && opts.zone) || viewerZone(),
    });
  } catch {
    return render(value, {
      day: 'numeric', month: 'short', year: 'numeric',
    }, opts);
  }
}

/** A time on its own: "10:00". */
export function formatTime(value, opts) {
  return render(value, { hour: '2-digit', minute: '2-digit' }, opts);
}

/** A date and time with the zone named: "4 Sept 2026, 10:00 WAT".
 *
 *  For anything somebody has to BE somewhere for. The zone is the difference
 *  between arriving and arriving an hour out, and it costs three characters.
 */
export function formatWithZone(value, opts) {
  return render(value, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }, opts);
}

/** The same instant stated in a named zone, for a venue's own clock. */
export function formatInZone(value, zone, opts) {
  return formatWithZone(value, { ...opts, zone });
}

/** A range, collapsing the parts that repeat: "4 - 6 Sept 2026". */
export function formatDateRange(from, to, opts) {
  const start = asDate(from);
  const end = asDate(to);
  if (start === null) return opts?.fallback ?? '-';
  if (end === null) return formatDate(start, opts);
  const sameDay = formatDate(start, opts) === formatDate(end, opts);
  if (sameDay) return formatDate(start, opts);
  return `${formatDate(start, opts)} - ${formatDate(end, opts)}`;
}

/** How long ago, in words, for a feed or a log. */
export function formatRelative(value, opts) {
  const parsed = asDate(value);
  if (parsed === null) return opts?.fallback ?? '-';
  const seconds = Math.round((parsed.getTime() - Date.now()) / 1000);
  const steps = [
    ['second', 60], ['minute', 60], ['hour', 24],
    ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity],
  ];
  let amount = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(amount) < size) {
      try {
        return new Intl.RelativeTimeFormat(appLocale(), { numeric: 'auto' })
          .format(Math.round(amount), unit);
      } catch {
        return formatDateTime(value, opts);
      }
    }
    amount /= size;
  }
  return formatDateTime(value, opts);
}

/** A number, in the reader's language, so 1,422 and 1.422 both come out right. */
export function formatNumber(value, options) {
  if (value === null || value === undefined || value === '') return '-';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '-';
  try {
    return n.toLocaleString(appLocale(), options);
  } catch {
    return String(n);
  }
}

export default {
  localInputToISO, isoToLocalInput, withLocalDatesAsISO,
  viewerZone, formatDateTime, formatDate, formatTime, formatWithZone,
  formatInZone, formatDateRange, formatRelative, formatNumber,
};

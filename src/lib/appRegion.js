// The reader's own timezone, date format and currency, readable from anywhere.
//
// CEO, 7 September 2026, looking at the Currency and region panel: "do these
// work?" They did not. All three were saved to the account and read by
// nothing:
//
//   Currency display  read nowhere. The real preference was a separate
//                     localStorage key the panel never touched.
//   Timezone          saved, but every date rendered in the BROWSER's zone via
//                     Intl.DateTimeFormat().resolvedOptions(), so the setting
//                     changed nothing.
//   Date format       read nowhere at all.
//
// Three controls that saved a value and did nothing with it, which is the
// exact shape this codebase has a hard rule against.
//
// ## Why a published value rather than a hook
//
// The same reason `appLocale` is one, and this file is deliberately its twin:
// `lib/datetime.js` is a plain module of formatting functions, called from
// helpers and from module scope where a hook cannot be called. A provider
// publishes here and anything that formats can ask, component or not.
//
// ## The rule about the timezone
//
// A SAVED preference beats the browser's guess; the browser's guess beats
// nothing. Somebody in Lagos who opens the site from an airport in Doha still
// wants Lagos time, because that is where their tournament is. Until they say
// otherwise the browser is the best guess available, which is why it stays the
// fallback rather than being replaced.
//
// The venue-clock exception in `datetime.js` is untouched and still wins over
// both: a physical event opens its doors on the venue's clock, and reading
// "10:00" in your own zone for a Lagos event is how somebody arrives late.

let timezone = '';        // '' means: use the browser's guess
let dateFormat = '';      // '' means: use the language's own convention
let currency = '';        // '' means: VENT COINS, the platform's own unit

/** Called by the provider once the account's settings are known. */
export function setAppRegion(next) {
  if (!next) return;
  if (typeof next.timezone === 'string') timezone = next.timezone;
  if (typeof next.dateFormat === 'string') dateFormat = next.dateFormat;
  if (typeof next.currency === 'string') currency = next.currency;
}

/** The zone dates should be rendered in, or '' to use the browser's. */
export function appTimezone() {
  return timezone;
}

/**
 * How a bare date should be ordered, or '' for the language's own convention.
 *
 * Returns one of 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'. Deliberately a
 * SHAPE rather than a format string: these are the three orders people
 * actually mean, and accepting arbitrary patterns would mean writing a date
 * formatter, which `Intl` already does correctly in every language.
 */
export function appDateFormat() {
  return dateFormat;
}

/** The currency somebody chose to see prices in, or '' for VENT COINS. */
export function appCurrency() {
  return currency;
}

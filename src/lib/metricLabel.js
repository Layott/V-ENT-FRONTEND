// A per-player metric's name in the reader's language.
//
// The server's catalogue names each metric in English ("Damage dealt"), and the
// Players tab printed that name as it came, so a French reader read an English
// column heading under French tabs (found 29 September 2026). Every screen that
// names a metric goes through here, with the server's word as the fallback for
// a metric added to the catalogue before its translation.

export function metricLabel(tt, metric) {
  if (!metric) return '';
  const key = typeof metric === 'string' ? metric : metric.key;
  const fallback = typeof metric === 'string' ? metric : (metric.label || metric.key);
  return tt(`metric.${key}`, fallback);
}

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

export default { localInputToISO, isoToLocalInput, withLocalDatesAsISO };

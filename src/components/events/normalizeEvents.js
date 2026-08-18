// Bridges the thin real-backend Event shape (Django `vent_event`) to the richer
// shape the events UI is built against (which matches the mock layer). This lets
// the same components render correctly whether they are fed mock data or the
// live backend's `get-all-events` payload.
//
// Real backend event fields: event_id, name, creator (username string),
//   event_type, desc, entry_fee, reg_start_date, reg_end_date, event_date,
//   start_time, end_time, location, event_link, logo, banner, interaction_count, game
// Canonical UI fields: id, name, description, banner_image, start_date, end_date,
//   event_type, location, organizer{}, ticket_types[], status, attendees_count,
//   linked_tournaments[]
//
// normalizeEvent is idempotent - an already-canonical (mock) event passes through
// unchanged because the canonical keys are read first.

const combineDateTime = (dateVal, timeVal) => {
  if (!dateVal) return null;
  const dateStr = String(dateVal);
  if (dateStr.includes('T')) return dateStr; // already a datetime string
  const time = timeVal ? String(timeVal) : '00:00:00';
  return `${dateStr}T${time}`;
};

const deriveStatus = (startISO, endISO) => {
  const now = Date.now();
  const start = startISO ? new Date(startISO).getTime() : null;
  const end = endISO ? new Date(endISO).getTime() : null;
  if (end && now > end) return 'completed';
  if (start && now >= start) return 'in_progress';
  return 'upcoming';
};

export const normalizeEvent = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;

  const rawId = raw.id ?? raw.event_id;
  const id = rawId != null ? String(rawId) : undefined;
  const banner_image = raw.banner_image ?? raw.banner ?? '';
  const start_date = raw.start_date ?? combineDateTime(raw.event_date, raw.start_time);
  const end_date = raw.end_date ?? combineDateTime(raw.event_date, raw.end_time);

  // Mock has an organizer object; the real backend returns a `creator` username.
  let organizer = raw.organizer;
  if (!organizer && raw.creator) {
    organizer =
      typeof raw.creator === 'string'
        ? { username: raw.creator, full_name: raw.creator }
        : raw.creator;
  }

  return {
    ...raw,
    id,
    event_id: raw.event_id ?? rawId,
    name: raw.name ?? '',
    description: raw.description ?? raw.desc ?? '',
    banner_image,
    banner: raw.banner ?? banner_image,
    start_date,
    end_date,
    event_type: raw.event_type ?? 'physical',
    location: raw.location ?? '',
    event_link: raw.event_link ?? raw.virtual_link ?? null,
    organizer,
    ticket_types: Array.isArray(raw.ticket_types) ? raw.ticket_types : [],
    status: raw.status ?? deriveStatus(start_date, end_date),
    attendees_count: raw.attendees_count ?? raw.interaction_count ?? 0,
    linked_tournaments: Array.isArray(raw.linked_tournaments) ? raw.linked_tournaments : [],
    game: raw.game ?? null,
    entry_fee: raw.entry_fee ?? null,
  };
};

// Normalises whatever `get-all-events` returned into a single de-duped list.
// Prefers an explicit `events` array (mock); otherwise merges the real backend's
// featured / upcoming / by_game buckets (which repeat the same events).
export const extractEventList = (payload) => {
  if (!payload) return [];

  let list = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (Array.isArray(payload.events)) {
    list = payload.events;
  } else {
    const buckets = [];
    if (Array.isArray(payload.featured)) buckets.push(...payload.featured);
    if (Array.isArray(payload.upcoming)) buckets.push(...payload.upcoming);
    if (payload.by_game && typeof payload.by_game === 'object') {
      Object.values(payload.by_game).forEach((arr) => {
        if (Array.isArray(arr)) buckets.push(...arr);
      });
    }
    list = buckets;
  }

  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const e = normalizeEvent(raw);
    if (!e) continue;
    const key = e.id ?? e.event_id;
    if (key != null && seen.has(key)) continue;
    if (key != null) seen.add(key);
    out.push(e);
  }
  return out;
};

// Locate a single event by id inside a `get-all-events` payload - used as a
// fallback on the detail page because the real backend has no single-event route.
export const findEventInList = (payload, id) => {
  const list = extractEventList(payload);
  return (
    list.find(
      (e) => String(e.id) === String(id) || String(e.event_id) === String(id)
    ) || null
  );
};

/**
 * A tournament's schedule, day by day, for the schedule widget (P8).
 *
 * Read from the running order (`/tournament/<slug>/running-order/`), which is
 * the organiser's own: "Given, not generated. Layo set it." So the order they
 * set wins. A fixture they put on a day sits on that day in their order; a
 * fixture with a time and no day (the stage engine spaces matches out) sits on
 * the reader's calendar day for that time, after the ordered ones, by time;
 * a fixture nobody has placed yet goes in one last group, in playing order.
 *
 * `dayOf(iso)` is the reader's calendar day for an instant ('YYYY-MM-DD'),
 * passed in so the widget uses the site's one timing model and the test can
 * fix a zone. Pure, no React.
 */

const playingOrder = (a, b) => (a.round - b.round) || (a.match_number - b.match_number)
  || (a.match_id - b.match_id);

const byTime = (a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at))
  || playingOrder(a, b);

/** [{day: 'YYYY-MM-DD' | null, fixtures: [...]}], days in order, null last. */
export function scheduleGroups(payload, dayOf) {
  const placed = new Map();
  const add = (day) => {
    if (!placed.has(day)) placed.set(day, { ordered: [], timed: [] });
    return placed.get(day);
  };
  for (const group of payload?.days || []) {
    for (const row of group?.fixtures || []) add(row.day || group.day).ordered.push(row);
  }
  const later = [];
  for (const row of payload?.unscheduled || []) {
    if (row?.scheduled_at) add(dayOf(row.scheduled_at)).timed.push(row);
    else if (row) later.push(row);
  }
  const groups = [...placed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, { ordered, timed }]) => ({
      day,
      fixtures: [
        ...ordered.sort((a, b) => (a.running_order - b.running_order) || playingOrder(a, b)),
        ...timed.sort(byTime),
      ],
    }));
  if (later.length) groups.push({ day: null, fixtures: later.sort(playingOrder) });
  return groups;
}

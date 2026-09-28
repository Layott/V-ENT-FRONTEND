// What a tournament's status is called, in the reader's language.
//
// Two screens printed the raw value: the tournament page as "COMPLETED" to a
// Portuguese reader, the console header as "registration open" to a French
// one (second bracket walk, 28 September 2026). Both read this now.

const FALLBACK = {
  draft: 'Draft',
  published: 'Published',
  registration_open: 'Registration open',
  registration_closed: 'Registration closed',
  upcoming: 'Upcoming',
  live: 'Live',
  in_progress: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function tournamentStatusLabel(tt, status) {
  const key = String(status || '').toLowerCase();
  if (!FALLBACK[key]) return key ? key.replace(/_/g, ' ') : tt('tstatus.unknown', 'Status unknown');
  return tt(`tstatus.${key === 'in_progress' ? 'live' : key}`, FALLBACK[key]);
}

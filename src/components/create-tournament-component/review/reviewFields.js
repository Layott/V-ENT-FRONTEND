'use client';

// Turning the wizard's stored formData into the rows the Review step shows.
//
// Kept apart from the four components that render it for one reason: the same
// four rows are read by the tournament wizard and the event wizard, and the
// two had already drifted into separate hardcoded copies of an invented
// tournament. One reader means one answer.
//
// Every value here is formatted, never invented. A field the organiser left
// empty renders as a dash and reads as "you did not set this", which is the
// whole purpose of a review step; filling it with a plausible default would
// tell somebody their tournament is configured when it is not.

import { formatLabel } from '@/lib/formatLabel';

const DASH = '–';

/** A date and time the way somebody wrote it, read back in their locale. */
export const showDateTime = (value, locale = 'en') => {
  if (!value) return DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const showDate = (value, locale = 'en') => {
  if (!value) return DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const show = (value) => {
  if (value === 0) return '0';
  if (value === undefined || value === null || String(value).trim() === '') return DASH;
  return String(value);
};

/** A stored choice like `single_elimination` said in words. */
const label = (t, prefix, value, fallbacks = {}) => {
  if (!value) return DASH;
  const key = String(value).toLowerCase().replace(/[\s-]+/g, '_');
  return t(`${prefix}.${key}`, fallbacks[key] || String(value));
};

// The one format list, so the review names gsl, the aggregate tie and the
// ladder rather than printing their keys.
export const bracketLabel = (t, value) => formatLabel(t, value, DASH);

export const accessLabel = (t, value) => label(t, 'review.access', value, {
  teams: 'Teams only',
  individuals: 'Individuals only',
  both: 'Teams and individuals',
});

export const typeLabel = (t, value) => label(t, 'review.type', value, {
  virtual: 'Online',
  physical: 'In person',
  hybrid: 'Both online and in person',
  online: 'Online',
});

export const visibilityLabel = (t, value) => label(t, 'review.visibility', value, {
  public: 'Public',
  private: 'Private',
  protected: 'Password protected',
});

export const entryLabel = (t, value) => label(t, 'review.entry', value, {
  free: 'Free',
  paid: 'Paid',
});

export const prizeTypeLabel = (t, value) => label(t, 'review.prizeType', value, {
  distributed: 'Distributed across places',
  winner_takes_all: 'Winner takes all',
  no_prize: 'No prize',
});

/** "50 VENT COINS", or a dash. The unit is never dropped. */
export const showCoins = (t, value) => {
  if (value === undefined || value === null || String(value).trim() === '') return DASH;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return t('review.coinsAmount', '{n} VENT COINS').replace('{n}', n.toLocaleString());
};

/** The place a prize is for: 1st, 2nd, 3rd, then 4th and up. */
export const placeLabel = (t, position) => {
  const n = Number(position);
  if (Number.isNaN(n)) return show(position);
  if (n === 1) return t('review.place.1', '1st place (winner)');
  if (n === 2) return t('review.place.2', '2nd place');
  if (n === 3) return t('review.place.3', '3rd place');
  return t('review.place.n', '{n}th place').replace('{n}', n);
};

export const basicInfoRows = (t, d = {}, locale = 'en') => [
  [t('review.row.type', 'Tournament type'), typeLabel(t, d.tournament_type)],
  [t('review.row.start', 'Starts'), showDateTime(d.start_date_and_time, locale)],
  [t('review.row.end', 'Ends'), showDateTime(d.end_date_and_time, locale)],
  [t('review.row.venue', 'Venue'), show(d.tournament_location)],
  [t('review.row.link', 'Link to play on'), show(d.virtual_link)],
  [t('review.row.visibility', 'Who can see it'), visibilityLabel(t, d.tournament_visibility)],
  [t('review.row.entryType', 'Entry'), entryLabel(t, d.entry_type)],
  [t('review.row.entryFee', 'Entry fee'), showCoins(t, d.entry_fee)],
  [t('review.row.regOpens', 'Registration opens'), showDate(d.reg_start_date_and_time, locale)],
  [t('review.row.regCloses', 'Registration closes'), showDate(d.reg_end_date_and_time, locale)],
];

export const formatRows = (t, d = {}) => [
  [t('review.row.format', 'Format'), bracketLabel(t, d.bracket_type)],
  [t('review.row.access', 'Who may enter'), accessLabel(t, d.tournament_access)],
  [t('review.row.teamSize', 'Players per team'), show(d.team_size)],
  [t('review.row.minPlayers', 'Fewest participants'), show(d.min_number_of_participants)],
  [t('review.row.maxPlayers', 'Most participants'), show(d.max_number_of_participants)],
];

export const prizeRows = (t, d = {}) => {
  const type = String(d.prize_distribution_type || '').toLowerCase().replace(/[\s-]+/g, '_');
  const rows = [[t('review.row.prizeType', 'Prize'), prizeTypeLabel(t, d.prize_distribution_type)]];

  if (type === 'winner_takes_all') {
    rows.push([placeLabel(t, 1), showCoins(t, d.winner_prize)]);
    return rows;
  }
  if (type === 'distributed') {
    const places = Array.isArray(d.prize_distribution) ? d.prize_distribution : [];
    const sorted = [...places].sort((a, b) => Number(a.position) - Number(b.position));
    sorted.forEach((p) => rows.push([placeLabel(t, p.position), showCoins(t, p.prize)]));
  }
  return rows;
};

export default basicInfoRows;

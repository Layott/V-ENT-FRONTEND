/**
 * Stored codes, said in the reader's language.
 *
 * A status or a type comes back from the API as a code: "physical",
 * "team_and_individual", "withdrawn". Drawn as it is, it is English, and on
 * a badge whose stylesheet shouts it, "PHYSICAL" on a French page (the embeds
 * walk, 30 September 2026, inbox 364). Every screen that shows one of these
 * asks here, and scripts/check-raw-enums.mjs fails a screen that draws the
 * code itself.
 *
 * Each helper takes `tt` from useT() and the code, and answers the word, or
 * the code itself when it is one nobody has written a word for yet (which the
 * key checker then reports as missing, rather than the screen going blank).
 */

const lookup = (tt, family, value, map = {}) => {
  if (value === null || value === undefined || value === '') return '';
  const key = map[value] || value;
  return tt(`${family}.${key}`, String(value).replace(/_/g, ' '));
};

// `online` is what some older rows and the tournament side call `virtual`.
const EVENT_TYPE = { online: 'virtual' };
const ACCESS = { team: 'teams', individual: 'individuals', team_and_individual: 'both' };

/** physical, virtual, hybrid. */
export const eventTypeLabel = (tt, value) => lookup(tt, 'review.type', value, EVENT_TYPE);

/** team, individual, team_and_individual. */
export const accessLabel = (tt, value) => lookup(tt, 'review.access', value, ACCESS);

/** An event: upcoming, live, ended, cancelled. */
export const eventStatusLabel = (tt, value) => lookup(tt, 'estatus', value);

/** A tournament: registration_open, live, completed, ... Owned by
 *  tournamentStatus.js, which also decides the status; re-exported so a screen
 *  showing several kinds of code imports one place. */
export { tournamentStatusLabel } from './tournamentStatus';

/** Somebody's entry in a tournament: pending, confirmed, disqualified, withdrawn. */
export const entryStatusLabel = (tt, value) => lookup(tt, 'regstatus', value);

/** A request to join a team, or an invitation: pending, accepted, rejected, declined, cancelled. */
export const requestStatusLabel = (tt, value) => lookup(tt, 'reqstatus', value);

/** A partner application: pending, approved, rejected, suspended. */
export const partnerStatusLabel = (tt, value) => lookup(tt, 'partnerstatus', value);

/** A manga series: ongoing, completed, hiatus. */
export const seriesStatusLabel = (tt, value) => lookup(tt, 'seriesstatus', value);

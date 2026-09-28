import { formatNumber } from '@/lib/datetime';
import { plural } from '@/lib/plural';

/**
 * How full a tournament is, the same sentence on every card and page.
 *
 * Seven screens wrote it by hand and a tournament with no cap read "8/-" on
 * its own page, "8/0" on the listing, "8/undefined" in search and in an
 * event's line-up, with "teams" and "players" left in English beside it
 * (walk, 28 September 2026). A cap of 0 or none means there is no limit, and
 * that is said in words.
 *
 *   slotsText(tt, 8, 64)            "8/64"
 *   slotsText(tt, 8, 64, 'team')    "8 of 64 teams"
 *   slotsText(tt, 8, null)          "8, no limit"
 *   slotsText(tt, 1, null, 'team')  "1 team, no limit"
 */
export function slotsText(tt, current, max, unit) {
  const n = Number(current) || 0;
  const cap = Number(max) || 0;
  const counted = (k) => {
    if (unit === 'team') return plural(tt, k, 'slots.teamOne', '{n} team', 'slots.teams', '{n} teams', formatNumber(k));
    if (unit === 'entrant') return plural(tt, k, 'slots.entrantOne', '{n} participant', 'slots.entrants', '{n} participants', formatNumber(k));
    if (unit === 'player') return plural(tt, k, 'slots.playerOne', '{n} player', 'slots.players', '{n} players', formatNumber(k));
    return formatNumber(k);
  };
  if (cap > 0) {
    if (!unit) return `${formatNumber(n)}/${formatNumber(cap)}`;
    return tt('slots.ofCap', '{n} of {cap}').replace('{n}', formatNumber(n)).replace('{cap}', counted(cap));
  }
  return tt('slots.noLimit', '{n}, no limit').replace('{n}', counted(n));
}

/**
 * Where each graphic sits in the studio console (inbox 395).
 *
 * CEO, 30 September 2026: "please let the overlays be properly structured and
 * arranged on the site, so its easy for someone to manoeuvre the production
 * studio." Thirty three graphics in one column was the opposite of that.
 *
 * Grouped by what an operator reaches for, in the order a show runs: the full
 * screens that open and close it, the frames the cameras sit in, the names,
 * the numbers, the schedule and sponsors, and the transitions between scenes.
 * A kind the server lists and no group names still shows, under "More", and
 * scripts/check-studio-groups.mjs fails until it is given a home.
 */

export const GROUPS = [
  { id: 'screens', label: ['studio.group.screens', 'Full screens'],
    kinds: ['starting_soon', 'brb', 'break_screen', 'stream_ended', 'champions', 'title_card', 'versus_card',
      'award_card', 'intro', 'outro', 'award'] },
  { id: 'frames', label: ['studio.group.frames', 'Camera and game frames'],
    kinds: ['streamer_single', 'streamer_double', 'streamer_gameplay', 'analyst_desk', 'play_area'] },
  { id: 'people', label: ['studio.group.people', 'Names and lower thirds'],
    kinds: ['name_tag', 'match_lower_third', 'lower_third', 'desk_lower_third', 'player_card'] },
  { id: 'results', label: ['studio.group.results', 'Scores, tables and results'],
    kinds: ['scorebar', 'standings', 'bracket', 'fixture_card', 'fixture_result', 'match_result',
      'head_to_head', 'matchday', 'squad_depth', 'explainer', 'stat_counter'] },
  { id: 'schedule', label: ['studio.group.schedule', 'Schedule, sponsors and clips'],
    kinds: ['now_next', 'programme', 'doors', 'ticker', 'sponsors', 'corner_bug', 'media'] },
  { id: 'transitions', label: ['studio.group.transitions', 'Transitions'], kinds: ['transition'] },
  // Pictures for Instagram, X and YouTube at their own sizes (inbox 396): made
  // here and downloaded as a PNG or a video for posting.
  { id: 'social', label: ['studio.group.social', 'Posts and thumbnails'], kinds: ['social_post'] },
];

export const OTHER = { id: 'other', label: ['studio.group.other', 'More'] };

/** The groups for the kinds this broadcast has, in order, with any stray last. */
export function groupKinds(kinds) {
  const placed = new Set(GROUPS.flatMap((g) => g.kinds));
  const out = GROUPS.map((g) => ({ ...g, kinds: g.kinds.filter((k) => kinds.includes(k)) }))
    .filter((g) => g.kinds.length);
  const stray = kinds.filter((k) => !placed.has(k));
  if (stray.length) out.push({ ...OTHER, kinds: stray });
  return out;
}

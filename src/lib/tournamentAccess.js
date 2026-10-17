/**
 * What the tournament console shows the person looking at it (P7).
 *
 * Design section 16, P7: "granular roles (structure, report, place entrants,
 * standings, caster)". The server answers `/tournament/<ref>/access/` with
 * `can_manage` (the organiser or an admin) and `permissions`, the parts of the
 * tournament this viewer runs. This file is the one place those become tabs,
 * so a helper is never shown a tab whose doors refuse them, and the console
 * never opens on a tab they cannot use.
 */

/** The five permissions, in the order the server writes them. */
export const PERMISSION_KEYS = ['structure', 'place', 'report', 'standings', 'caster'];

/** Every console tab, in the order the tab row draws them. */
export const CONSOLE_TABS = ['actions', 'match-control', 'participants', 'lineup', 'invitations',
  'brackets', 'run-of-show', 'production', 'reminders', 'money', 'stats'];

/** Which permissions open each tab a helper may see. Anything else is the organiser's. */
const TAB_NEEDS = {
  // Results, and the battle royale console, whose lobbies are structure and
  // whose seats are place.
  'match-control': ['report', 'structure', 'place'],
  brackets: ['structure', 'place'],
  stats: ['standings'],
  production: ['caster'],
  'run-of-show': ['caster'],
};

/**
 * Whether the viewer described by `access` may do `permission` here. 'manage'
 * is the organiser's own work; the organiser and an admin hold everything.
 */
export function can(access, permission) {
  if (!access) return false;
  if (access.can_manage === true) return true;
  if (permission === 'manage') return false;
  return Array.isArray(access.permissions) && access.permissions.includes(permission);
}

/** The console tabs this viewer sees, in tab row order. */
export function tabsFor(access) {
  if (!access) return [];
  if (access.can_manage === true) return [...CONSOLE_TABS];
  return CONSOLE_TABS.filter((tab) => {
    if (tab === 'lineup') return access.is_entrant === true;
    const needs = TAB_NEEDS[tab];
    return Boolean(needs && needs.some((permission) => can(access, permission)));
  });
}

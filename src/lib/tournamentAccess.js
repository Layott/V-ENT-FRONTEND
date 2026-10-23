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
  // Results. A battle royale's lobbies and seats open this tab too; see
  // BATTLE_ROYALE_NEEDS.
  'match-control': ['report'],
  brackets: ['structure', 'place'],
  stats: ['standings'],
  production: ['caster'],
  'run-of-show': ['caster'],
};

// A battle royale's console (lobbies are structure, seats are place) renders
// nothing for a tournament with no battle royale, so those two permissions
// open Match Control only when there is one to run.
const BATTLE_ROYALE_NEEDS = ['structure', 'place'];

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

/**
 * The console tabs this viewer sees, in tab row order. `battleRoyale` says
 * whether the tournament has a battle royale in it.
 */
export function tabsFor(access, { battleRoyale = false } = {}) {
  if (!access) return [];
  if (access.can_manage === true) return [...CONSOLE_TABS];
  return CONSOLE_TABS.filter((tab) => {
    if (tab === 'lineup') return access.is_entrant === true;
    const needs = [...(TAB_NEEDS[tab] || [])];
    if (tab === 'match-control' && battleRoyale) needs.push(...BATTLE_ROYALE_NEEDS);
    return needs.some((permission) => can(access, permission));
  });
}

// Which addresses need an account. ONE list, read by the middleware (which
// redirects a stranger) and by the session-expiry guard (which decides where a
// dead token sends somebody).
//
// The guard used to send everybody to the sign-in page when a token died,
// whatever page they were on. Found on the Android emulator on 12 September:
// a public event page, opened with a stale cookie from an earlier session,
// answered with "Your session expired" instead of the event. Content is
// public; only an action needs an account, and only an action's page should
// bounce.
//
// Matched with startsWith, so a bare "/events" here would also gate
// "/events/lagos-anime-con". That is what it used to do, and it meant every
// event and team page - the pages carrying the structured data, the ones the
// sitemap advertises - answered a crawler with a redirect to /login. Public
// by default: the test is "does visiting it perform an action, or show somebody
// else's private data". A profile, a team, a storefront, a thread and a
// placeholder page all fail that test and are public - they are also the pages
// worth being found in a search, which is the other half of the same decision.
// A wallet, an inbox, a draft and every create form pass it and stay here.
export const PROTECTED_ROUTES = [
  '/home',
  '/edit-user-profile',
  '/onboarding',
  '/edit-team-profile',
  '/teams/create-team',
  '/events/create-event',
  '/events/edit-event',
  '/events/my-events',
  '/events/my-tickets',
  '/events/attendees',
  // The door. The whole page is an action: it downloads a ticket list and
  // checks people in. Signed out it rendered a scanner that could do neither
  // and said only "Could not load this event."
  '/events/scan',
  '/events/register-event',
  '/tournaments/create-tournament',
  '/tournaments/drafts',
  '/tournaments/register-tournament',
  '/tournaments/my-tournaments',
  '/tournaments/manage',
  '/organizations/create',
  '/organizations/manage',
  '/organizations/invites',
  '/community/dm',
  '/community/scrim/create',
  '/wallets',
  // Somebody's own memberships and every payment they have made. The
  // whole page means "mine", so it is gated as a page rather than
  // control by control. The plans themselves live at /plans/<name>,
  // which is a different prefix and stays public and indexed.
  '/memberships',
  '/settings',
  '/notifications',
  '/disputes',
  // A stallholder's own stalls and orders.
  '/my-stalls',
];

// Routes whose slug sits in the middle, so a prefix match cannot reach them.
// `/events/lagos-anime-con/edit` performs an action and so is gated; the event
// page under it is public and stays public.
export const PROTECTED_PATTERNS = [
  /^\/events\/[^/]+\/(edit|manage|attendees)$/,
  /^\/tournaments\/[^/]+\/manage$/,
  // Registering IS the action. Signed out, this handed somebody the whole
  // wizard and refused them at the end, after they had chosen an entry type.
  /^\/tournaments\/[^/]+\/register$/,
];

/** `path` with no locale prefix, e.g. "/events/my-tickets". */
export function isGatedPath(path) {
  const p = String(path || '/');
  return PROTECTED_ROUTES.some((route) => p.startsWith(route))
    || PROTECTED_PATTERNS.some((pattern) => pattern.test(p));
}

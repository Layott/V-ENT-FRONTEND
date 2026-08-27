// Things that are switched on or off for the whole product.
//
// One name per decision, read everywhere that decision matters, so turning
// something back on is one edit rather than a hunt through every page that
// happened to mention it.

/** Whether identity verification is asked of anybody.
 *
 *  Off since 2026-08-27: "KYC should not be showing anywhere on the user facing
 *  side for now, its not a requirement for now."
 *
 *  It was not one banner. It was a banner on the wallet, a hard gate that made
 *  the withdraw page unreachable, a gate over bank details in settings, and a
 *  submission page - so a person met the same wall four times over a
 *  requirement that had been dropped. Worse, the withdrawal gate paired with the
 *  server's own check to make withdrawing impossible rather than merely
 *  discouraged.
 *
 *  The backend has the matching switch, `REQUIRE_KYC_FOR_PAYOUT` in
 *  vent_auth/views_admin.py. Turn both together; leaving this one on while the
 *  server ignores it shows people a wall that no longer exists, and the reverse
 *  invites them into a form the server will refuse.
 */
export const KYC_REQUIRED = false;

/** The routes that still render a ComingSoon page.
 *
 *  This existed as hardcoded badges inside the mobile menu and nowhere else, so
 *  the two navs disagreed and both had drifted from the truth: Community and
 *  Organizations were badged "Coming Soon" while being built and working, Anime
 *  carried no badge while still being a placeholder, and the desktop sidebar
 *  warned about nothing at all. Somebody tapped Organizations, saw "Coming
 *  Soon", and landed on a working page.
 *
 *  Derive the badge from this instead of writing it per item. When a module
 *  ships, it leaves this list once.
 */
export const COMING_SOON_ROUTES = new Set([
  '/anime',
  '/marketplace',
  '/shop',
  '/wager',
]);

export const isComingSoon = (href) => COMING_SOON_ROUTES.has(href);

export default { KYC_REQUIRED, COMING_SOON_ROUTES, isComingSoon };

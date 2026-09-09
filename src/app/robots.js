import { SITE, absolute } from '@/lib/seo';

// What a crawler may read.
//
// The disallow list is not about secrecy - every one of these routes checks
// auth server-side and the pages are marked noindex. It is about crawl budget
// and about not publishing URLs that only ever answer "sign in". A crawler that
// spends its visit on /wallets/withdraw is a crawler that did not reach the
// tournament that opened this morning.

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',           // staff only, and its own login
          '/api/',            // never useful to a crawler
          '/wallets',         // money, and personal by definition
          '/memberships',     // what somebody pays for and every payment
                              // they have made. The plans themselves live
                              // at /plans/<name> and ARE public

          '/settings',
          '/notifications',
          '/edit-user-profile',
          '/edit-team-profile',
          '/onboarding',
          '/claim/',          // single-use tokens; indexing one would be a leak
          '/auth/',
          '/partners/authorize',   // an OAuth screen has no business in search
          '/reset-password',
          '/reset-email',
          '/verify-email',
          '/community/dm',    // private conversations
          '/wallet-topup-callback',
          '/tournaments/drafts',   // unpublished by definition
          '/tournaments/overlay',  // a broadcast surface, not a page
          '/production',           // a personal list of what you run
          '/logout',               // an action, not a page
          '/events/my-events',     // a personal list, including unlisted events
          '/my-stalls',            // your own stalls, your own orders and
                                   // the delivery addresses on them
          '/events/edit-event',    // a form, and only the organiser may submit it
          '/events/*/edit',
          '/events/*/manage',      // promo codes and who may run the event
          '/events/*/attendees',   // the door list is attendee data
          '/events/check-in/',     // a ticket code in a URL; indexing one would
                                   // hand a stranger somebody's admission
          '/events/find-ticket',   // a lookup form, and nothing to rank for
          '/home',            // a signed-in member's own dashboard. A visitor
                              // is redirected away from it, so indexing it
                              // would rank a redirect
          '/disputes',        // somebody's own disputes, and the other side's
          '/organizations/invites',  // somebody's own invitations
          '/organizations/*/manage', // roles, invites, and the profile form
          '/studio/',         // broadcast graphics: transparent pages meant
                              // for a browser source, meaningless in search
          '/run-of-show/',    // the share address for a run of show. The
                              // public one lives on its event and is in the
                              // sitemap; this token address is unlisted by
                              // definition and indexing it would publish
                              // every link only sheet anybody has shared
          '/s/',              // a shortened link is a second address for a page
                              // that already has one; indexing it splits the
                              // ranking between the two
          '/marketplace/create',     // a form, and only its author may submit it
          '/marketplace/dashboard',  // somebody's own listings and their numbers
          '/marketplace/purchase',   // an order: what somebody bought, from whom,
                                     // for how much. Personal by definition
        ],
      },
      {
        // Answers questions from the site's own content. Worth allowing
        // deliberately rather than by omission.
        userAgent: ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot'],
        allow: '/',
        disallow: ['/admin', '/wallets', '/settings', '/community/dm', '/claim/',
                   '/events/*/edit', '/events/*/manage', '/events/*/attendees',
                   '/events/check-in/', '/s/', '/studio/', '/production',
                   '/run-of-show/', '/logout', '/marketplace/create',
                   '/marketplace/dashboard', '/marketplace/purchase'],
      },
    ],
    sitemap: absolute('/sitemap.xml'),
    host: SITE.url,
  };
}

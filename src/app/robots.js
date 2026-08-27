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
          '/events/my-events',     // a personal list, including unlisted events
          '/events/*/manage',      // promo codes and who may run the event
          '/events/*/attendees',   // the door list is attendee data
        ],
      },
      {
        // Answers questions from the site's own content. Worth allowing
        // deliberately rather than by omission.
        userAgent: ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot'],
        allow: '/',
        disallow: ['/admin', '/wallets', '/settings', '/community/dm', '/claim/',
                   '/events/*/manage', '/events/*/attendees'],
      },
    ],
    sitemap: absolute('/sitemap.xml'),
    host: SITE.url,
  };
}

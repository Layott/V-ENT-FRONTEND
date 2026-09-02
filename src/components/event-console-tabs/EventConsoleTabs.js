'use client';

// One tab strip across everything that manages an event.
//
// CEO, 2 September: "once i click edit event i should be able to fluidly
// switch between sub tabs and even easily switch back to the first initial
// page, instead of it like taking me to a completel different place."
//
// The two screens were two places. `/events/<slug>/edit` said "Edit event" and
// showed a form; pressing any card on it landed on `/events/<slug>/manage`,
// which said "Run this event" and showed a row of chips. Nothing on the second
// screen led back to the first except the browser, and nothing on it looked
// like the screen you had just left.
//
// So both render this. Details is simply the first tab, and it happens to live
// at a different address; every other tab is a query parameter on the console.
// From an organiser's side there is one screen with twelve tabs, which is what
// there always should have been.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import styles from './event-console-tabs.module.css';

// id, translation key, English. `null` id means Details, which is its own
// route rather than a tab on the console.
export const CONSOLE_TABS = [
  [null, 'console.tabDetails', 'Details'],
  ['tickets', 'console.tabTickets', 'Tickets'],
  ['money', 'console.tabMoney', 'Money'],
  ['numbers', 'console.tabNumbers', 'Sales and attendance'],
  ['messages', 'console.tabMessages', 'Messages'],
  ['polls', 'console.tabPolls', 'Polls'],
  ['holds', 'console.tabHolds', 'Holds'],
  ['programme', 'console.tabProgramme', 'Programme'],
  ['queue', 'console.tabQueue', 'Waiting list'],
  ['influencers', 'console.tabInfluencers', 'Influencers'],
  ['promos', 'console.tabPromos', 'Promo codes'],
  ['team', 'console.tabTeam', 'Team'],
];

/**
 * @param eventRef  the event's slug
 * @param active    the current tab id, or 'details' on the edit page
 * @param onSelect  optional. When given, console tabs call it instead of
 *                  navigating, so the console switches in place rather than
 *                  reloading itself.
 */
export default function EventConsoleTabs({ eventRef, active, onSelect }) {
  const tt = useT();
  if (!eventRef) return null;

  return (
    <div className={styles.strip} role="tablist">
      {CONSOLE_TABS.map(([id, key, fallback]) => {
        const isDetails = id === null;
        const on = isDetails ? active === 'details' : active === id;
        const className = `${styles.tab} ${on ? styles.tabOn : ''}`;
        const label = tt(key, fallback);

        // Details always navigates, because it is a different route. Console
        // tabs switch in place when the console itself is rendering us.
        if (isDetails || !onSelect) {
          const href = isDetails
            ? `/events/${eventRef}/edit`
            : `/events/${eventRef}/manage?tab=${id}`;
          return (
            <Link key={key} href={href} className={className}
                  role="tab" aria-selected={on}>
              {label}
            </Link>
          );
        }

        return (
          <button key={key} type="button" className={className}
                  role="tab" aria-selected={on} onClick={() => onSelect(id)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

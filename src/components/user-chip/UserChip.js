'use client';

// One way to write somebody's name.
//
// CEO, 29 August 2026, with a screenshot of a direct message: "why didnt her
// founder badge show here?" and then "anywhere Winlola name shows, the founder
// badge must be there also." Also: "Anywhere you see another user, you should
// be able to click or tap on their name or logo and it should take you to
// their profile."
//
// Both of those had the same cause. Every screen wrote a name out by hand:
//
//     <h1>{other?.full_name || other?.username}</h1>
//     <span>@{other?.username}</span>
//
// Thirty-odd copies of that, and a badge or a link had to be remembered
// separately in each. The badge was on posts, comments, threads and search
// because somebody added it there; it was missing from direct messages, club
// member lists, event attendee lists, organisation members and tournament
// participants because nobody had got to them. That is not a bug that gets
// fixed once, it is a bug that gets fixed thirty times and then reappears on
// the thirty-first screen somebody builds.
//
// So there is one component. A name goes through here or it is wrong.
// scripts/check-user-chips.mjs fails the build when a new screen writes one
// out by hand.

import Link from 'next/link';
import Avatar from '@/components/avatar/Avatar';
import FounderBadge from '@/components/founder-badge/FounderBadge';
import styles from './user-chip.module.css';

/**
 * @param user      whatever the API's `_person` builder returned
 * @param size      avatar size in px; 0 or false for no avatar
 * @param secondary show the @handle under the name
 * @param link      set false only where the surrounding element is already a
 *                  link, because an anchor inside an anchor is invalid and the
 *                  inner one stops working
 */
const UserChip = ({
  user,
  size = 32,
  secondary = false,
  link = true,
  className = '',
  nameClassName = '',
  handleClassName = '',
  badgeSize = 'sm',
  children,
}) => {
  if (!user) return null;

  const name = user.full_name || user.username || '';
  const handle = user.username || '';
  // A profile is addressed by username. Anybody without one - a guest ticket
  // holder, an attendee who typed only an email - has no profile to open, so
  // they render as plain text rather than as a link that 404s.
  const href = handle ? `/u/${encodeURIComponent(handle)}` : null;

  const inner = (
    <>
      {size ? <Avatar src={user.avatar} name={handle || name || 'user'} size={size} /> : null}
      <span className={styles.text}>
        <span className={`${styles.name} ${nameClassName}`}>
          {name}
          {/* The founder mark travels with the name, everywhere, because it
              is the name that identifies the person and not the screen. */}
          {user.founder_badge && <FounderBadge size={badgeSize} />}
          {user.verified && <span className={styles.verified} title="Verified" />}
        </span>
        {secondary && handle && (
          <span className={`${styles.handle} ${handleClassName}`}>@{handle}</span>
        )}
        {children}
      </span>
    </>
  );

  if (!link || !href) {
    return <span className={`${styles.chip} ${className}`}>{inner}</span>;
  }

  return (
    <Link href={href} className={`${styles.chip} ${styles.linked} ${className}`}>
      {inner}
    </Link>
  );
};

export default UserChip;

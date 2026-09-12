'use client';

// The door scanner, from wherever an organiser happens to be standing.
//
// CEO, 7 September 2026: "the open the door scanner button is overlayed on
// trxt, there is no enough spacing. then it should appear on lamost all the
// edit pages."
//
// It lived in one place: the header of the console. On the day of an event
// that is the wrong single place. Somebody fixing a ticket price, printing the
// door list or reading the run of show is minutes from needing to scan
// somebody in, and asking them to navigate back through two screens to find
// the button is how the scanner ends up unused - which has already happened
// once on this platform, when the scan page existed for days with nothing
// linking to it and the door counted one person out of 1421.
//
// One component rather than the same Link written on five pages, because the
// address carries a gate parameter and five copies of it is five chances for
// one of them to drift.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import styles from './door-scanner-link.module.css';

/**
 * @param eventRef  the event's slug. Nothing renders without one, because a
 *                  scanner with no event to scan against opens on an error.
 * @param gate      which door this device is. 'Main' unless said otherwise,
 *                  and the scanner lets somebody change it there.
 * @param compact   a smaller version for a page whose header is already busy.
 */
export default function DoorScannerLink({ eventRef, gate = 'Main', compact = false }) {
  const tt = useT();
  if (!eventRef) return null;

  return (
    <Link
      href={`/events/scan?event=${encodeURIComponent(eventRef)}&gate=${encodeURIComponent(gate)}`}
      className={compact ? `${styles.link} ${styles.compact}` : styles.link}>
      {tt('manage.openDoor', 'Open the door scanner')}
    </Link>
  );
}

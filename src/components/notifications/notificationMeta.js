// What a notification looks like, in one place.
//
// The inbox page and the bell's drawer both draw the same rows, and the two
// were going to drift the moment a category was added: a new kind of
// notification would get its icon on one screen and a question mark on the
// other. Same reason UserChip exists.
//
// The colour class stays with each screen, because they are CSS modules and a
// class name from one does not exist in the other. Only the parts that are
// genuinely shared live here.

import {
  IoNotificationsOutline, IoTrophyOutline, IoCalendarOutline, IoWalletOutline,
  IoWarningOutline, IoPeopleOutline, IoShieldCheckmarkOutline, IoCashOutline,
  IoInformationCircleOutline, IoAtCircleOutline, IoPersonAddOutline,
} from 'react-icons/io5';

import { appLocale } from '@/lib/appLocale';

const ICONS = {
  tournament: IoTrophyOutline,
  event: IoCalendarOutline,
  wallet: IoWalletOutline,
  dispute: IoWarningOutline,
  team: IoPeopleOutline,
  kyc: IoShieldCheckmarkOutline,
  payout: IoCashOutline,
  system: IoInformationCircleOutline,
  mention: IoAtCircleOutline,
  follower: IoPersonAddOutline,
};

/** The icon for a category, and a sensible one for a category we do not know. */
export function categoryIcon(category) {
  return ICONS[category] || IoNotificationsOutline;
}

/**
 * "just now", "20m ago", "3d ago", then a real date.
 *
 * Falls back to a date in the reader's own language once a notification is old
 * enough that "7w ago" stops being a useful way to say when. `appLocale()`
 * rather than `undefined`, which would mean the browser's language and not the
 * one they chose here.
 */
export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.floor(Math.max(0, Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString(appLocale(), {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

'use client';

// C6, the play area frame. The same furniture as C3, around the game.
//
// Ported from the approved pack: `desk_frame()` in
// `CLAUDE/VIDEOS/RIVALRY/stream_more.py`, called as
// `desk_frame("C6 play area frame", "Play area", "THE PLAY AREA",
// "THE CELEBR8 CENTRE, IKEJA")`, and rendered with `header=False`.
//
// Their own note says the desk and the play area are one object: "the analyst
// desk holds three and the play area holds one, which changes nothing about
// the furniture." So this is C3's plate with different words in it, and the
// two are separate files here for the same reason they are separate calls
// there: an operator cues them independently.
//
// **The middle is the game.** The plate sits in the bottom left and the rest
// of the 1920x1080 stays transparent, so nothing here can crop the play area
// or sit over the scoreboard the game draws.

import { useT } from '@/i18n/LanguageProvider';
import rv from './rivalry.module.css';
import styles from './play-area-frame.module.css';

export default function PlayAreaFrame({ payload, data }) {
  const tt = useT();

  const label = payload.label || tt('studio.rv.playArea', 'The play area');

  // The pack hard-coded the venue into this one graphic, which is right for
  // one show and wrong for the next. Both kinds of broadcast know where they
  // are happening, so a blank note draws the record rather than a placeholder,
  // and an operator who types something still wins.
  //
  // `event.venue` is on the feed today. `tournament.venue` is NOT: the column
  // exists as `Tournament.tournament_location` and `views_overlay_feed.py`
  // simply does not forward it beside `title`, `slug`, `game`, `logo` and
  // `starts_at`. Read under the name the event side already uses, so the two
  // agree the day it is added, and blank until then. A frame with no venue
  // still draws the frame, which is the whole point of this graphic.
  const note = payload.note || data?.tournament?.venue || data?.event?.venue || '';

  return (
    <div className={`${rv.rv} ${rv.frame}`}>
      <div className={`${styles.plate} ${rv.wipeIn}`}>
        <div className={styles.plk}>{label}</div>
        {note && <div className={styles.pln}>{note}</div>}
      </div>
    </div>
  );
}

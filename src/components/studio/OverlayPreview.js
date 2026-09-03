'use client';

// One overlay, playing, at the size it will be on air.
//
// CEO, 3 September 2026: "the overlays in the studio should always autoplays in
// small boxes... so we can see how they'll look inside the streaming software
// when loaded in", and then: "THE PREVIEW SHOULD BE REPLAYING IN A LOOP AND
// ONCE SOMETHING IS EDITED THE PREVIEW UPDATES WITH IT AND CONTINUES PREVIEWING
// IN A LOOP. IT SHOULD SHOW HOW IT'LL LOAD ON THE LIVE."
//
// One component for both panels. The studio's own graphics and the files people
// upload are the same thing to a browser source, and two copies of this would
// have drifted inside a week: the uploaded ones already went a whole release
// with no preview at all while the built-in ones had one.
//
// Three things it has to get right:
//
//   It fills.     The real overlay URL, no sandbox. `allow-scripts` alone puts
//                 the frame on an opaque origin and its feed request goes out
//                 as Origin: null, so every value sits on its placeholder and
//                 the overlay looks broken when it is fine.
//   It replays.   A browser source loads once and the entry animation plays
//                 once, so the only way to see the load-in again is to load
//                 again. `replay` remounts the frame.
//   It stops.     Each frame is a real page polling a real feed. Eight on
//                 screen is fine; eight more scrolled past is an organiser's
//                 battery and a burst of requests from one address, which is
//                 what got the console rate limited on 3 September.

import { useRef } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import useOnScreen from '@/lib/useOnScreen';
import styles from './overlay-preview.module.css';

export default function OverlayPreview({ url, title, replay = 0, extraQuery = '' }) {
  const tt = useT();
  const box = useRef(null);
  const onScreen = useOnScreen(box);

  const joiner = url && url.includes('?') ? '&' : '?';
  const src = url ? `${url}${joiner}${extraQuery ? `${extraQuery}&` : ''}vent_replay=${replay}` : '';

  return (
    <div className={styles.preview} ref={box}>
      {onScreen && url
        ? (
          <iframe key={`${url}-${replay}`} className={styles.frame}
                  title={title} src={src} loading="lazy" scrolling="no" />
        )
        : (
          <span className={styles.resting}>
            {tt('studio.previewResting', 'Scroll to it to play')}
          </span>
        )}
    </div>
  );
}

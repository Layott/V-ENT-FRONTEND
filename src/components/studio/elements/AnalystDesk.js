'use client';

// C3, the analyst desk. Furniture around a camera, not a card.
//
// Ported from the approved pack: `desk_frame()` in
// `CLAUDE/VIDEOS/RIVALRY/stream_more.py`, called as
// `desk_frame("C3 analyst desk", "Analyst desk", "THE DESK", "ANALYSTS")`,
// and rendered with `header=False` so the series mark and the CADE lockup do
// not appear on it.
//
// **The whole graphic is one plate in the bottom left corner.** That is not a
// simplification of the original, it is the original: the 1920x1080 stage
// carries nothing else, because the rest of it is the camera. Their own note
// on the source reads "the middle of the frame left alone because that is
// where the people are", and Layo took the sponsor rail off both camera
// frames on 4 September, so `C5 sponsor bar` is its own source and the
// operator puts it where they want it.
//
// So the hole is the frame minus the plate, and every pixel of it stays
// transparent. Nothing here paints a background.

import { useT } from '@/i18n/LanguageProvider';
import rv from './rivalry.module.css';
import styles from './analyst-desk.module.css';

export default function AnalystDesk({ payload }) {
  const tt = useT();

  // The pack's own two fields. `label` names where the picture is coming from
  // and `note` says who is in it, and both are words rather than numbers, so
  // the operator owns them. There is nothing on a tournament that honestly
  // says who is sitting at the desk today.
  const label = payload.label || tt('studio.rv.theDesk', 'The desk');
  const note = payload.note || tt('studio.rv.analysts', 'Analysts');

  return (
    <div className={`${rv.rv} ${rv.frame}`}>
      <div className={`${styles.plate} ${rv.wipeIn}`}>
        <div className={styles.plk}>{label}</div>
        <div className={styles.pln}>{note}</div>
      </div>
    </div>
  );
}

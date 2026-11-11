'use client';

// The actions on a console row that should not be one press away (Apple
// review S12, inbox 569): Ban on every row of the users list, Remove under
// every community message. They sit behind "More options", last, so the row
// shows what it is before what can be done to it, and a stray press on a
// phone cannot reach them. Escape or a press anywhere else closes the menu.

import { useEffect, useRef, useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';
import { useT } from '@/i18n/LanguageProvider';
import styles from './row-menu.module.css';

export default function RowMenu({ label, children }) {
  const tt = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.trigger} aria-haspopup="menu" aria-expanded={open}
              aria-label={label || tt('ui.moreOptions', 'More options')}
              onClick={() => setOpen((v) => !v)}>
        <BsThreeDots aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

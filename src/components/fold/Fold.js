'use client';

// A section that opens and closes, and says its current answer while closed.
//
// CEO, 12 November 2026 (inbox 594-9), on the tournament edit page: one
// 4,360px page with about forty fields and seven settings groups. Each section
// is now one row, "Check-in: 15 minutes before, no-shows forfeited", and opens
// when somebody wants to change it. The answer on the closed row is the point:
// a reader can check the whole tournament without opening anything.
//
// The whole row is the control (44px at least), its state is aria-expanded,
// and a tip or any other button sits BESIDE the row, never inside it (a button
// inside a button is invalid and the inner one never gets the press).

import { useId, useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';
import styles from './fold.module.css';

export default function Fold({
  title,
  summary = '',
  defaultOpen = false,
  as: Heading = 'h2',
  aside = null,
  tone = 'panel',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={`${styles.fold} ${tone === 'inset' ? styles.inset : ''} ${open ? styles.open : ''}`}>
      <div className={styles.headRow}>
        <Heading className={styles.heading}>
          <button type="button" className={styles.head} aria-expanded={open} aria-controls={id}
                  onClick={() => setOpen((v) => !v)}>
            <span className={styles.text}>
              <span className={styles.title}>{title}</span>
              {!open && summary ? <span className={styles.summary}>{summary}</span> : null}
            </span>
            <IoChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
          </button>
        </Heading>
        {aside ? <span className={styles.aside}>{aside}</span> : null}
      </div>
      {open && <div id={id} className={styles.body}>{children}</div>}
    </section>
  );
}

'use client';

// The inline error panel shared by every wizard step, in both wizards.
//
// It renders at the TOP of the step and the Proceed button is at the BOTTOM of
// a form that is several screens long. So somebody filling this in pressed
// Proceed, the page did not move, and nothing they could see changed: the list
// of what was missing was drawn two screens above them. The reasonable
// conclusion is that the button is broken, and the reported symptom was
// "I always have to re-enter everything" - because they reloaded.
//
// So it brings itself into view, and says so out loud for a screen reader.
// `role="alert"` alone does not scroll anything.

import { useEffect, useRef } from 'react';
import { useT, useTx } from '@/i18n/LanguageProvider';
import styles from './validation-summary.module.css';

const ValidationSummary = ({ errors = {} }) => {
  const tt = useT();
  // The messages come from the zod schemas as English sentences. `tx` is the
  // reverse lookup built for exactly that: it finds the key whose English
  // value matches and returns the reader's language, and hands back the
  // English unchanged when there is no entry.
  const tx = useTx();
  const ref = useRef(null);
  const messages = Object.values(errors).filter(Boolean);
  const signature = messages.join('|');

  useEffect(() => {
    if (!signature || !ref.current) return;
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focused as well as scrolled, so somebody on a keyboard or a screen
    // reader lands on the reason rather than being silently returned to the
    // top of a form.
    ref.current.focus({ preventScroll: true });
  }, [signature]);

  if (messages.length === 0) return null;

  return (
    <div className={styles.validationSummary} role="alert" tabIndex={-1} ref={ref}>
      <p className={styles.validationSummaryTitle}>
        {tt('wizard.fixThese', 'Please fix the following before continuing:')}
      </p>
      <ul className={styles.validationSummaryList}>
        {messages.map((message) => (
          <li key={message}>{tx(message)}</li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationSummary;

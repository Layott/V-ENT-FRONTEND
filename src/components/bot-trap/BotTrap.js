'use client';

// The honeypot half of the bot check (src/lib/botChallenge.js). Off screen,
// out of the tab order and hidden from screen readers, so a person never
// meets it; a script that fills every input it finds fills this one, and the
// server refuses the form. Uncontrolled, read by name on submit.
import styles from './BotTrap.module.css';
import { HONEYPOT_FIELD } from '@/lib/botChallenge';

export default function BotTrap({ inputRef }) {
  return (
    <div className={styles.trap} aria-hidden="true">
      <label>
        Website
        <input ref={inputRef} type="text" name={HONEYPOT_FIELD} tabIndex={-1}
               autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

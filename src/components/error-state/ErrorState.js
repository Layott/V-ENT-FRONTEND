'use client';

/**
 * What a list or a page shows when its first load failed.
 *
 * Forty-two files on this site could sit on "Loading..." for ever, or fall
 * through to a sentence that was written for a different situation: "No
 * threads in this category." when the request never came back, "User not
 * found." when the network was down. `check-spinner-forever` counts them, and
 * the rule at its head is the whole of this component: a failed load says so
 * ON THE PAGE, where the loading state was, with a way to try again. A toast is
 * gone in four seconds and leaves the loading state behind it.
 *
 * The sentence comes from `apiMessage`, so it is the server's own code
 * translated, never "Failed to fetch". The button calls the page's loader
 * again rather than reloading the window, so filters, tabs and typed text
 * survive the retry.
 *
 * Deliberately plain: a filled surface, one sentence, one button. It sits
 * inside whatever card or column the loading text sat in, so it inherits the
 * page's own width and spacing.
 */
import { useT } from '@/i18n/LanguageProvider';
import styles from './error-state.module.css';

export default function ErrorState({ message, onRetry, compact = false }) {
  const tt = useT();
  return (
    <div className={compact ? styles.compact : styles.wrap} role="alert">
      <p className={styles.text}>
        {message || tt('error.loadFailed', 'That did not load. Check your connection and try again.')}
      </p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      )}
    </div>
  );
}

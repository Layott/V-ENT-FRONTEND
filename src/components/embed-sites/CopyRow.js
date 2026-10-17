'use client';
/**
 * One snippet to copy: a label, a line saying when to use it, the code, and a
 * Copy button. Shared by the event console's "Website and embeds" tab and the
 * tournament console's "On your website" tab (inbox 360, P8), so a snippet
 * looks and copies the same wherever it is offered.
 */
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from '@/components/event-site/event-site-panel.module.css';

export default function CopyRow({ label, hint, code }) {
  const tt = useT();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Blocked clipboard: the code is on screen and selectable.
    }
  };
  return (
    <div className={styles.snippet}>
      <div className={styles.snippetHead}>
        <p className={styles.snippetLabel}>{label}</p>
        <button type="button" className={styles.chip} onClick={copy}>
          {copied ? tt('siteConsole.copied', 'Copied') : tt('siteConsole.copy', 'Copy')}
        </button>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
      <pre className={styles.code}><code>{code}</code></pre>
    </div>
  );
}

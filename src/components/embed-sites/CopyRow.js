'use client';
/**
 * One snippet to copy: a label, a line saying when to use it, the code, and a
 * Copy button. Shared by the event console's "Website and embeds" tab and the
 * tournament console's "On your website" tab (inbox 360, P8), so a snippet
 * looks and copies the same wherever it is offered.
 */
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from '@/components/event-site/event-site-panel.module.css';

export default function CopyRow({ label, hint, code }) {
  const tt = useT();
  const [copied, setCopied] = useState(false);
  const [byHand, setByHand] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  // The browser can refuse the clipboard (a page not in front, an older
  // browser, a setting). The button then did nothing and said nothing (walk,
  // 17 October 2026). Now the code is selected and copied the older way, and
  // when even that is refused, the person is told the code is selected and
  // how to copy it.
  const copy = async () => {
    setByHand(false);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      return;
    } catch {
      // fall through to the selection
    }
    const node = box.current;
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    let done = false;
    try { done = document.execCommand('copy'); } catch { done = false; }
    if (done) setCopied(true);
    else setByHand(true);
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
      {byHand && (
        <p className={styles.hint} role="status">
          {tt('siteConsole.copyByHand', 'Your browser did not let V-ENT copy it. The code is selected: press Ctrl+C, or Cmd+C on a Mac, or hold it and choose Copy on a phone.')}
        </p>
      )}
      <pre className={styles.code}><code ref={box}>{code}</code></pre>
    </div>
  );
}

'use client';

// "What is this page?", one tap away, on every page and every sub-page.
//
// This replaces a six-minute welcome tour that explained the whole platform to
// somebody who had seen none of it. The CEO's objection was the right one: it is
// too long, and it arrives at the moment a new person has the least reason to
// care. Help that only ever describes the page in front of you is shorter to
// read, arrives when the question is actually being asked, and does not have to
// be sat through in one go.
//
// Mounted once in the root layout, so there is nothing to remember to add when
// somebody builds a new page. A page with no guide shows no button rather than
// an empty panel - a help button that opens nothing is worse than none.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LuCircleHelp, LuX } from 'react-icons/lu';
import { guideFor } from './pageGuides';
import { useT } from '@/i18n/LanguageProvider';
import styles from './page-help.module.css';

// Pages that are already an explanation, or where a floating button would sit
// on top of the thing somebody is trying to use.
const SILENT = [/^\/onboarding/, /^\/tournaments\/overlay/, /^\/events\/scan/];

export default function PageHelp() {
  const tt = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const path = pathname || '/';
  const guide = guideFor(path);
  const hidden = SILENT.some((r) => r.test(path.replace(/^\/(en|fr|pt)(?=\/|$)/, '')));

  // Closing on Escape, and on a route change. Leaving it open across a
  // navigation would describe the page somebody just left.
  useEffect(() => { setOpen(false); }, [pathname]);

  const onKey = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  // The mobile menu opens this, because on a phone the floating trigger is
  // gone. An event rather than a context: PageHelp and the sidebar sit in
  // different parts of the tree, and a provider wrapping both would have to
  // exist above a layout neither of them owns.
  useEffect(() => {
    const ask = () => setOpen(true);
    window.addEventListener('vent:help', ask);
    return () => window.removeEventListener('vent:help', ask);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onKey]);

  if (!guide || hidden) return null;

  const label = tt('help.button', 'What is this page?');

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <LuCircleHelp aria-hidden="true" />
      </button>

      {open && (
        <div
          className={styles.scrim}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className={styles.panel}>
            <div className={styles.head}>
              <div>
                <span className={styles.kicker}>{label}</span>
                <h2 className={styles.title}>{tt(`guide.${guide.key}.title`, guide.title)}</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label={tt('help.close', 'Close')}
                onClick={() => setOpen(false)}
              >
                <LuX aria-hidden="true" />
              </button>
            </div>

            <p className={styles.what}>{tt(`guide.${guide.key}.what`, guide.what)}</p>

            {guide.does?.length > 0 && (
              <>
                <span className={styles.subhead}>
                  {tt('help.whatYouCanDo', 'What you can do here')}
                </span>
                <ul className={styles.list}>
                  {guide.does.map((line, i) => {
                    const text = tt(`guide.${guide.key}.does.${i}`, line);
                    const to = guide.goes?.[i];
                    // A line that names a fixed page is the way there. One that
                    // describes something on this page stays plain text: a link
                    // back to the page you are already on teaches nothing.
                    return to ? (
                      <li key={line}>
                        <Link
                          href={to}
                          className={`${styles.item} ${styles.itemLink}`}
                          onClick={() => setOpen(false)}
                        >
                          <span>{text}</span>
                          <span className={styles.go} aria-hidden="true">&rsaquo;</span>
                        </Link>
                      </li>
                    ) : (
                      <li key={line} className={styles.item}>{text}</li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* The sentence somebody could not have guessed. Every guide that
                has one puts it last, because it is the part worth remembering
                rather than the part needed to get started. */}
            {guide.note && (
              <p className={styles.note}>{tt(`guide.${guide.key}.note`, guide.note)}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

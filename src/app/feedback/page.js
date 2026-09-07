'use client';

// Somewhere to say what is wrong.
//
// CEO, 7 September 2026: "Let'salso have a place for feedbck."
//
// Deliberately open to somebody with no account. The most useful report comes
// from a person who hit a wall, and the wall is sometimes the sign-in page, so
// demanding they sign in first loses exactly the reports worth having. Signed
// in, we know who they are and the address field disappears.
//
// The areas and kinds come from the server rather than being a second copy of
// the same list here. Two copies is how a form ends up offering a choice the
// database refuses.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { apiMessage } from '@/lib/apiMessage';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { useT } from '@/i18n/LanguageProvider';
import styles from './feedback.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function FeedbackContent() {
  const tt = useT();
  const params = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const token = session?.user?.sessionToken;
  const signedIn = authStatus === 'authenticated';

  const [choices, setChoices] = useState({ areas: [], kinds: [], max_message: 4000 });
  const [area, setArea] = useState(params.get('area') || 'other');
  const [kind, setKind] = useState('broken');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Where they came from, sent with the report. It is worth more than most of
  // the message: "the button does nothing" cannot be acted on until somebody
  // knows which page the button was on.
  const [page, setPage] = useState('');
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPage(document.referrer || '');
    }
  }, []);

  const loadChoices = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/feedback/`);
      const body = await res.json();
      if (res.ok && body.status === 'success') setChoices(body.data);
    } catch {
      // The form still works with the defaults it was rendered with. A page
      // that cannot list its own categories should not refuse the report.
    }
  }, []);
  useEffect(() => { loadChoices(); }, [loadChoices]);

  const send = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/feedback/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ area, kind, message, email, page }),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.feedbackFailed',
                            'That did not send. Try again in a moment.'));
        return;
      }
      setSent(true);
      setMessage('');
    } catch {
      setError(tt('msg.connectionError', 'Connection error.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>

          <header className={styles.hero}>
            <h1 className={styles.headline}>
              {tt('feedback.title', 'Tell us what is wrong')}
            </h1>
            <p className={styles.lede}>
              {tt('feedback.lede', 'V-ENT is free while we build it, and the deal is that you use it hard and tell us what got in your way. Broken, confusing, missing, or something that works well and should not be changed: all of it is useful.')}
            </p>
          </header>

          {sent ? (
            /* A real confirmation, not a toast that vanishes. Somebody who has
               just described a problem should be able to see that it landed. */
            <section className={styles.done}>
              <h2 className={styles.doneTitle}>{tt('feedback.doneTitle', 'That is logged. Thank you.')}</h2>
              <p className={styles.lede}>
                {tt('feedback.doneBody', 'Somebody reads these. If you left an address and it needs an answer, you will get one.')}
              </p>
              <div className={styles.doneRow}>
                <button type="button" className={styles.quiet}
                        onClick={() => setSent(false)}>
                  {tt('feedback.another', 'Send another')}
                </button>
                <Link href="/tournaments" className={styles.quiet}>
                  {tt('feedback.back', 'Back to tournaments')}
                </Link>
              </div>
            </section>
          ) : (
            <form className={styles.form} onSubmit={send}>

              {/* Chips rather than two native dropdowns.
                  The site picks with filled chips everywhere else, a chip shows
                  every option at once instead of hiding them behind a click,
                  and a native select on Android draws the platform's own grey
                  box in the middle of a dark page. */}
              <fieldset className={styles.group}>
                <legend className={styles.legend}>{tt('feedback.area', 'What is it about')}</legend>
                <div className={styles.chips}>
                  {choices.areas.map((a) => (
                    <button key={a.value} type="button"
                            className={area === a.value ? styles.chipOn : styles.chip}
                            aria-pressed={area === a.value}
                            onClick={() => setArea(a.value)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.group}>
                <legend className={styles.legend}>{tt('feedback.kind', 'What kind of thing')}</legend>
                <div className={styles.chips}>
                  {choices.kinds.map((k) => (
                    <button key={k.value} type="button"
                            className={kind === k.value ? styles.chipOn : styles.chip}
                            aria-pressed={kind === k.value}
                            onClick={() => setKind(k.value)}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* The part that matters, sized like it. */}
              <div className={styles.group}>
                <label className={styles.legend} htmlFor="fb-message">
                  {tt('feedback.message', 'What happened')}
                </label>
                <textarea id="fb-message" className={styles.textarea} rows={8}
                          value={message} maxLength={choices.max_message}
                          placeholder={tt('feedback.placeholder', 'What were you trying to do, and what did the site do instead?')}
                          onChange={(e) => setMessage(e.target.value)} />
                <span className={styles.count}>
                  {message.length} / {choices.max_message}
                </span>
              </div>

              {/* Only when we do not already know who they are. */}
              {!signedIn && (
                <div className={styles.group}>
                  <label className={styles.legend} htmlFor="fb-email">
                    {tt('feedback.email', 'Your email, if you want an answer')}
                  </label>
                  <input id="fb-email" className={styles.input} type="email" value={email}
                         placeholder={tt('feedback.emailPlaceholder', 'Optional')}
                         onChange={(e) => setEmail(e.target.value)} />
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.submitRow}>
                <button type="submit" className={`${styles.send} grnBTN`}
                        disabled={sending || message.trim().length < 10}>
                  {sending ? tt('feedback.sending', 'Sending...') : tt('feedback.send', 'Send it')}
                </button>
                <p className={styles.note}>
                  {tt('feedback.note', 'You do not need an account to send this.')}
                </p>
              </div>
            </form>
          )}

        </div>
      </main>
      <BottomMenu />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <FeedbackContent />
    </Suspense>
  );
}

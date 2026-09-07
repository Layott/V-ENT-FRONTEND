'use client';

/**
 * The other ways in, on both the login and the signup page.
 *
 * There is one of these because there was nearly one: the login page drew
 * Google as a pill sized to its own text and the partner sign-in as a
 * full-width bar with its own margin, side by side in a centred row, so they
 * came out at different widths and different heights and read as two unrelated
 * controls. The signup page had the Google pill and no partner button at all,
 * so somebody could sign in with their African Free Fire Community account but
 * not sign up with it.
 *
 * Now every provider is the same shape, stacked, and both pages render this.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getSession, signIn } from 'next-auth/react';

import { useT, useTx } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import googleLogo from '../../../public/images/google.svg';
import afcMark from '../../../public/images/afc-mark.svg';
import styles from './AuthProviders.module.css';

// A partner's own mark. Google, Discord and Steam are drawn from their real
// logos, so a partner drawn as two grey letters next to them reads as the one
// that is not quite a real option.
//
// AFC's is now their published vector rather than a crop of a raster: they
// serve one at api.africanfreefirecommunity.com/sso/brand/logo.svg, and their
// brand page asks for the `?on=dark` variant on a dark surface, because the
// wordmark in the default mark is near-black and disappears against one. Held
// here rather than hotlinked, because our login page should not stop drawing
// correctly on a day their site is down - which has happened. Re-fetch it if
// their brand JSON changes: curl https://api.africanfreefirecommunity.com/sso/brand/
//
// A partner with no artwork still falls back to its monogram.
const MARKS = { afc: afcMark };

const AuthProviders = ({ mode = 'signin', disabled = false, callbackUrl, onError, onBusy }) => {
  const tt = useT();
  const tx = useTx();
  const [external, setExternal] = useState({});
  // Whether signing in with Discord is set up on this server. Asked rather
  // than assumed, so a missing client secret means the button is absent
  // instead of present and broken.
  const [discordOn, setDiscordOn] = useState(false);

  // Which outside sign-ins are actually live. A provider missing its
  // credentials answers `configured: false` and is not drawn at all, rather
  // than drawn and then failing when somebody presses it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/inbound/providers/`);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setExternal(body?.data?.providers || {});
      } catch {
        /* the page works without them */
      }
    })();
    (async () => {
      try {
        // 503 with DISCORD_SIGNIN_NOT_SET is the honest "not set up yet", and
        // 400 is "you are not signed in", which for THIS endpoint is fine
        // because it is public. Anything that answers with a URL is live.
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/discord/start/`);
        const body = await res.json().catch(() => ({}));
        if (!cancelled) setDiscordOn(Boolean(body?.data?.url));
      } catch {
        /* the page works without it */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Discord, through the same popup the partner sign-ins use. Same window,
  // same watcher, same handback: a second copy of that machinery is how one of
  // them ends up without the severed-opener fallback.
  const discord = async () => {
    onBusy?.(true);
    let popup = null;
    try {
      popup = window.open('', 'vent-sso-discord', 'width=520,height=760,menubar=no,toolbar=no');
    } catch {
      popup = null;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/discord/start/`);
      const body = await res.json();
      if (res.ok && body?.data?.url) {
        if (popup && !popup.closed) {
          popup.location.href = body.data.url;
          watchPopup(popup);
        } else {
          window.location.href = body.data.url;
        }
        return;
      }
      popup?.close();
      onError?.(apiMessage(tt, body, 'api.thatSignInIsNot', 'That sign-in is not available yet.'));
    } catch {
      popup?.close();
      onError?.(tt('msg.thatSignInCouldNot', 'That sign-in could not be started.'));
    }
    onBusy?.(false);
  };

  const google = async () => {
    onBusy?.(true);
    try {
      await signIn('google', {
        redirect: true,
        callbackUrl: callbackUrl || `${window.location.origin}/home`,
        prompt: 'select_account consent',
      });
      // Nothing is announced here. signIn() with redirect: true resolves as
      // soon as the browser starts leaving for Google, long before anyone has
      // picked an account. The outcome arrives back on the callback page.
    } catch {
      onError?.(tt('msg.couldNotStartGoogle', 'Could not start the Google sign-in. Try again.'));
      onBusy?.(false);
    }
  };

  const startExternal = async slug => {
    onBusy?.(true);

    // A window rather than the whole page. The CEO asked why pressing this
    // takes you off v-ent.co entirely; it does not have to. What it cannot be
    // is an in-page modal: an outside sign-in form can only be embedded in an
    // iframe if that site allows it, AFC sends `X-Frame-Options: SAMEORIGIN`,
    // and a login form for another site rendered inside ours is the shape of a
    // phishing page whether or not we mean it that way. A named popup keeps
    // this page underneath, keeps the address bar visible so somebody can see
    // whose site they are typing into, and hands the result back here.
    //
    // Opened here, before the await. A popup opened after one is no longer tied
    // to the click that asked for it and browsers block it.
    let popup = null;
    try {
      popup = window.open('', `vent-sso-${slug}`, 'width=520,height=680,menubar=no,toolbar=no');
    } catch {
      popup = null;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/inbound/${slug}/start/`);
      const body = await res.json();
      if (res.ok && body?.data?.url) {
        if (popup && !popup.closed) {
          popup.location.href = body.data.url;
          watchPopup(popup);
        } else {
          // Blocked, or a browser that turns popups into tabs and lost this
          // one. The whole-page redirect still works, so use it rather than
          // reporting a failure.
          window.location.href = body.data.url;
        }
        return;
      }
      popup?.close();
      onError?.(apiMessage(tt, body, 'api.thatSignInIsNot', 'That sign-in is not available yet.'));
    } catch {
      popup?.close();
      onError?.(tt('msg.thatSignInCouldNot', 'That sign-in could not be started.'));
    }
    onBusy?.(false);
  };

  // The popup finishes on /auth/external, which posts the session token back
  // here and closes itself. Nothing is trusted that did not come from this
  // origin: the token is a live session, and a message from anywhere else is
  // somebody else's page talking to ours.
  // How the popup's result gets back here.
  //
  // Two ways, because one of them is not reliable. `postMessage` from the popup
  // is the fast path, but this window has sat still while that popup went to
  // the provider and came back, and a browser may sever `window.opener` across
  // that. The CEO hit exactly this: the popup signed in and then sat on /home,
  // because its message went nowhere and nothing here was watching.
  //
  // So the second way needs no channel at all. The popup signs in against this
  // same origin, so its cookie is this window's cookie: watching for a session
  // to appear works whether or not the opener survived.
  const watchPopup = popup => {
    let settled = false;
    let timer = null;

    const stop = () => {
      settled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener('message', onMessage);
    };

    const go = () => {
      window.location.href = callbackUrl || `${window.location.origin}/home`;
    };

    async function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== 'v-ent-sso') return;
      if (settled) return;
      stop();

      if (!event.data.token) {
        onError?.(tt('msg.thatSignInCouldNot', 'That sign-in could not be started.'));
        onBusy?.(false);
        return;
      }
      const result = await signIn('external-token', {
        token: event.data.token,
        redirect: false,
      });
      if (result?.ok) return go();
      onError?.(tt('msg.thatSignInCouldNot', 'That sign-in could not be started.'));
      onBusy?.(false);
    }
    window.addEventListener('message', onMessage);

    timer = setInterval(async () => {
      if (settled) return;

      const session = await getSession().catch(() => null);
      if (session?.user) {
        stop();
        try { if (!popup.closed) popup.close(); } catch { /* not ours to close */ }
        return go();
      }

      // Somebody who closed the window without finishing has not failed at
      // anything, but the button must stop saying it is working.
      if (popup.closed) {
        stop();
        onBusy?.(false);
      }
    }, 900);
  };

  const rows = Object.entries(external).filter(([, meta]) => meta.configured);

  return (
    <div className={styles.list}>
      <button
        type="button"
        className={styles.provider}
        onClick={google}
        disabled={disabled}
        aria-label={mode === 'signup'
          ? tt('ui.sign.up.google.3384', 'Sign up with Google')
          : tt('ui.sign.google.4a0b', 'Sign in with Google')}
      >
        <span className={`${styles.mark} ${styles.markLight}`}>
          <Image src={googleLogo} alt="" aria-hidden="true" className={styles.googleMark} />
        </span>
        <span className={styles.label}>{tt('ui.google.2b68', 'Google')}</span>
      </button>

      {discordOn && (
        <button
          type="button"
          className={styles.provider}
          onClick={discord}
          disabled={disabled}
          aria-label={mode === 'signup'
            ? tt('auth.signUpDiscord', 'Sign up with Discord')
            : tt('auth.signInDiscord', 'Sign in with Discord')}
        >
          <span className={`${styles.mark} ${styles.markPlain}`}>
            {/* Discord's own mark, inline rather than fetched, so the login
                page keeps drawing on a day their CDN does not. */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
              <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.35-1.22.644-1.873.891a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.057c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.332-.955 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z" />
            </svg>
          </span>
          <span className={styles.label}>{tt('auth.discord', 'Discord')}</span>
        </button>
      )}

      {rows.map(([slug, meta]) => (
        <button
          key={slug}
          type="button"
          className={styles.provider}
          onClick={() => startExternal(slug)}
          disabled={disabled}
        >
          <span className={`${styles.mark} ${MARKS[slug] ? styles.markPlain : styles.markMuted}`}>
            {MARKS[slug]
              ? <Image src={MARKS[slug]} alt="" aria-hidden="true" className={styles.partnerMark} />
              : <span className={styles.monogram}>{meta.short || slug.toUpperCase().slice(0, 3)}</span>}
          </span>
          {/* The short name. AFC's brand rules say in as many words not to use
              the full name as a button label - "African Free Fire Community"
              set as one makes the button about twice the width of every other
              provider on the row. The full name still names the row in the
              settings panel, which is a description rather than a button. */}
          <span className={styles.label}>{tx(meta.short || meta.label)}</span>
        </button>
      ))}
    </div>
  );
};

export default AuthProviders;

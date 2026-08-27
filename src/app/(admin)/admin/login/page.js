'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logoRed from '@/images/logo_mark_red.svg';
import styles from './login.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
export default function AdminLoginPage() {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [enrollment, setEnrollment] = useState(null); // { secret, uri }
  const [qr, setQr] = useState('');
  const { data: session, status: sessionStatus } = useSession();
  const siteToken = session?.user?.sessionToken;
  const steppedUp = useRef(false);
  const [steppedUpFromSession, setSteppedUpFromSession] = useState(false);

  // The cookie is what middleware checks, so it is what decides whether this
  // person is already through the door. localStorage is only a mirror of it.
  const adminCookie = () => (typeof document === 'undefined' ? '' :
    (document.cookie.match(/(?:^|;\s*)adminToken=([^;]*)/) || [, ''])[1]);

  // Draw the enrolment QR. `qrcode` was already a dependency and the URI was
  // already in the response; only this was missing.
  useEffect(() => {
    const uri = enrollment?.uri;
    if (!uri) { setQr(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(uri, {
          width: 190,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) setQr(url);
      } catch {
        // The secret is always shown as text beneath, so this stays usable.
      }
    })();
    return () => { cancelled = true; };
  }, [enrollment?.uri]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Already through: the cookie is present, so /admin will let us in.
    if (adminCookie()) { router.replace('/admin'); return; }
    // The cookie has lapsed but localStorage kept its copy. Believing that copy
    // is what produced the redirect loop, so drop it and let the step-up below
    // ask for a fresh code.
    if (localStorage.getItem('adminToken')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
  }, [router]);

  // Already signed in as this person? Then the password half is answered, and
  // asking again proves nothing the session does not already prove. Trade the
  // session for the same pending token the password path issues and open on the
  // code field.
  //
  // The second factor is untouched. This never yields a session token for the
  // console - only /auth/admin/2fa/verify/ does that, after a real TOTP code.
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !siteToken) return;
    if (adminCookie()) return;                        // the effect above is taking it
    if (steppedUp.current) return;                    // once per mount
    steppedUp.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/step-up/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     Authorization: `Bearer ${siteToken}` },
        });
        const data = await res.json();
        if (cancelled || data.status !== 'success') return;   // not an admin: the form stands

        setPendingToken(data.data.pending_token);
        setShow2fa(true);
        setSteppedUpFromSession(true);
        if (data.data.enrollment_required) {
          setEnrollment({ secret: data.data.secret, uri: data.data.provisioning_uri });
          setSuccessMsg(tt('msg.setUpTwoFactorToFinish',
            'Set up two-factor authentication to finish signing in.'));
        } else {
          setSuccessMsg(tt('msg.signedInEnterYourCode',
            'Signed in already. Enter your authenticator code.'));
        }
      } catch {
        // Leave the credentials form standing; it still works.
      }
    })();
    return () => { cancelled = true; };
  }, [sessionStatus, siteToken, tt]);
  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // ── Step 2: verify the authenticator code ──
    if (show2fa) {
      if (code.length !== 6) {
        setError(tt("msg.enterTheDigitCodeFrom", "Enter the 6-digit code from your authenticator app."));
        triggerShake();
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/2fa/verify/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pending_token: pendingToken,
            code
          })
        });
        const data = await res.json();
        if (data.status !== 'success') {
          setError(apiMessage(tt, data, "api.thatCodeIsNotValid", "That code is not valid."));
          triggerShake();
          setLoading(false);
          return;
        }
        const token = data.data.session_token;
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.admin));
        document.cookie = `adminToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        setSuccessMsg(tt('msg.authenticatedRedirecting', 'Authenticated. Redirecting...'));
        setTimeout(() => router.replace('/admin'), 400);
      } catch {
        setError(tt("msg.connectionErrorPleaseTryAgain", "Connection error. Please try again."));
        triggerShake();
        setLoading(false);
      }
      return;
    }

    // ── Step 1: credentials ──
    if (!email.trim() || !password.trim()) {
      setError(tt("msg.emailAndPasswordAreRequired", "Email and password are required."));
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });
      const data = await res.json();
      if (data.status !== 'success') {
        setError(apiMessage(tt, data, "api.invalidCredentials", "Invalid credentials."));
        triggerShake();
        setLoading(false);
        return;
      }

      // The server never issues a session token here - only a short-lived
      // pending token that the authenticator code exchanges for one.
      setPendingToken(data.data.pending_token);
      setShow2fa(true);
      setLoading(false);
      if (data.data.enrollment_required) {
        setEnrollment({
          secret: data.data.secret,
          uri: data.data.provisioning_uri
        });
        setSuccessMsg(tt('msg.setUpTwoFactorToFinish', 'Set up two-factor authentication to finish signing in.'));
      } else {
        setSuccessMsg(tt('msg.credentialsAcceptedEnterCode', 'Credentials accepted. Enter your authenticator code.'));
      }
    } catch {
      setError(tt("msg.connectionErrorPleaseTryAgain", "Connection error. Please try again."));
      triggerShake();
      setLoading(false);
    }
  }
  return <div className={styles.page}>
      <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <Image src={logoRed} alt="V-ENT" height={28} />
          <span className={styles.logoText}>v-ent</span>
        </div>
        <p className={styles.portalLabel}>{tt("ui.admin.portal.c864", "Admin Portal")}</p>
        <div className={styles.divider} />

        {/* Somebody who is already signed in is confirming, not signing in.
            Heading the page "Sign in to Admin" made a one-step confirmation
            read as a second login, which is what was reported. */}
        <h1 className={styles.title}>
          {steppedUpFromSession
            ? tt("ui.confirm.its.you", "Confirm it's you")
            : tt("ui.sign.admin.4bc6", "Sign in to Admin")}
        </h1>
        <p className={styles.subtitle}>
          {steppedUpFromSession
            ? tt("ui.already.signed.in.confirm", "You are signed in already. Enter the 6-digit code from your authenticator app to open the console.")
            : show2fa ? tx("Enter the 6-digit code from your authenticator app.") : tx("This portal is restricted to authorised V-ENT administrators.")}
        </p>

        {error && <p className={styles.errorMsg}>{error}</p>}
        {successMsg && !error && <p className={styles.successMsg}>{successMsg}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!show2fa && <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">{tt("ui.email.username.094f", "Email or username")}</label>
                <input id="email"
            // The API accepts either identifier. type="email" made the
            // browser block username sign-ins before the form ever
            // submitted, with no message.
            type="text" inputMode="email" className={styles.input} placeholder={tt("ui.example.com.username.4483", "you@example.com or username")} value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" disabled={loading} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">{tt("ui.password.8be3", "Password")}</label>
                <div className={styles.pwWrap}>
                  <input id="password" type={showPw ? 'text' : 'password'} className={styles.input} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
                  <button type="button" className={styles.pwToggle} onClick={() => setShowPw(v => !v)} tabIndex={-1} aria-label={tt("ui.toggle.password.visibility.d233", "Toggle password visibility")}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </>}

          {show2fa && enrollment && <div className={styles.enrolBox}>
              <p className={styles.enrolTitle}>{tt("ui.add.v.ent.admin.5df0", "Add V-ENT Admin to your authenticator")}</p>
              <p className={styles.enrolBody}>
                {tt("ui.scan.this.with.authenticator", "Scan this with Google Authenticator, Authy or 1Password. Then enter the 6-digit code it shows.")}
              </p>
              {qr
                ? <img src={qr} alt={tt("ui.enrolment.qr.alt", "QR code that adds V-ENT Admin to your authenticator app")} className={styles.enrolQr} width={190} height={190} />
                : null}
              <p className={styles.enrolBody}>
                {tt("ui.cannot.scan.paste.key", "Cannot scan it? Add an account manually and paste this key instead.")}
              </p>
              <code className={styles.enrolSecret}>{enrollment.secret}</code>
              <p className={styles.enrolHint}>
                {tt("ui.key.shown.once.anyone.3e59", "This key is shown once. Anyone holding it can generate your codes.")}
              </p>
            </div>}

          {show2fa && <div className={styles.field}>
              <label className={styles.label} htmlFor="code">{tt("ui.authenticator.code.2908", "Authenticator code")}</label>
              <input id="code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} className={`${styles.input} ${styles.codeInput}`} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" disabled={loading} autoFocus />
              {/* Nobody who came in through the step-up door typed credentials,
                  so there is nothing to go back to. Offer the way out that
                  actually applies: leave the console. */}
              {steppedUpFromSession
                ? <button type="button" className={styles.linkBtn} onClick={() => router.push('/home')}>
                    ← {tt("ui.leave.admin", "Back to the site")}
                  </button>
                : <button type="button" className={styles.linkBtn} onClick={() => {
                    setShow2fa(false);
                    setCode('');
                    setSuccessMsg('');
                    setPendingToken('');
                    setEnrollment(null);
                  }}>
                    {tt("ui.back.credentials.2ae6", "← Back to credentials")}
                  </button>}
            </div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? tx("Signing in…") : show2fa ? tx("Verify & Sign In") : 'Continue'}
          </button>
        </form>

        <p className={styles.support}>
          {tt("ui.locked.out.ask.another.97dc", "Locked out? Ask another super admin to reset your two-factor enrolment.")}
        </p>
      </div>

      <div className={styles.banner}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p>{tt("ui.secured.admin.area.all.6cdf", "This is a secured admin area. All login attempts are logged. Unauthorised access is prohibited.")}</p>
      </div>
    </div>;
}
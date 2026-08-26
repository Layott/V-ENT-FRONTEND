'use client';

import { useState, useEffect } from 'react';
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
  const [enrollment, setEnrollment] = useState(null); // { secret, provisioning_uri }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('adminToken');
    if (token) router.replace('/admin');
  }, [router]);
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
          setError(data.message || tt("api.thatCodeIsNotValid", "That code is not valid."));
          triggerShake();
          setLoading(false);
          return;
        }
        const token = data.data.session_token;
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.admin));
        document.cookie = `adminToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        setSuccessMsg('Authenticated. Redirecting…');
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
        setError(data.message || tt("api.invalidCredentials", "Invalid credentials."));
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
        setSuccessMsg('Set up two-factor authentication to finish signing in.');
      } else {
        setSuccessMsg('Credentials accepted. Enter your authenticator code.');
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

        <h1 className={styles.title}>{tt("ui.sign.admin.4bc6", "Sign in to Admin")}</h1>
        <p className={styles.subtitle}>
          {show2fa ? tx("Enter the 6-digit code from your authenticator app.") : tx("This portal is restricted to authorised V-ENT administrators.")}
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
                {tt("ui.open.google.authenticator.authy.3215", "Open Google Authenticator, Authy or 1Password, add an account manually and\n                paste this key. Then enter the 6-digit code it shows.")}
              </p>
              <code className={styles.enrolSecret}>{enrollment.secret}</code>
              <p className={styles.enrolHint}>
                {tt("ui.key.shown.once.anyone.3e59", "This key is shown once. Anyone holding it can generate your codes.")}
              </p>
            </div>}

          {show2fa && <div className={styles.field}>
              <label className={styles.label} htmlFor="code">{tt("ui.authenticator.code.2908", "Authenticator code")}</label>
              <input id="code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} className={`${styles.input} ${styles.codeInput}`} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" disabled={loading} autoFocus />
              <button type="button" className={styles.linkBtn} onClick={() => {
            setShow2fa(false);
            setCode('');
            setSuccessMsg('');
            setPendingToken('');
            setEnrollment(null);
          }}>
                {tt("ui.back.credentials.2ae6", "← Back to credentials")}
              </button>
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
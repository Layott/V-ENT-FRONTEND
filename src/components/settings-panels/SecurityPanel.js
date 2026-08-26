'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import shared from './settingsShared.module.css';
import styles from './SecurityPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Recent sign-ins are read from the account. There used to be a fixed list of
// ten invented ones here - a MacBook, an iPad, addresses in Lagos and Abuja -
// shown identically to every user, which defeats the only purpose this table
// has: letting somebody notice a sign-in that was not theirs.
const relativeTime = iso => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

// ── Password strength scoring ────────────────────────────────────────────
const scorePassword = pw => {
  if (!pw) return {
    score: 0,
    label: 'Empty',
    tone: 'empty'
  };
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  // 0..5 → 0..4 buckets
  const score = Math.min(4, s);
  const map = [{
    label: 'Very weak',
    tone: 'weak'
  }, {
    label: 'Weak',
    tone: 'weak'
  }, {
    label: 'Fair',
    tone: 'fair'
  }, {
    label: 'Strong',
    tone: 'good'
  }, {
    label: 'Very strong',
    tone: 'great'
  }];
  return {
    score,
    ...map[score]
  };
};
const SecurityPanel = ({
  security = {},
  onSave,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [logins, setLogins] = useState([]);
  const [loginsLoading, setLoginsLoading] = useState(true);
  useEffect(() => {
    const token = session?.user?.sessionToken;
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/setting/login-activity/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = await res.json();
        if (!cancelled) setLogins(body?.data?.events || []);
      } catch {
        if (!cancelled) setLogins([]);
      } finally {
        if (!cancelled) setLoginsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);
  const [twoFA, setTwoFA] = useState(!!security.two_factor_enabled);
  const [loginAlerts, setLoginAlerts] = useState(security.login_alerts !== false);
  const [showQR, setShowQR] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    setTwoFA(!!security.two_factor_enabled);
    setLoginAlerts(security.login_alerts !== false);
  }, [security]);
  const strength = useMemo(() => scorePassword(newPw), [newPw]);
  const handleToggle2FA = async () => {
    if (!twoFA) {
      // Turning ON - show QR modal first.
      setShowQR(true);
    } else {
      // Turning OFF - confirm via showToast.
      const next = false;
      setTwoFA(next);
      await onSave?.({
        ...security,
        two_factor_enabled: next
      });
      showToast?.('Two-factor authentication disabled', 'error');
    }
  };
  const confirm2FA = async () => {
    setTwoFA(true);
    setShowQR(false);
    await onSave?.({
      ...security,
      two_factor_enabled: true
    });
    showToast?.('Two-factor authentication enabled');
  };
  const toggleLoginAlerts = async () => {
    const next = !loginAlerts;
    setLoginAlerts(next);
    await onSave?.({
      ...security,
      login_alerts: next
    });
  };
  const handlePasswordSubmit = async e => {
    e.preventDefault();
    if (!currentPw) return showToast?.('Enter your current password', 'error');
    if (newPw.length < 8) return showToast?.('New password must be at least 8 characters', 'error');
    if (newPw !== confirmPw) return showToast?.('Passwords do not match', 'error');
    if (strength.score < 2) return showToast?.('Choose a stronger password', 'error');
    setSubmitting(true);
    try {
      // Mock-driven: just delay + toast.
      await new Promise(r => setTimeout(r, 600));
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast?.('Password updated');
    } finally {
      setSubmitting(false);
    }
  };
  return <div className={shared.formStack}>
      {/* Password change */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.change.password.8c68", "Change password")}</h3>
        <p className={shared.cardSub}>{tt("ui.use.least.characters.letters.c05a", "Use at least 8 characters with letters, numbers, and symbols.")}</p>

        <form onSubmit={handlePasswordSubmit}>
          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="cur-pw">{tt("ui.current.password.19df", "Current password")}<InfoTip id="currentPassword" /></label>
            <input id="cur-pw" type="password" className={shared.formInput} value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </div>

          <div className={shared.formRow}>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="new-pw">{tt("ui.new.password.d850", "New password")}<InfoTip id="newPassword" /></label>
              <input id="new-pw" type="password" className={shared.formInput} value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
              <div className={styles.meterWrap}>
                <div className={styles.meterTrack}>
                  <div className={`${styles.meterFill} ${styles[`meter_${strength.tone}`]}`} style={{
                  width: `${strength.score / 4 * 100}%`
                }} />
                </div>
                <span className={`${styles.meterLabel} ${styles[`meterLabel_${strength.tone}`]}`}>
                  {tx(strength.label)}
                </span>
              </div>
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="conf-pw">{tt("ui.confirm.new.password.f850", "Confirm new password")}<InfoTip id="confirmPassword" /></label>
              <input id="conf-pw" type="password" className={shared.formInput} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
              {confirmPw && newPw !== confirmPw && <span className={styles.mismatch}>{tt("ui.passwords.do.not.match.f7c3", "Passwords do not match.")}</span>}
            </div>
          </div>

          <div className={shared.formFooter}>
            <button type="submit" className={`${shared.btn} ${shared.goldBTN}`} disabled={submitting}>
              {submitting ? tx("Updating…") : tx("Update password")}
            </button>
          </div>
        </form>
      </div>

      {/* 2FA */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.two.factor.authentication.edfd", "Two-factor authentication")}<InfoTip id="twoFactor" /></h3>
        <p className={shared.cardSub}>
          {tt("ui.add.extra.layer.security.864d", "Add an extra layer of security by requiring a code from your authenticator app at sign-in.")}
        </p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>
              {tt("ui.authenticator.app.9e71", "Authenticator app")}{' '}
              <span className={`${shared.verifyBadge} ${twoFA ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
                {twoFA ? 'Enabled' : 'Disabled'}
              </span>
            </span>
            <span className={shared.toggleRowSub}>{tt("ui.recommended.use.google.authenticator.39d8", "Recommended. Use Google Authenticator, Authy, or 1Password.")}</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={twoFA} onChange={handleToggle2FA} />
            <span className={shared.toggleSlider} />
          </label>
        </div>
      </div>

      {/* Login alerts */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.login.alerts.bc6f", "Login alerts")}<InfoTip id="loginAlerts" /></h3>
        <p className={shared.cardSub}>{tt("ui.get.notified.when.someone.5d49", "Get notified when someone signs into your account from a new device.")}</p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>{tt("ui.email.me.about.new.a1ca", "Email me about new sign-ins")}</span>
            <span className={shared.toggleRowSub}>{tt("ui.will.receive.email.device.2f2a", "You will receive an email with the device and approximate location.")}</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={loginAlerts} onChange={toggleLoginAlerts} />
            <span className={shared.toggleSlider} />
          </label>
        </div>
      </div>

      {/* Recent activity */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.recent.login.activity.e247", "Recent login activity")}</h3>
        <p className={shared.cardSub}>{tt("ui.last.sign.ins.if.5e67", "Last 10 sign-ins. If anything looks unfamiliar, change your password.")}</p>

        <div className={styles.tableWrap}>
          <table className={styles.loginTable}>
            <thead>
              <tr>
                <th>{tt("ui.device.browser.e7c2", "Device / Browser")}</th>
                <th>{tt("ui.ip.address.99a1", "IP address")}</th>
                <th>{tt("ui.location.d219", "Location")}</th>
                <th>{tt("ui.time.6c82", "Time")}</th>
              </tr>
            </thead>
            <tbody>
              {loginsLoading && <tr>
                  <td colSpan={4}>{tt("ui.loading.recent.sign.ins.71e3", "Loading your recent sign-ins...")}</td>
                </tr>}
              {!loginsLoading && logins.length === 0 && <tr>
                  <td colSpan={4}>{tt("ui.no.sign.ins.recorded.798f", "No sign-ins recorded yet. This fills in from your next sign-in.")}</td>
                </tr>}
              {!loginsLoading && logins.map(row => <tr key={row.id}>
                  <td>
                    <div className={styles.devCell}>
                      <span className={styles.devName}>{row.device}</span>
                      <span className={styles.devBrowser}>
                        {row.method === 'google' ? tx("Signed in with Google") : tx("Password sign-in")}
                      </span>
                    </div>
                  </td>
                  <td>{row.ip || 'Unknown'}</td>
                  <td>{row.location}</td>
                  <td>
                    <span className={styles.timeCell}>
                      {relativeTime(row.time)}
                      {row.current && <span className={styles.currentPill}>{tt("ui.current.4fc0", "Current")}</span>}
                    </span>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA QR Modal */}
      {showQR && <div className={shared.modalBackdrop} onClick={() => setShowQR(false)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{tt("ui.set.up.two.factor.9be4", "Set up two-factor authentication")}</h3>
            <p className={shared.modalSub}>
              {tt("ui.scan.qr.code.below.bd8c", "Scan the QR code below with your authenticator app, then enter the 6-digit code to confirm.")}
            </p>

            <div className={styles.qrWrap}>
              <div className={styles.qrBox} aria-label={tt("ui.qr.code.stub.4715", "QR code stub")}>
                <svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                  <rect width="160" height="160" fill="#fff" />
                  {/* Three corner finder squares */}
                  <rect x="8" y="8" width="36" height="36" stroke="#000" strokeWidth="6" fill="#fff" />
                  <rect x="20" y="20" width="12" height="12" fill="#000" />
                  <rect x="116" y="8" width="36" height="36" stroke="#000" strokeWidth="6" fill="#fff" />
                  <rect x="128" y="20" width="12" height="12" fill="#000" />
                  <rect x="8" y="116" width="36" height="36" stroke="#000" strokeWidth="6" fill="#fff" />
                  <rect x="20" y="128" width="12" height="12" fill="#000" />
                  {/* Random-ish data dots */}
                  {Array.from({
                length: 60
              }).map((_, i) => {
                const x = 56 + i * 7 % 88;
                const y = 56 + Math.floor(i * 11 % 88);
                return <rect key={i} x={x} y={y} width="6" height="6" fill="#000" />;
              })}
                </svg>
              </div>
              <div className={styles.qrManual}>
                <span className={styles.qrManualLabel}>{tt("ui.enter.key.manually.d322", "Or enter this key manually")}</span>
                <code className={styles.qrManualCode}>{tt("ui.jbswy.dpehpk.pxp.b57f", "JBSWY3DPEHPK3PXP")}</code>
              </div>
            </div>

            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="totp">{tt("ui.verification.code.80f2", "Verification code")}<InfoTip id="totpCode" /></label>
              <input id="totp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" className={shared.formInput} />
            </div>

            <div className={shared.modalActions}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setShowQR(false)}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={`${shared.btn} ${shared.goldBTN}`} onClick={confirm2FA}>
                {tt("ui.enable.fa.5f22", "Enable 2FA")}
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export default SecurityPanel;
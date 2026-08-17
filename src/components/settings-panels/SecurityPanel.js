'use client';

import { useState, useEffect, useMemo } from 'react';
import shared from './settingsShared.module.css';
import styles from './SecurityPanel.module.css';

// ── Mock recent login data (10 rows) ─────────────────────────────────────
const RECENT_LOGINS = [
  { id: 'l1', device: 'MacBook Pro 14"', browser: 'Chrome 124', ip: '102.89.221.5', location: 'Lagos, NG', time: 'Just now', current: true },
  { id: 'l2', device: 'iPhone 15', browser: 'Safari 17', ip: '102.89.221.5', location: 'Lagos, NG', time: '2 hours ago' },
  { id: 'l3', device: 'Windows 11 PC', browser: 'Edge 125', ip: '102.89.198.2', location: 'Abuja, NG', time: '3 days ago' },
  { id: 'l4', device: 'iPad Air', browser: 'Safari 17', ip: '102.89.198.2', location: 'Abuja, NG', time: '5 days ago' },
  { id: 'l5', device: 'Android Phone', browser: 'Chrome 124', ip: '197.210.65.32', location: 'Port Harcourt, NG', time: '1 week ago' },
  { id: 'l6', device: 'MacBook Pro 14"', browser: 'Chrome 124', ip: '102.89.221.5', location: 'Lagos, NG', time: '1 week ago' },
  { id: 'l7', device: 'Linux Workstation', browser: 'Firefox 126', ip: '102.89.221.5', location: 'Lagos, NG', time: '2 weeks ago' },
  { id: 'l8', device: 'Windows 11 PC', browser: 'Chrome 124', ip: '102.89.221.5', location: 'Lagos, NG', time: '3 weeks ago' },
  { id: 'l9', device: 'Android Phone', browser: 'Chrome 123', ip: '197.210.65.32', location: 'Port Harcourt, NG', time: '1 month ago' },
  { id: 'l10', device: 'iPhone 14', browser: 'Safari 16', ip: '154.113.99.18', location: 'Accra, GH', time: '2 months ago' },
];

// ── Password strength scoring ────────────────────────────────────────────
const scorePassword = (pw) => {
  if (!pw) return { score: 0, label: 'Empty', tone: 'empty' };
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  // 0..5 → 0..4 buckets
  const score = Math.min(4, s);
  const map = [
    { label: 'Very weak', tone: 'weak' },
    { label: 'Weak', tone: 'weak' },
    { label: 'Fair', tone: 'fair' },
    { label: 'Strong', tone: 'good' },
    { label: 'Very strong', tone: 'great' },
  ];
  return { score, ...map[score] };
};

const SecurityPanel = ({ security = {}, onSave, showToast }) => {
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
      await onSave?.({ ...security, two_factor_enabled: next });
      showToast?.('Two-factor authentication disabled', 'error');
    }
  };

  const confirm2FA = async () => {
    setTwoFA(true);
    setShowQR(false);
    await onSave?.({ ...security, two_factor_enabled: true });
    showToast?.('Two-factor authentication enabled');
  };

  const toggleLoginAlerts = async () => {
    const next = !loginAlerts;
    setLoginAlerts(next);
    await onSave?.({ ...security, login_alerts: next });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPw) return showToast?.('Enter your current password', 'error');
    if (newPw.length < 8) return showToast?.('New password must be at least 8 characters', 'error');
    if (newPw !== confirmPw) return showToast?.('Passwords do not match', 'error');
    if (strength.score < 2) return showToast?.('Choose a stronger password', 'error');

    setSubmitting(true);
    try {
      // Mock-driven: just delay + toast.
      await new Promise((r) => setTimeout(r, 600));
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast?.('Password updated');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={shared.formStack}>
      {/* Password change */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Change password</h3>
        <p className={shared.cardSub}>Use at least 8 characters with letters, numbers, and symbols.</p>

        <form onSubmit={handlePasswordSubmit}>
          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="cur-pw">Current password</label>
            <input
              id="cur-pw"
              type="password"
              className={shared.formInput}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className={shared.formRow}>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="new-pw">New password</label>
              <input
                id="new-pw"
                type="password"
                className={shared.formInput}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
              <div className={styles.meterWrap}>
                <div className={styles.meterTrack}>
                  <div
                    className={`${styles.meterFill} ${styles[`meter_${strength.tone}`]}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
                <span className={`${styles.meterLabel} ${styles[`meterLabel_${strength.tone}`]}`}>
                  {strength.label}
                </span>
              </div>
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="conf-pw">Confirm new password</label>
              <input
                id="conf-pw"
                type="password"
                className={shared.formInput}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPw && newPw !== confirmPw && (
                <span className={styles.mismatch}>Passwords do not match.</span>
              )}
            </div>
          </div>

          <div className={shared.formFooter}>
            <button
              type="submit"
              className={`${shared.btn} ${shared.goldBTN}`}
              disabled={submitting}
            >
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* 2FA */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Two-factor authentication</h3>
        <p className={shared.cardSub}>
          Add an extra layer of security by requiring a code from your authenticator app at sign-in.
        </p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>
              Authenticator app{' '}
              <span className={`${shared.verifyBadge} ${twoFA ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
                {twoFA ? 'Enabled' : 'Disabled'}
              </span>
            </span>
            <span className={shared.toggleRowSub}>Recommended. Use Google Authenticator, Authy, or 1Password.</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={twoFA} onChange={handleToggle2FA} />
            <span className={shared.toggleSlider} />
          </label>
        </div>
      </div>

      {/* Login alerts */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Login alerts</h3>
        <p className={shared.cardSub}>Get notified when someone signs into your account from a new device.</p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>Email me about new sign-ins</span>
            <span className={shared.toggleRowSub}>You will receive an email with the device and approximate location.</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={loginAlerts} onChange={toggleLoginAlerts} />
            <span className={shared.toggleSlider} />
          </label>
        </div>
      </div>

      {/* Recent activity */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Recent login activity</h3>
        <p className={shared.cardSub}>Last 10 sign-ins. If anything looks unfamiliar, change your password.</p>

        <div className={styles.tableWrap}>
          <table className={styles.loginTable}>
            <thead>
              <tr>
                <th>Device / Browser</th>
                <th>IP address</th>
                <th>Location</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_LOGINS.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className={styles.devCell}>
                      <span className={styles.devName}>{row.device}</span>
                      <span className={styles.devBrowser}>{row.browser}</span>
                    </div>
                  </td>
                  <td>{row.ip}</td>
                  <td>{row.location}</td>
                  <td>
                    <span className={styles.timeCell}>
                      {row.time}
                      {row.current && <span className={styles.currentPill}>Current</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA QR Modal */}
      {showQR && (
        <div className={shared.modalBackdrop} onClick={() => setShowQR(false)}>
          <div className={shared.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>Set up two-factor authentication</h3>
            <p className={shared.modalSub}>
              Scan the QR code below with your authenticator app, then enter the 6-digit code to confirm.
            </p>

            <div className={styles.qrWrap}>
              <div className={styles.qrBox} aria-label="QR code stub">
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
                  {Array.from({ length: 60 }).map((_, i) => {
                    const x = 56 + ((i * 7) % 88);
                    const y = 56 + (Math.floor((i * 11) % 88));
                    return <rect key={i} x={x} y={y} width="6" height="6" fill="#000" />;
                  })}
                </svg>
              </div>
              <div className={styles.qrManual}>
                <span className={styles.qrManualLabel}>Or enter this key manually</span>
                <code className={styles.qrManualCode}>JBSWY3DPEHPK3PXP</code>
              </div>
            </div>

            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="totp">Verification code</label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className={shared.formInput}
              />
            </div>

            <div className={shared.modalActions}>
              <button
                type="button"
                className={`${shared.btn} ${shared.ghostBTN}`}
                onClick={() => setShowQR(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${shared.btn} ${shared.goldBTN}`}
                onClick={confirm2FA}
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPanel;

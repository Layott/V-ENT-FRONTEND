'use client';

import { useState, useMemo, useEffect } from 'react';
import shared from './settingsShared.module.css';
import styles from './AccountPanel.module.css';

const formatDate = (iso) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
};

const computeCompletion = (u) => {
  if (!u) return 0;
  const checks = [
    !!u.full_name,
    !!u.username,
    !!u.email,
    !!u.phone || !!u.phone_number,
    !!u.bio || !!u.description,
    !!u.profile_picture || !!u.profile_pic,
    !!u.banner || !!u.banner_picture,
    Array.isArray(u.interests) && u.interests.length > 0,
    Array.isArray(u.favorite_games) && u.favorite_games.length > 0,
    !!u.country,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
};

const AccountPanel = ({ user = {}, onSave, showToast }) => {
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || user.phone_number || '');
  const [fullName, setFullName] = useState(user.full_name || user.fullname || '');
  const [username, setUsername] = useState(user.username || '');
  const [savingField, setSavingField] = useState(null);

  // Re-sync when user prop arrives later.
  useEffect(() => {
    setEmail(user.email || '');
    setPhone(user.phone || user.phone_number || '');
    setFullName(user.full_name || user.fullname || '');
    setUsername(user.username || '');
  }, [user]);

  const completion = useMemo(() => computeCompletion(user), [user]);
  const emailVerified = !!user.email_verified || !!user.is_email_verified;
  const phoneVerified = !!user.phone_verified || !!user.is_phone_verified;
  const memberId = user.id || user.user_id || '-';

  const saveField = async (field, value) => {
    setSavingField(field);
    try {
      await onSave?.({ [field]: value });
    } finally {
      setSavingField(null);
    }
  };

  const triggerVerify = (label) => {
    showToast?.(`Verification ${label} sent`);
  };

  return (
    <div className={shared.formStack}>
      {/* Profile completion */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Profile completion</h3>
        <p className={shared.cardSub}>Complete your profile to unlock all V-ENT features.</p>
        <div className={styles.barWrap}>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className={styles.barPct}>{completion}%</span>
        </div>
      </div>

      {/* Account fields */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Account information</h3>
        <p className={shared.cardSub}>Update your contact details and identity.</p>

        <div className={shared.formGroup}>
          <div className={shared.labelRow}>
            <label className={shared.formLabel} htmlFor="acc-email">Email address</label>
            <span className={`${shared.verifyBadge} ${emailVerified ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
              {emailVerified ? 'Verified' : 'Not verified'}
            </span>
          </div>
          <div className={shared.inputWithAction}>
            <input
              id="acc-email"
              type="email"
              className={shared.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {!emailVerified && (
              <button
                type="button"
                className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`}
                onClick={() => triggerVerify('email')}
              >
                Verify
              </button>
            )}
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`}
              onClick={() => saveField('email', email)}
              disabled={savingField === 'email' || email === (user.email || '')}
            >
              {savingField === 'email' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className={shared.formGroup}>
          <div className={shared.labelRow}>
            <label className={shared.formLabel} htmlFor="acc-phone">Phone number</label>
            <span className={`${shared.verifyBadge} ${phoneVerified ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
              {phoneVerified ? 'Verified' : 'Not verified'}
            </span>
          </div>
          <div className={shared.inputWithAction}>
            <input
              id="acc-phone"
              type="tel"
              className={shared.formInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 …"
            />
            {!phoneVerified && (
              <button
                type="button"
                className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`}
                onClick={() => triggerVerify('SMS code')}
              >
                Verify
              </button>
            )}
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`}
              onClick={() => saveField('phone', phone)}
              disabled={savingField === 'phone' || phone === (user.phone || user.phone_number || '')}
            >
              {savingField === 'phone' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="acc-fullname">Full name</label>
          <div className={shared.inputWithAction}>
            <input
              id="acc-fullname"
              type="text"
              className={shared.formInput}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`}
              onClick={() => saveField('full_name', fullName)}
              disabled={savingField === 'full_name' || fullName === (user.full_name || user.fullname || '')}
            >
              {savingField === 'full_name' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="acc-username">Username</label>
          <div className={shared.inputWithAction}>
            <input
              id="acc-username"
              type="text"
              className={shared.formInput}
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
              placeholder="username"
            />
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`}
              onClick={() => saveField('username', username)}
              disabled={savingField === 'username' || !username || username === (user.username || '')}
            >
              {savingField === 'username' ? 'Saving…' : 'Save'}
            </button>
          </div>
          <span className={shared.fieldHelper}>Letters, numbers, and underscores only.</span>
        </div>
      </div>

      {/* Read-only meta */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Account details</h3>
        <p className={shared.cardSub}>Read-only. Reference these when contacting support.</p>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Member ID</span>
            <span className={styles.metaValue}>{memberId}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Date joined</span>
            <span className={styles.metaValue}>{formatDate(user.date_joined)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>KYC status</span>
            <span className={`${shared.verifyBadge} ${user.kyc_verified ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
              {user.kyc_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Penalty points</span>
            <span className={styles.metaValue}>{user.penalty_point ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPanel;

'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import shared from './settingsShared.module.css';
import styles from './AccountPanel.module.css';
import FounderBadge from '@/components/founder-badge/FounderBadge';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const formatDate = iso => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
};
const computeCompletion = u => {
  if (!u) return 0;
  const checks = [!!u.full_name, !!u.username, !!u.email, !!u.bio || !!u.description, !!u.profile_picture || !!u.profile_pic, !!u.banner || !!u.banner_picture, Array.isArray(u.interests) && u.interests.length > 0, Array.isArray(u.favorite_games) && u.favorite_games.length > 0, !!u.country];
  const done = checks.filter(Boolean).length;
  return Math.round(done / checks.length * 100);
};
const AccountPanel = ({
  user = {},
  onSave,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const token = session?.user?.sessionToken;

  // Member ID, Date joined and KYC status rendered as "-" because nothing
  // served them. /setting/account/ does now.
  const [account, setAccount] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const loadAccount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/setting/account/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) return;
      const body = await res.json();
      setAccount(body?.data?.account || null);
    } catch {
      /* the panel still renders from the profile it was handed */
    }
  }, [apiBase, token]);
  useEffect(() => {
    loadAccount();
  }, [loadAccount]);
  const authed = (path, body) => fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const toggleFounderBadge = async show => {
    setSavingField('founder');
    try {
      const res = await authed('/setting/founder-badge/', {
        show
      });
      const data = await res.json();
      showToast?.(apiMessage(tt, data, "api.saved", "Saved"));
      if (res.ok) await loadAccount();
    } catch {
      showToast?.('Could not change the badge');
    } finally {
      setSavingField(null);
    }
  };
  const saveUsername = async value => {
    setSavingField('username');
    try {
      const res = await authed('/setting/username/', {
        username: value
      });
      const data = await res.json();
      showToast?.(data.message || (res.ok ? 'Username updated' : 'Could not update username'));
      if (res.ok) await loadAccount();
    } catch {
      showToast?.('Could not update username');
    } finally {
      setSavingField(null);
    }
  };
  const startEmailChange = async value => {
    setSavingField('email');
    try {
      const res = await authed('/auth/change-email/', {
        new_email: value
      });
      const data = await res.json();
      if (res.ok) {
        setPendingEmail(value);
        showToast?.(`We sent a six-digit code to ${value}.`);
      } else {
        showToast?.(data.message || data.error || 'Could not send the code');
      }
    } catch {
      showToast?.('Could not send the code');
    } finally {
      setSavingField(null);
    }
  };
  const confirmEmailChange = async () => {
    setSavingField('email-code');
    try {
      const res = await authed('/auth/verify-new-email/', {
        new_email: pendingEmail,
        token: emailCode
      });
      const data = await res.json();
      if (res.ok) {
        setPendingEmail('');
        setEmailCode('');
        showToast?.('Email address updated');
        await loadAccount();
      } else {
        showToast?.(data.message || data.error || 'That code did not match');
      }
    } catch {
      showToast?.('That code did not match');
    } finally {
      setSavingField(null);
    }
  };
  const [email, setEmail] = useState(user.email || '');
  const [fullName, setFullName] = useState(user.full_name || user.fullname || '');
  const [username, setUsername] = useState(user.username || '');
  const [savingField, setSavingField] = useState(null);

  // Re-sync when user prop arrives later.
  useEffect(() => {
    setEmail(user.email || '');
    setFullName(user.full_name || user.fullname || '');
    setUsername(user.username || '');
  }, [user]);
  const completion = useMemo(() => computeCompletion(user), [user]);
  const emailVerified = account?.email_verified ?? (!!user.email_verified || !!user.is_email_verified);
  const memberId = account?.user_id || user.id || user.user_id || '-';
  const saveField = async (field, value) => {
    setSavingField(field);
    try {
      await onSave?.({
        [field]: value
      });
    } finally {
      setSavingField(null);
    }
  };
  return <div className={shared.formStack}>
      {/* Profile completion */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.profile.completion.94e5", "Profile completion")}<InfoTip id="profileCompletion" /></h3>
        <p className={shared.cardSub}>{tt("ui.complete.profile.unlock.all.8d87", "Complete your profile to unlock all V-ENT features.")}</p>
        <div className={styles.barWrap}>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{
            width: `${completion}%`
          }} />
          </div>
          <span className={styles.barPct}>{completion}%</span>
        </div>
      </div>

      {/* Founder badge. Only a founder sees this at all - for anybody else it
          is not a setting, and a control that cannot do anything is noise. */}
      {account?.is_founder && <div className={shared.card}>
          <h3 className={shared.cardTitle}>{tt("ui.founder.badge.637a", "Founder badge")}<InfoTip id="founderBadge" /></h3>
          <p className={shared.cardSub}>
            {tt("ui.founded.v.ent.badge.a891", "You founded V-ENT. The badge shows beside your name across the platform, and you can\n            take it off whenever you like.")}
          </p>
          <div className={styles.founderRow}>
            <FounderBadge size="lg" />
            <button type="button" className={`${shared.btn} ${shared.btnSm} ${account.founder_badge ? shared.ghostBTN : shared.goldBTN}`} onClick={() => toggleFounderBadge(!account.founder_badge)} disabled={savingField === 'founder'}>
              {savingField === 'founder' ? tx("Saving...") : account.founder_badge ? tx("Hide my badge") : tx("Show my badge")}
            </button>
          </div>
        </div>}

      {/* Account fields */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.account.information.944c", "Account information")}</h3>
        <p className={shared.cardSub}>{tt("ui.update.contact.details.identity.7e7f", "Update your contact details and identity.")}</p>

        <div className={shared.formGroup}>
          <div className={shared.labelRow}>
            <label className={shared.formLabel} htmlFor="acc-email"><span className="fieldLabelRow">{tt("ui.email.address.c94d", "Email address")} <InfoTip id="accountEmail" /></span></label>
            <span className={`${shared.verifyBadge} ${emailVerified ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
              {emailVerified ? 'Verified' : tx("Not verified")}
            </span>
          </div>
          <div className={shared.inputWithAction}>
            <input id="acc-email" type="email" className={shared.formInput} value={email} onChange={e => setEmail(e.target.value)} placeholder={tt("ui.example.com.50e2", "you@example.com")} />
            <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={() => startEmailChange(email)} disabled={savingField === 'email' || !email || email === (account?.email || user.email || '')}>
              {savingField === 'email' ? tx("Sending…") : tx("Send code")}
            </button>
          </div>

          {/* Changing an address is not a save, it is a proof. The code goes to
              the new address, so a typo cannot lock anyone out of their own
              account and nobody can move an account onto an address they do not
              read. */}
          {pendingEmail && <div className={shared.inputWithAction}>
              <input type="text" inputMode="numeric" maxLength={6} className={shared.formInput} value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))} placeholder={`Six-digit code sent to ${pendingEmail}`} />
              <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={confirmEmailChange} disabled={savingField === 'email-code' || emailCode.length !== 6}>
                {savingField === 'email-code' ? tx("Checking…") : 'Confirm'}
              </button>
            </div>}
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="acc-fullname"><span className="fieldLabelRow">{tt("ui.full.name.eeb6", "Full name")} <InfoTip id="fullName" /></span></label>
          <div className={shared.inputWithAction}>
            <input id="acc-fullname" type="text" className={shared.formInput} value={fullName} onChange={e => setFullName(e.target.value)} placeholder={tt("ui.full.name.d904", "Your full name")} />
            <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={() => saveField('full_name', fullName)} disabled={savingField === 'full_name' || fullName === (user.full_name || user.fullname || '')}>
              {savingField === 'full_name' ? tx("Saving…") : 'Save'}
            </button>
          </div>
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="acc-username"><span className="fieldLabelRow">{tt("ui.username.84c2", "Username")} <InfoTip id="username" /></span></label>
          <div className={shared.inputWithAction}>
            <input id="acc-username" type="text" className={shared.formInput} value={username} onChange={e => setUsername(e.target.value.replace(/\s+/g, ''))} placeholder={tt("ui.username.249b", "username")} />
            <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={() => saveUsername(username)} disabled={savingField === 'username' || !username || username === (user.username || '')}>
              {savingField === 'username' ? tx("Saving…") : 'Save'}
            </button>
          </div>
          <span className={shared.fieldHelper}>{tt("ui.letters.numbers.underscores.characters.0bcd", "Letters, numbers and underscores, 3 to 20 characters. Case does not create a new name.")}</span>
        </div>
      </div>

      {/* Read-only meta */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.account.details.e68d", "Account details")}</h3>
        <p className={shared.cardSub}>{tt("ui.read.only.reference.these.8c0f", "Read-only. Reference these when contacting support.")}</p>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{tt("ui.member.id.7a88", "Member ID")}</span>
            <span className={styles.metaValue}>{memberId}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{tt("ui.date.joined.478f", "Date joined")}</span>
            <span className={styles.metaValue}>{formatDate(account?.date_joined || user.date_joined)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{tt("ui.kyc.status.9095", "KYC status")}</span>
            {/* KYC is deliberately parked, so it says parked rather than
                sitting on "Pending" while nobody is reviewing anything. */}
            <span className={`${shared.verifyBadge} ${account?.kyc_verified ?? user.kyc_verified ? shared.verifyBadgeOk : shared.verifyBadgeWarn}`}>
              {account?.kyc_verified ?? user.kyc_verified ? 'Verified' : account?.kyc_status === 'parked' ? tx("Parked for now") : tx("Under review")}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{tt("ui.penalty.points.e034", "Penalty points")}</span>
            <span className={styles.metaValue}>{account?.penalty_points ?? user.penalty_point ?? 0}</span>
          </div>
        </div>
      </div>
    </div>;
};
export default AccountPanel;
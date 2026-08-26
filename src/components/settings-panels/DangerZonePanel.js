'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState } from 'react';
import shared from './settingsShared.module.css';
import styles from './DangerZonePanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const DangerZonePanel = ({
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteWord, setDeleteWord] = useState('');
  const [busy, setBusy] = useState(false);
  const canDelete = deletePw.length >= 6 && deleteWord === 'DELETE';
  const doDeactivate = async () => {
    setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      showToast?.('Account deactivated. Sign back in any time to reactivate.');
      setConfirmDeactivate(false);
    } finally {
      setBusy(false);
    }
  };
  const doDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      showToast?.('Account scheduled for deletion in 30 days.');
      setConfirmDelete(false);
      setDeletePw('');
      setDeleteWord('');
    } finally {
      setBusy(false);
    }
  };
  const doDownload = () => {
    // Stub - produce a small JSON blob and trigger download.
    const blob = new Blob([JSON.stringify({
      export_request: 'queued',
      estimate_ready_at: new Date(Date.now() + 86400000).toISOString(),
      note: 'A signed download link will be emailed to your verified address.'
    }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'v-ent-data-request.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast?.('Data export requested');
  };
  return <div className={shared.formStack}>
      {/* Download */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.download.my.data.af53", "Download my data")}</h3>
        <p className={shared.cardSub}>
          {tt("ui.get.copy.profile.tournament.ff46", "Get a copy of your profile, tournament history, wallet activity, and uploaded media. Delivery is via email within 24 hours.")}
        </p>
        <div className={styles.action}>
          <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={doDownload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {tt("ui.request.data.export.8e4c", "Request data export")}
          </button>
        </div>
      </div>

      {/* Deactivate */}
      <div className={`${shared.card} ${shared.cardDanger}`}>
        <h3 className={shared.cardTitle}>{tt("ui.deactivate.account.fd9f", "Deactivate account")}</h3>
        <p className={shared.cardSub}>
          {tt("ui.temporarily.hide.profile.posts.c9a4", "Temporarily hide your profile, posts, and team membership. You can sign back in any time to reactivate.")}
        </p>
        <div className={styles.action}>
          <button type="button" className={`${shared.btn} ${shared.ghostBTN} ${styles.warnBtn}`} onClick={() => setConfirmDeactivate(true)}>
            {tt("ui.deactivate.my.account.4f6e", "Deactivate my account")}
          </button>
        </div>
      </div>

      {/* Delete */}
      <div className={`${shared.card} ${shared.cardDanger}`}>
        <h3 className={shared.cardTitle}>{tt("ui.delete.account.permanently.c705", "Delete account permanently")}</h3>
        <p className={shared.cardSub}>
          {tt("ui.starts.day.grace.period.6c36", "This starts a 30-day grace period. After 30 days, your account, profile, wallet history, and uploaded media will be deleted permanently. You can cancel during the grace period by signing back in.")}
        </p>
        <div className={styles.action}>
          <button type="button" className={`${shared.btn} ${shared.redBTN}`} onClick={() => setConfirmDelete(true)}>
            {tt("ui.delete.my.account.2ae3", "Delete my account")}
          </button>
        </div>
      </div>

      {/* Deactivate confirm */}
      {confirmDeactivate && <div className={shared.modalBackdrop} onClick={() => !busy && setConfirmDeactivate(false)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{tt("ui.deactivate.account.2daf", "Deactivate account?")}</h3>
            <p className={shared.modalSub}>
              {tt("ui.profile.will.hidden.from.f1cc", "Your profile will be hidden from other V-ENT users. Active tournament registrations remain valid. You can reactivate by signing back in.")}
            </p>
            <div className={shared.modalActions}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setConfirmDeactivate(false)} disabled={busy}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={`${shared.btn} ${shared.redBTN}`} onClick={doDeactivate} disabled={busy}>
                {busy ? tx("Deactivating…") : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>}

      {/* Delete confirm */}
      {confirmDelete && <div className={shared.modalBackdrop} onClick={() => !busy && setConfirmDelete(false)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{tt("ui.permanently.delete.account.35d3", "Permanently delete your account?")}</h3>
            <p className={shared.modalSub}>
              {tt("ui.will.lose.access.immediately.f3a8", "You will lose access immediately. The deletion finalises after a 30-day grace period and cannot be undone.")}
            </p>

            <div className={styles.warnBox}>
              <strong>{tt("ui.what.will.deleted.a80c", "What will be deleted:")}</strong>
              <ul>
                <li>{tt("ui.profile.posts.comments.uploads.ab9c", "Your profile, posts, comments, and uploads")}</li>
                <li>{tt("ui.tournament.history.earned.ranks.6ddc", "Tournament history and earned ranks")}</li>
                <li>{tt("ui.wallet.balance.after.grace.e5b6", "Wallet balance (after grace period - withdraw any VC first)")}</li>
                <li>{tt("ui.saved.cards.bank.accounts.2915", "Saved cards and bank accounts")}</li>
              </ul>
            </div>

            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="del-pw">{tt("ui.confirm.password.1417", "Confirm with your password")}<InfoTip id="deleteAccount" /></label>
              <input id="del-pw" type="password" className={shared.formInput} value={deletePw} onChange={e => setDeletePw(e.target.value)} autoComplete="current-password" placeholder={tt("ui.account.password.cbc7", "Your account password")} />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="del-word">
                {tt("ui.type.3deb", "Type")} <code className={styles.kbd}>{tt("ui.delete.d6f5", "DELETE")}</code> {tt("ui.confirm.836e", "to confirm")}
              </label>
              <input id="del-word" type="text" className={shared.formInput} value={deleteWord} onChange={e => setDeleteWord(e.target.value.toUpperCase())} placeholder={tt("ui.delete.d6f5", "DELETE")} />
            </div>

            <div className={shared.modalActions}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setConfirmDelete(false)} disabled={busy}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={`${shared.btn} ${shared.redBTN}`} onClick={doDelete} disabled={!canDelete || busy}>
                {busy ? tx("Deleting…") : tx("Delete account")}
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export default DangerZonePanel;
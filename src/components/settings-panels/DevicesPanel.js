'use client';

import { useState } from 'react';
import shared from './settingsShared.module.css';
import styles from './DevicesPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { formatDate, formatRelative } from '@/lib/datetime';
import { plural } from '@/lib/plural';
// "3 hours ago" in the reader's language (formatRelative), then a date once
// it is a fortnight old. Was built by hand in English, "hour" + "s" (inbox 364).
const formatLastActive = iso => {
  if (!iso) return '-';
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (Number.isNaN(days)) return iso;
  return days < 14 ? formatRelative(iso) : formatDate(iso);
};
const DeviceIcon = ({
  type
}) => {
  if (type === 'mobile') {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>;
  }
  if (type === 'tablet') {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>;
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>;
};
const DevicesPanel = ({
  devices = [],
  onRevoke,
  onRevokeAllOthers,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const [confirm, setConfirm] = useState(null); // { id, name }
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const others = devices.filter(d => !d.is_current);
  const doRevoke = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await onRevoke?.(confirm.id);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  const doRevokeAll = async () => {
    setBusy(true);
    try {
      await onRevokeAllOthers?.();
    } finally {
      setBusy(false);
      setConfirmAll(false);
    }
  };
  return <div className={shared.formStack}>
      <div className={shared.card}>
        <div className={styles.headerRow}>
          <div>
            <h3 className={shared.cardTitle}>{tt("ui.active.sessions.e58e", "Active sessions")}</h3>
            <p className={shared.cardSub}>{tt("ui.devices.currently.signed.into.db10", "Devices currently signed into your V-ENT account.")}</p>
          </div>
          <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`} onClick={() => setConfirmAll(true)} disabled={others.length === 0}>
            {tt("ui.sign.out.all.others.59a4", "Sign out all others")}
          </button>
        </div>

        {devices.length === 0 ? <div className={styles.empty}>{tt("ui.no.active.sessions.found.eceb", "No active sessions found.")}</div> : <div className={styles.devList}>
            {devices.map(d => <div key={d.id} className={`${styles.devItem} ${d.is_current ? styles.devCurrent : ''}`}>
                <div className={styles.devIcon}>
                  <DeviceIcon type={d.type} />
                </div>
                <div className={styles.devMeta}>
                  <div className={styles.devNameRow}>
                    <span className={styles.devName}>{d.name}</span>
                    {d.is_current && <span className={`${shared.verifyBadge} ${shared.verifyBadgeOk}`}>{tt("ui.device.fa5a", "This device")}</span>}
                  </div>
                  <div className={styles.devSub}>
                    <span>{d.browser}</span>
                    <span className={styles.dotSep}>•</span>
                    <span>{d.os}</span>
                    <span className={styles.dotSep}>•</span>
                    <span>{d.ip}</span>
                  </div>
                  <div className={styles.devTime}>{tt("ui.last.active.b566", "Last active")} {formatLastActive(d.last_active)}</div>
                </div>
                <div className={styles.devActions}>
                  {!d.is_current && <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN} ${styles.signOutBtn}`} onClick={() => setConfirm({
              id: d.id,
              name: d.name
            })}>
                      {tt("ui.sign.out.dc16", "Sign out")}
                    </button>}
                </div>
              </div>)}
          </div>}
      </div>

      {/* Single revoke confirm */}
      {confirm && <div className={shared.modalBackdrop} onClick={() => !busy && setConfirm(null)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{tt("ui.sign.out.device.6309", "Sign out this device?")}</h3>
            <p className={shared.modalSub}>
              <strong>{confirm.name}</strong> {tt("ui.will.be.signed.out.7e56", "will be signed out immediately. You can sign back in any time with your password.")}
            </p>
            <div className={shared.modalActions}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setConfirm(null)} disabled={busy}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={`${shared.btn} ${shared.redBTN}`} onClick={doRevoke} disabled={busy}>
                {busy ? tx("Signing out…") : tx("Sign out")}
              </button>
            </div>
          </div>
        </div>}

      {/* All-others confirm */}
      {confirmAll && <div className={shared.modalBackdrop} onClick={() => !busy && setConfirmAll(false)}>
          <div className={shared.modal} onClick={e => e.stopPropagation()}>
            <h3 className={shared.modalTitle}>{tt("ui.sign.out.all.other.7094", "Sign out all other devices?")}</h3>
            <p className={shared.modalSub}>
              {plural(tt, others.length, 'count.otherSessionOne', '{n} other session', 'count.otherSession', '{n} other sessions')} {tt("ui.will.be.signed.out.60ca", "will be signed out. Your current session stays signed in.")}
            </p>
            <div className={shared.modalActions}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setConfirmAll(false)} disabled={busy}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="button" className={`${shared.btn} ${shared.redBTN}`} onClick={doRevokeAll} disabled={busy}>
                {busy ? tx("Signing out…") : tx("Sign out all others")}
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export default DevicesPanel;
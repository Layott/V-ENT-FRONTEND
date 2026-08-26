'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState } from 'react';
import shared from './editProfileShared.module.css';
import styles from './GamingAccountsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Two platforms, because these are the two that can be confirmed. The other six
// that used to be listed - PSN, Xbox Live, Riot, EA, Epic, Activision - have no
// public way for a site to check that a handle belongs to the person typing it,
// so a row for them was a text box that proved nothing.
const PLATFORMS = [{
  id: 'discord',
  name: 'Discord',
  color: '#5865F2',
  initials: 'DC'
}, {
  id: 'steam',
  name: 'Steam',
  color: '#1b2838',
  initials: 'ST'
}];
const GamingAccountsPanel = ({
  initialAccounts = {},
  onSave,
  onCancel,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const [accounts, setAccounts] = useState(() => {
    const seed = {};
    PLATFORMS.forEach(p => {
      // The API speaks snake_case; this component was written in camelCase and
      // read a key the server never sends, so a saved handle came back blank.
      const fromInit = initialAccounts[p.id] || {};
      seed[p.id] = {
        displayName: fromInit.displayName || fromInit.display_name || '',
        gamertag: fromInit.gamertag || '',
        connected: !!fromInit.connected,
        verified: !!fromInit.verified
      };
    });
    return seed;
  });
  const [saving, setSaving] = useState(false);
  const updateField = (platformId, field, value) => {
    setAccounts(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.({
        accounts
      });
      showToast?.('Gaming accounts saved');
    } finally {
      setSaving(false);
    }
  };
  return <form className={shared.formStack} onSubmit={handleSubmit}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.gaming.accounts.d1e0", "Gaming Accounts")}<InfoTip id="gamingAccounts" /></h3>
        <div className={styles.list}>
          {PLATFORMS.map(p => {
          const acc = accounts[p.id];
          return <div className={styles.row} key={p.id}>
                <div className={styles.platformBlock}>
                  <div className={styles.platformIcon} style={{
                backgroundColor: p.color
              }}>
                    {p.initials}
                  </div>
                  <span className={styles.platformName}>{p.name}</span>
                </div>
                <div className={styles.fieldBlock}>
                  <label className={styles.fieldLabel}>{tt("ui.display.name.8d6b", "Display Name")}</label>
                  <input type="text" className={styles.fieldInput} placeholder={`${p.name} display name`} value={acc.displayName} onChange={e => updateField(p.id, 'displayName', e.target.value)} />
                </div>
                <div className={styles.fieldBlock}>
                  <label className={styles.fieldLabel}>{tt("ui.gamertag.6fd5", "Gamertag")}</label>
                  <input type="text" className={styles.fieldInput} placeholder={`${p.name} ID / tag`} value={acc.gamertag} onChange={e => updateField(p.id, 'gamertag', e.target.value)} />
                </div>
                <div className={styles.toggleWrap}>
                  <span className={`${styles.toggleLabel} ${acc.connected ? styles.toggleLabelActive : ''}`}>
                    {acc.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <button type="button" className={`${styles.toggle} ${acc.connected ? styles.toggleOn : ''}`} onClick={() => updateField(p.id, 'connected', !acc.connected)} aria-label={`Toggle ${p.name}`}>
                    <span className={styles.toggleHandle} />
                  </button>
                </div>
              </div>;
        })}
        </div>
      </div>

      <div className={shared.formFooter}>
        <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
        <button type="submit" className={`${shared.btn} ${shared.redBTN}`} disabled={saving}>
          {saving ? tx("Saving…") : tx("Save changes")}
        </button>
      </div>
    </form>;
};
export default GamingAccountsPanel;
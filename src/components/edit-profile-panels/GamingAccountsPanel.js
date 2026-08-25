'use client';

import { useState } from 'react';
import shared from './editProfileShared.module.css';
import styles from './GamingAccountsPanel.module.css';

const PLATFORMS = [
  { id: 'psn', name: 'PSN', color: '#0070D1', initials: 'PS' },
  { id: 'xbl', name: 'Xbox Live', color: '#107C10', initials: 'XB' },
  { id: 'steam', name: 'Steam', color: '#171a21', initials: 'ST' },
  { id: 'riot', name: 'Riot ID', color: '#D32E29', initials: 'RT' },
  { id: 'ea', name: 'EA ID', color: '#FF4747', initials: 'EA' },
  { id: 'epic', name: 'Epic Games', color: '#2A2A2A', initials: 'EP' },
  { id: 'activision', name: 'Activision', color: '#000', initials: 'AC' },
  { id: 'discord', name: 'Discord', color: '#5865F2', initials: 'DC' },
];

const GamingAccountsPanel = ({ initialAccounts = {}, onSave, onCancel, showToast }) => {
  const [accounts, setAccounts] = useState(() => {
    const seed = {};
    PLATFORMS.forEach((p) => {
      // The API speaks snake_case; this component was written in camelCase and
      // read a key the server never sends, so a saved handle came back blank.
      const fromInit = initialAccounts[p.id] || {};
      seed[p.id] = {
        displayName: fromInit.displayName || fromInit.display_name || '',
        gamertag: fromInit.gamertag || '',
        connected: !!fromInit.connected,
        verified: !!fromInit.verified,
      };
    });
    return seed;
  });
  const [saving, setSaving] = useState(false);

  const updateField = (platformId, field, value) => {
    setAccounts((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.({ accounts });
      showToast?.('Gaming accounts saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={shared.formStack} onSubmit={handleSubmit}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Gaming Accounts</h3>
        <div className={styles.list}>
          {PLATFORMS.map((p) => {
            const acc = accounts[p.id];
            return (
              <div className={styles.row} key={p.id}>
                <div className={styles.platformBlock}>
                  <div className={styles.platformIcon} style={{ backgroundColor: p.color }}>
                    {p.initials}
                  </div>
                  <span className={styles.platformName}>{p.name}</span>
                </div>
                <div className={styles.fieldBlock}>
                  <label className={styles.fieldLabel}>Display Name</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder={`${p.name} display name`}
                    value={acc.displayName}
                    onChange={(e) => updateField(p.id, 'displayName', e.target.value)}
                  />
                </div>
                <div className={styles.fieldBlock}>
                  <label className={styles.fieldLabel}>Gamertag</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder={`${p.name} ID / tag`}
                    value={acc.gamertag}
                    onChange={(e) => updateField(p.id, 'gamertag', e.target.value)}
                  />
                </div>
                <div className={styles.toggleWrap}>
                  <span className={`${styles.toggleLabel} ${acc.connected ? styles.toggleLabelActive : ''}`}>
                    {acc.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${acc.connected ? styles.toggleOn : ''}`}
                    onClick={() => updateField(p.id, 'connected', !acc.connected)}
                    aria-label={`Toggle ${p.name}`}
                  >
                    <span className={styles.toggleHandle} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={shared.formFooter}>
        <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={onCancel}>Cancel</button>
        <button type="submit" className={`${shared.btn} ${shared.redBTN}`} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default GamingAccountsPanel;

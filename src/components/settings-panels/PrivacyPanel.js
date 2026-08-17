'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import shared from './settingsShared.module.css';
import styles from './PrivacyPanel.module.css';

const VIS_OPTIONS = [
  { v: 'public', label: 'Public', sub: 'Anyone on V-ENT can view your profile.' },
  { v: 'followers', label: 'Followers only', sub: 'Only your followers can view your full profile.' },
  { v: 'private', label: 'Private', sub: 'Only you can view your profile. You won’t appear in search.' },
];

const DM_OPTIONS = [
  { v: 'anyone', label: 'Anyone' },
  { v: 'followers', label: 'Followers' },
  { v: 'nobody', label: 'Nobody' },
];

const PrivacyPanel = ({ privacy = {}, onSave, showToast }) => {
  const [state, setState] = useState({
    profile_visibility: privacy.profile_visibility || 'public',
    show_email: !!privacy.show_email,
    show_location: privacy.show_location !== false,
    show_birthday: !!privacy.show_birthday,
    allow_dm_from: privacy.allow_dm_from || 'followers',
    search_indexable: privacy.search_indexable !== false,
  });

  useEffect(() => {
    setState({
      profile_visibility: privacy.profile_visibility || 'public',
      show_email: !!privacy.show_email,
      show_location: privacy.show_location !== false,
      show_birthday: !!privacy.show_birthday,
      allow_dm_from: privacy.allow_dm_from || 'followers',
      search_indexable: privacy.search_indexable !== false,
    });
  }, [privacy]);

  const persist = async (next) => {
    setState(next);
    await onSave?.(next);
  };

  const setVisibility = (v) => persist({ ...state, profile_visibility: v });
  const setDm = (v) => persist({ ...state, allow_dm_from: v });
  const toggle = (key) => persist({ ...state, [key]: !state[key] });

  return (
    <div className={shared.formStack}>
      {/* Visibility */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Profile visibility</h3>
        <p className={shared.cardSub}>Control who can view your profile across V-ENT.</p>

        <div className={styles.radioGroup}>
          {VIS_OPTIONS.map((opt) => {
            const active = state.profile_visibility === opt.v;
            return (
              <label key={opt.v} className={`${styles.radioCard} ${active ? styles.radioCardActive : ''}`}>
                <input
                  type="radio"
                  name="profile-visibility"
                  value={opt.v}
                  checked={active}
                  onChange={() => setVisibility(opt.v)}
                />
                <span className={styles.radioDot} aria-hidden />
                <div className={styles.radioBody}>
                  <span className={styles.radioLabel}>{opt.label}</span>
                  <span className={styles.radioSub}>{opt.sub}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Field-level visibility */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Profile fields</h3>
        <p className={shared.cardSub}>Choose which details show on your public profile.</p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>Show email address</span>
            <span className={shared.toggleRowSub}>Visible to anyone who can view your profile.</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.show_email} onChange={() => toggle('show_email')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>Show location</span>
            <span className={shared.toggleRowSub}>City and country.</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.show_location} onChange={() => toggle('show_location')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>Show birthday</span>
            <span className={shared.toggleRowSub}>Day and month only - never the year.</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.show_birthday} onChange={() => toggle('show_birthday')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>
      </div>

      {/* Direct messages */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Direct messages</h3>
        <p className={shared.cardSub}>Decide who can reach you directly.</p>

        <div className={styles.dmRow}>
          {DM_OPTIONS.map((opt) => {
            const active = state.allow_dm_from === opt.v;
            return (
              <button
                type="button"
                key={opt.v}
                className={`${styles.dmChip} ${active ? styles.dmChipActive : ''}`}
                onClick={() => setDm(opt.v)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discovery */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Discovery</h3>
        <p className={shared.cardSub}>Whether your profile appears in V-ENT search and external search engines.</p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>Indexable in search</span>
            <span className={shared.toggleRowSub}>If off, your profile is excluded from search results.</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.search_indexable} onChange={() => toggle('search_indexable')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>

        <div className={styles.blockLink}>
          <div>
            <span className={shared.toggleRowTitle}>Blocked users</span>
            <p className={shared.toggleRowSub}>Manage the list of users you have blocked.</p>
          </div>
          <Link
            href="/settings?panel=privacy"
            className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`}
            onClick={(e) => {
              e.preventDefault();
              showToast?.('Block list coming soon');
            }}
          >
            Manage block list
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPanel;

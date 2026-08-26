'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import shared from './settingsShared.module.css';
import styles from './PrivacyPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const VIS_OPTIONS = [{
  v: 'public',
  label: 'Public',
  sub: 'Anyone on V-ENT can view your profile.'
}, {
  v: 'followers',
  label: 'Followers only',
  sub: 'Only your followers can view your full profile.'
}, {
  v: 'private',
  label: 'Private',
  sub: 'Only you can view your profile. You won’t appear in search.'
}];
const DM_OPTIONS = [{
  v: 'anyone',
  label: 'Anyone'
}, {
  v: 'followers',
  label: 'Followers'
}, {
  v: 'nobody',
  label: 'Nobody'
}];
const PrivacyPanel = ({
  privacy = {},
  onSave,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const [state, setState] = useState({
    profile_visibility: privacy.profile_visibility || 'public',
    show_email: !!privacy.show_email,
    show_location: privacy.show_location !== false,
    show_birthday: !!privacy.show_birthday,
    allow_dm_from: privacy.allow_dm_from || 'followers',
    search_indexable: privacy.search_indexable !== false
  });
  useEffect(() => {
    setState({
      profile_visibility: privacy.profile_visibility || 'public',
      show_email: !!privacy.show_email,
      show_location: privacy.show_location !== false,
      show_birthday: !!privacy.show_birthday,
      allow_dm_from: privacy.allow_dm_from || 'followers',
      search_indexable: privacy.search_indexable !== false
    });
  }, [privacy]);
  const persist = async next => {
    setState(next);
    await onSave?.(next);
  };
  const setVisibility = v => persist({
    ...state,
    profile_visibility: v
  });
  const setDm = v => persist({
    ...state,
    allow_dm_from: v
  });
  const toggle = key => persist({
    ...state,
    [key]: !state[key]
  });
  return <div className={shared.formStack}>
      {/* Visibility */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.profile.visibility.e717", "Profile visibility")}<InfoTip id="profileVisibility" /></h3>
        <p className={shared.cardSub}>{tt("ui.control.who.can.view.3509", "Control who can view your profile across V-ENT.")}</p>

        <div className={styles.radioGroup}>
          {VIS_OPTIONS.map(opt => {
          const active = state.profile_visibility === opt.v;
          return <label key={opt.v} className={`${styles.radioCard} ${active ? styles.radioCardActive : ''}`}>
                <input type="radio" name="profile-visibility" value={opt.v} checked={active} onChange={() => setVisibility(opt.v)} />
                <span className={styles.radioDot} aria-hidden />
                <div className={styles.radioBody}>
                  <span className={styles.radioLabel}>{tx(opt.label)}</span>
                  <span className={styles.radioSub}>{tx(opt.sub)}</span>
                </div>
              </label>;
        })}
        </div>
      </div>

      {/* Field-level visibility */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.profile.fields.0b59", "Profile fields")}<InfoTip id="profileFields" /></h3>
        <p className={shared.cardSub}>{tt("ui.choose.which.details.show.3153", "Choose which details show on your public profile.")}</p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>{tt("ui.show.email.address.cf5e", "Show email address")}</span>
            <span className={shared.toggleRowSub}>{tt("ui.visible.anyone.who.can.816a", "Visible to anyone who can view your profile.")}</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.show_email} onChange={() => toggle('show_email')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>{tt("ui.show.location.80ec", "Show location")}</span>
            <span className={shared.toggleRowSub}>{tt("ui.city.country.26e2", "City and country.")}</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.show_location} onChange={() => toggle('show_location')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>{tt("ui.show.birthday.d269", "Show birthday")}</span>
            <span className={shared.toggleRowSub}>{tt("ui.day.month.only.never.8bd0", "Day and month only - never the year.")}</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.show_birthday} onChange={() => toggle('show_birthday')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>
      </div>

      {/* Direct messages */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.direct.messages.e759", "Direct messages")}<InfoTip id="directMessages" /></h3>
        <p className={shared.cardSub}>{tt("ui.decide.who.can.reach.a6e2", "Decide who can reach you directly.")}</p>

        <div className={styles.dmRow}>
          {DM_OPTIONS.map(opt => {
          const active = state.allow_dm_from === opt.v;
          return <button type="button" key={opt.v} className={`${styles.dmChip} ${active ? styles.dmChipActive : ''}`} onClick={() => setDm(opt.v)}>
                {tx(opt.label)}
              </button>;
        })}
        </div>
      </div>

      {/* Discovery */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.discovery.3b32", "Discovery")}<InfoTip id="discovery" /></h3>
        <p className={shared.cardSub}>{tt("ui.whether.profile.appears.v.aced", "Whether your profile appears in V-ENT search and external search engines.")}</p>

        <div className={shared.toggleRow}>
          <div className={shared.toggleRowLabel}>
            <span className={shared.toggleRowTitle}>{tt("ui.indexable.search.7ff9", "Indexable in search")}</span>
            <span className={shared.toggleRowSub}>{tt("ui.if.off.profile.excluded.bfe7", "If off, your profile is excluded from search results.")}</span>
          </div>
          <label className={shared.toggle}>
            <input type="checkbox" checked={state.search_indexable} onChange={() => toggle('search_indexable')} />
            <span className={shared.toggleSlider} />
          </label>
        </div>

        <div className={styles.blockLink}>
          <div>
            <span className={shared.toggleRowTitle}>{tt("ui.blocked.users.80a6", "Blocked users")}</span>
            <p className={shared.toggleRowSub}>{tt("ui.manage.list.users.have.2c72", "Manage the list of users you have blocked.")}</p>
          </div>
          <Link href="/settings?panel=privacy" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN}`} onClick={e => {
          e.preventDefault();
          showToast?.('Block list coming soon');
        }}>
            {tt("ui.manage.block.list.ea2a", "Manage block list")}
          </Link>
        </div>
      </div>
    </div>;
};
export default PrivacyPanel;
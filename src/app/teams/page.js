'use client';

import { Suspense } from 'react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import AllTeams from '@/components/teams/all-teams/AllTeams';
import styles from './teams.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Static, URL-driven shell - used as the Suspense fallback so the page heading
// and tab row render immediately, before AllTeams reads `useSearchParams`.
const TABS = [{
  id: 'all',
  label: 'All'
}, {
  id: 'owned',
  label: 'Owned by me'
}, {
  id: 'joined',
  label: 'Joined'
}, {
  id: 'invited',
  label: 'Invited'
}];
const TeamsShellFallback = () => {
  const tx = useTx();
  const tt = useT();
  return <div style={{
    padding: '1.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <h1 style={{
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#fff',
      margin: 0
    }}>{tt("ui.teams.cbfd", "Teams")}</h1>
    <p style={{
      color: 'rgba(255,255,255,0.5)',
      margin: 0
    }}>{tt("ui.browse.join.manage.competitive.1fc5", "Browse, join and manage competitive squads.")}</p>
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      paddingBottom: '0.4rem'
    }}>
      {TABS.map(t => <span key={t.id} style={{
        padding: '0.5rem 0.9rem',
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.5)',
        borderRadius: '4px'
      }}>
          {tx(t.label)}
        </span>)}
    </div>
    <p style={{
      color: 'rgba(255,255,255,0.4)',
      fontSize: '0.85rem'
    }}>{tt("ui.loading.teams.2064", "Loading teams…")}</p>
  </div>;
};
const Teams = () => {
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Suspense fallback={<TeamsShellFallback />}>
            <AllTeams />
          </Suspense>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default Teams;
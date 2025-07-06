'use client'

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import CreateTournamentComponent from '@/components/create-tournament-component/CreateTournamentComponent';
import styles from './drafts.module.css';

const Drafts = () => {
  return (
    <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />

        <main className={styles.mainContainer}>
          <Sidebar />
          <CreateTournamentComponent />

        </main>
        
        <BottomMenu />

    </div>
  )
}

export default Drafts
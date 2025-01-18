'use client'

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import CreateTournamentComponent from '@/components/create-tournament-component/CreateTournamentComponent';
import styles from './create-event.module.css';

const EventCreation = () => {
  return (
    <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />

        <main className={styles.mainContainer}>
          <Sidebar />
          <CreateTournamentComponent />

        </main>
    </div>
  )
}

export default EventCreation
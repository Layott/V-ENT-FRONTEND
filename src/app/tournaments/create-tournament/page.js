'use client'

import Header from '@/components/header/Header';
import Sidebar from '@/components/sidebar/Sidebar';
// import MobileSidebar from '@/components/mobile-sidebar/MobileSidebar';
import CreateTournamentComponent from '@/components/create-tournament-component/CreateTournamentComponent';
import styles from './create-tournament.module.css';

const TournamentCreation = () => {
  return (
    <div className={styles.pageContainer}>
        <Header />

        <main className={styles.mainContainer}>
          <Sidebar />
          {/* <MobileSidebar /> */}
          <CreateTournamentComponent />

        </main>
    </div>
  )
}

export default TournamentCreation
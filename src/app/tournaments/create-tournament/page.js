'use client'

import Header from '@/components/header/Header';
import Sidebar from '@/components/sidebar/Sidebar';
import CreateTournamentComponent from '@/components/create-tournament-component/CreateTournamentComponent';
import styles from './create-tournament.module.css';

const TournamentCreation = () => {
  return (
    <div className={styles.pageContainer}>
        <Header />

        <main className={styles.mainContainer}>
          <Sidebar />
          <CreateTournamentComponent />

        </main>
    </div>
  )
}

export default TournamentCreation
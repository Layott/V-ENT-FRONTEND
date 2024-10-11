'use client'

import Header from '@/components/header/Header';
import Sidebar from '@/components/sidebar/Sidebar';
import TournamentsComponent from '@/components/tournaments/TournamentsComponent';
import styles from './tournament.module.css'

const Tournaments = () => {

  return (
    <div className={styles.pageContainer}>
      <Header />
      
      <main className={styles.mainContainer}>
        <Sidebar />
        <TournamentsComponent />
        
      </main>

    </div>
  )
}

export default Tournaments
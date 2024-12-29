'use client'

import Header from '@/components/header/Header';
import Sidebar from '@/components/sidebar/Sidebar';
// import MobileSidebar from '@/components/mobile-sidebar/MobileSidebar';
import TournamentsComponent from '@/components/tournaments/TournamentsComponent';
import styles from './tournament.module.css'

const Tournaments = () => {

  return (
    <div className={styles.pageContainer}>
      <Header />
      
      <main className={styles.mainContainer}>
        <Sidebar />
        {/* <MobileSidebar /> */}

        <TournamentsComponent />
      </main>
    </div>
  )
}

export default Tournaments
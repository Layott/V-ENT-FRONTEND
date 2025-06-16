'use client'

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import TournamentsComponent from '@/components/tournaments/TournamentsComponent';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './tournament.module.css'

const Tournaments = () => {

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />

        <TournamentsComponent />
      </main>

      <BottomMenu />
      
    </div>
  )
}

export default Tournaments;
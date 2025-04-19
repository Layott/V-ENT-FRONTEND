'use client'

import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar'
import BottomMenu from '@/components/bottom-menu/BottomMenu'
import AllTeams from '@/components/teams/all-teams/AllTeams'
import styles from './teams.module.css'

const Teams = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
            <Sidebar />

            <div className={styles.rightPaneContainer}>
              <AllTeams />
            </div>
        </main>

      <BottomMenu />
      
    </div>
  )
}

export default Teams
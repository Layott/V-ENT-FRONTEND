'use client'

import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar'
import BottomMenu from '@/components/bottom-menu/BottomMenu'
import styles from './ranking.module.css'

const Rankings = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.header}>
            <h3>Rankings Page</h3>

            <div className={styles.searchFilterContainer}>
                Filter and Search
            </div>
          </div>

        </div>

      </main>

      <BottomMenu />
      
    </div>
  )
}

export default Rankings
'use client'

import { Suspense } from 'react'
import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader'
import Sidebar from '@/components/sidebar/Sidebar'
import BottomMenu from '@/components/bottom-menu/BottomMenu'
import RankingsView from './RankingsView'
import styles from './ranking.module.css'

const Rankings = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Suspense fallback={<p className={styles.loadingText}>Loading rankings…</p>}>
            <RankingsView />
          </Suspense>
        </div>
      </main>

      <BottomMenu />
    </div>
  )
}

export default Rankings

'use client'

import Header from '@/components/header/Header'
import Sidebar from '@/components/sidebar/Sidebar'
import AllTeams from '@/components/teams/all-teams/AllTeams'
import styles from './teams.module.css'

const Teams = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContainer}>
            <Sidebar />

            <div className={styles.rightPaneContainer}>
              <AllTeams />
            </div>
        </main>

    </div>
  )
}

export default Teams
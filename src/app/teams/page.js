'use client'

import Header from '@/components/header/Header'
import Sidebar from '@/components/sidebar/Sidebar'
import styles from './teams.module.css'

const Teams = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContainer}>
            <Sidebar />

            <div className={styles.rightPaneContainer}>
                <div className={styles.header}>
                    <h3>Team Page</h3>

                    <div className={styles.searchFilterContainer}>
                        Filter and Search
                    </div>
                </div>

            </div>
        </main>

    </div>
  )
}

export default Teams
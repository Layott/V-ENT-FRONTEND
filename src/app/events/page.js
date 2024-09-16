'use client'

import ProfileHeader from '@/components/profile/profile-header/ProfileHeader'
import Sidebar from '@/components/sidebar/Sidebar'
import styles from './events.module.css'

const Events = () => {
  return (
    <div className={styles.pageContainer}>
        <ProfileHeader />

        <main className={styles.mainContainer}>
            <Sidebar />

            <div className={styles.rightPaneContainer}>
                <div className={styles.header}>
                    <h3>Featured</h3>

                    <div className={styles.searchFilterContainer}>
                        Filter and Search
                    </div>
                </div>

            </div>
        </main>
        
    </div>
  )
}

export default Events
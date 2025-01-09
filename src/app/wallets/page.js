'use client'

import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar'
import styles from './wallets.module.css'

const Wallets = () => {
  return (
    <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />

        <main className={styles.mainContainer}>
            <Sidebar />

            <div className={styles.rightPaneContainer}>
                <div className={styles.header}>
                    <h3>Wallets</h3>

                    <div className={styles.searchFilterContainer}>
                        Filter and Search
                    </div>
                </div>

            </div>
        </main>
        
    </div>
  )
}

export default Wallets
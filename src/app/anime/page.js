'use client'

import Header from "@/components/header/Header"
import Sidebar from "@/components/sidebar/Sidebar"
import styles from './anime.module.css'

const Anime = () => {
    return (
      <div className={styles.pageContainer}>
        <Header />
  
        <main className={styles.mainContainer}>
              <Sidebar />
  
              <div className={styles.rightPaneContainer}>
                  <div className={styles.header}>
                      <h3>Anime Page</h3>
  
                      <div className={styles.searchFilterContainer}>
                          Filter and Search
                      </div>
                  </div>
  
              </div>
          </main>
  
      </div>
    )
  }
  
  export default Anime
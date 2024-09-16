'use client'

// import { useState } from 'react';
import Header from '@/components/header/Header';
import Sidebar from '@/components/sidebar/Sidebar';
import TournamentsComponent from '@/components/tournaments/TournamentsComponent';
import styles from './tournament.module.css'

const Tournaments = () => {
//   const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <Header />
      
      <main className={styles.mainContainer}>
        <Sidebar />
        <TournamentsComponent />
        
      </main>

    </div>
  )
}

export default Tournaments
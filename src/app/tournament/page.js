'use client'

// import { useState } from 'react';
import ProfileHeader from '@/components/profile/profile-header/ProfileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import Tournaments from '@/components/tournaments/Tournaments';
import styles from './tournament.module.css'

const Tournament = () => {
//   const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <ProfileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
        <Tournaments />
        
      </main>

    </div>
  )
}

export default Tournament